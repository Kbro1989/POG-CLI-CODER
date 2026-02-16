/**
 * Vector Database - Local storage for lessons and embeddings
 * 
 * Responsibilities:
 * - Persist lessons and errors for long-term learning
 * - Provide vector search using cosine similarity (JS-side)
 * - Manage database schema
 */

import sqlite3 from 'sqlite3';
import pino from 'pino';
import type { Result, VibeConfig, Lesson } from '../core/models.js';
import { getLearningDbPath } from '../utils/SovereignPathResolver.js';

const logger = pino({
  name: 'VectorDB',
  base: { hostname: 'POG-VIBE' }
});

export class VectorDB {
  private db?: sqlite3.Database;
  private readonly dbPath: string;

  constructor(_config: VibeConfig) {
    // Use SovereignPathResolver for ternary-aware path resolution
    // Priority: D:\pog-coder-vibe\vibe-learning.db (Sovereign) → ~/.pog-coder-vibe/vibe-learning.db (Home) → .pog/vibe-learning.db (ProjectLocal)
    this.dbPath = getLearningDbPath();
  }

  async initialize(): Promise<Result<void>> {
    try {
      logger.info({ dbPath: this.dbPath }, 'Initializing VectorDB');

      return new Promise((resolve) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            logger.error({ err }, 'Failed to open database');
            resolve({ ok: false, error: err });
            return;
          }

          this.createTables()
            .then(() => this.ensureSchema())
            .then(() => resolve({ ok: true, value: undefined }))
            .catch((tableErr: Error) => {
              logger.error({ tableErr }, 'Database table creation or migration failed');
              resolve({ ok: false, error: tableErr });
            });
        });
      });
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  async indexModelRegistry(_registry: Record<string, unknown>): Promise<Result<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      this.db.serialize(() => {
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS gutenberg_chunks (
            id TEXT PRIMARY KEY,
            book_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding BLOB NOT NULL,
            metadata TEXT
          )
        `);

        // Index on book_id for faster filtering
        this.db!.run('CREATE INDEX IF NOT EXISTS idx_gutenberg_book_id ON gutenberg_chunks(book_id)');

        const stmt = this.db!.prepare(`
          INSERT OR REPLACE INTO model_capabilities (id, name, description, capabilities, embedding)
          VALUES (?, ?, ?, ?, ?)
        `);

        try {
          this.db!.run('BEGIN TRANSACTION');

          for (const [id, modelVal] of Object.entries(_registry)) {
            const model = modelVal as Record<string, unknown>;
            // Safe fallback for optional fields
            const name = (model['name'] as string) || id;
            const desc = (model['description'] as string) || '';
            const caps = JSON.stringify((model['capabilities'] as string[]) || []);
            const embed = model['embedding'] ? Buffer.from(model['embedding'] as Uint8Array | number[]) : null;

            stmt.run(id, name, desc, caps, embed);
          }

          this.db!.run('COMMIT', (err) => {
            stmt.finalize();
            if (err) resolve({ ok: false, error: err });
            else resolve({ ok: true, value: undefined });
          });
        } catch (err) {
          this.db!.run('ROLLBACK');
          stmt.finalize();
          resolve({ ok: false, error: err as Error });
        }
      });
    });
  }

  /**
   * Store literary chunks with vector embeddings.
   */
  async storeGutenbergChunks(chunks: Array<{
    id: string;
    bookId: number;
    chunkIndex: number;
    content: string;
    embedding: Float32Array;
    metadata?: Record<string, unknown>;
  }>): Promise<Result<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO gutenberg_chunks (id, book_id, chunk_index, content, embedding, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      this.db.serialize(() => {
        try {
          this.db!.run('BEGIN TRANSACTION');

          for (const chunk of chunks) {
            stmt.run(
              chunk.id,
              chunk.bookId,
              chunk.chunkIndex,
              chunk.content,
              Buffer.from(chunk.embedding.buffer),
              JSON.stringify(chunk.metadata || {})
            );
          }

          this.db!.run('COMMIT', (err) => {
            stmt.finalize();
            if (err) resolve({ ok: false, error: err });
            else resolve({ ok: true, value: undefined });
          });
        } catch (err) {
          this.db!.run('ROLLBACK');
          stmt.finalize();
          resolve({ ok: false, error: err as Error });
        }
      });
    });
  }

  /**
   * Semantic search for literary context using cosine similarity.
   * NOTE: SQLite doesn't have native vector search, so we fetch all and compute in JS.
   * For production scaling, use pgvector/vector extension. For <1GB text, this is fine.
   */
  async searchGutenberg(embedding: Float32Array, limit: number = 5): Promise<Result<Array<{
    content: string;
    bookId: number;
    score: number;
    metadata: Record<string, unknown>;
  }>>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      // Memory-efficient: Stream rows instead of loading all at once if possible,
      // but for <100k chunks, loading into memory is faster than iterated I/O.
      this.db.all('SELECT * FROM gutenberg_chunks', (err, rows: Array<Record<string, unknown>>) => {
        if (err) {
          resolve({ ok: false, error: err });
          return;
        }

        const results = rows.map(row => {
          const embeddingBuffer = row['embedding'] as Buffer;
          const storedEmbedding = new Float32Array(
            embeddingBuffer.buffer,
            embeddingBuffer.byteOffset,
            embeddingBuffer.byteLength / 4
          );

          return {
            content: row['content'] as string,
            bookId: row['book_id'] as number,
            score: this.cosineSimilarity(embedding, storedEmbedding),
            metadata: JSON.parse((row['metadata'] as string) || '{}') as Record<string, unknown>
          };
        });

        // Sort by score descending and take top N
        results.sort((a, b) => b.score - a.score);
        resolve({ ok: true, value: results.slice(0, limit) });
      });
    });
  }

  async findBestModel(queryEmbedding: Float32Array): Promise<Result<string[]>> {
    return new Promise((resolve) => {
      if (!this.db) return resolve({ ok: false, error: new Error('DB not init') });

      this.db.all('SELECT * FROM model_capabilities', [], (err, rows: Array<Record<string, unknown>>) => {
        if (err) return resolve({ ok: false, error: err });

        // Simple cosine similarity scan
        const scored = rows.map(r => {
          const embeddingBuffer = r['embedding'] as Buffer;
          const embedding = new Float32Array(embeddingBuffer.buffer);
          return {
            id: r['id'] as string,
            score: this.cosineSimilarity(queryEmbedding, embedding)
          };
        });

        scored.sort((a, b) => b.score - a.score);
        resolve({ ok: true, value: scored.slice(0, 3).map(s => s.id) });
      });
    });
  }

  private async ensureSchema(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      this.db!.all("PRAGMA table_info(lessons)", async (err, _rows: Array<Record<string, unknown>>) => {
        if (err) {
          logger.error({ err }, 'Failed to check schema');
          resolve();
          return;
        }

        const columns = _rows.map(r => r['name'] as string);
        const migrations: string[] = [];

        if (!columns.includes('projectId')) {
          migrations.push("ALTER TABLE lessons ADD COLUMN projectId TEXT NOT NULL DEFAULT 'global'");
        }
        if (!columns.includes('sessionId')) {
          migrations.push("ALTER TABLE lessons ADD COLUMN sessionId TEXT");
        }

        if (migrations.length === 0) {
          resolve();
          return;
        }

        logger.info({ count: migrations.length }, 'Applying database migrations');

        try {
          // Execute migrations sequentially within the serialize block (or outside with high-fidelity locks)
          for (const sql of migrations) {
            await new Promise<void>((mRes, mRej) => {
              this.db!.run(sql, (mErr) => {
                if (mErr) {
                  logger.error({ sql, mErr }, 'Migration failed');
                  mRej(mErr);
                } else {
                  mRes();
                }
              });
            });
          }

          // Ensure indexes are also awaited
          await new Promise<void>((iRes) => {
            this.db!.run("CREATE INDEX IF NOT EXISTS idx_lessons_project ON lessons(projectId)", () => iRes());
          });
          await new Promise<void>((iRes) => {
            this.db!.run("CREATE INDEX IF NOT EXISTS idx_lessons_session ON lessons(sessionId)", () => iRes());
          });

          resolve();
        } catch (migErr) {
          logger.error({ migErr }, 'Migration sequence failed');
          resolve(); // Still proceed but log error
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        // Create initial table
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS lessons (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            embedding BLOB,
            sessionId TEXT,
            projectId TEXT NOT NULL DEFAULT 'global',
            errorType TEXT,
            createdAt INTEGER NOT NULL,
            regretLikelihood REAL DEFAULT 0,
            metadata TEXT
          )
        `, (err) => { if (err) reject(err); });

        // Create hexagram_context table
        this.db!.run(`CREATE TABLE IF NOT EXISTS hexagram_context (
            line_index INTEGER NOT NULL,
            projectId TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            state INTEGER NOT NULL DEFAULT 2,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (line_index, projectId)
        )`, (err) => { if (err) reject(err); });

        // Create gutenberg_chunks table for RAG
        this.db!.run(`CREATE TABLE IF NOT EXISTS gutenberg_chunks (
            id TEXT PRIMARY KEY,
            book_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding BLOB NOT NULL,
            metadata TEXT
        )`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async addLesson(lesson: Lesson & { projectId: string }): Promise<Result<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      const query = `
        INSERT OR REPLACE INTO lessons (id, text, embedding, sessionId, projectId, errorType, createdAt, regretLikelihood, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        lesson.id,
        lesson.text,
        Buffer.from(lesson.embedding.buffer),
        lesson.sessionId,
        lesson.projectId,
        lesson.errorType,
        lesson.createdAt,
        lesson.regretLikelihood || 0,
        lesson.metadata ? JSON.stringify(lesson.metadata) : null
      ];

      this.db.run(query, params, (err) => {
        if (err) {
          logger.error({ err }, 'Failed to add lesson');
          resolve({ ok: false, error: err });
        } else {
          logger.debug({ lessonId: lesson.id }, 'Lesson added');
          resolve({ ok: true, value: undefined });
        }
      });
    });
  }

  /**
   * Search for similar lessons using cosine similarity
   * Note: This fetches recent lessons and computes similarity in JS
   * Suitable for local use with < 10,000 lessons
   */
  async getHexagramContext(projectId: string): Promise<Result<Record<string, unknown>[]>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      this.db.all('SELECT * FROM hexagram_context WHERE projectId = ? ORDER BY line_index ASC', [projectId], (err, rows) => {
        if (err) return resolve({ ok: false, error: err });
        else resolve({ ok: true, value: rows as Record<string, unknown>[] });
      });
    });
  }

  async updateHexagramLine(lineIndex: number, projectId: string, title: string, content: string, state: number): Promise<Result<void>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      const query = `
        INSERT OR REPLACE INTO hexagram_context (line_index, projectId, title, content, state, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      this.db.run(query, [lineIndex, projectId, title, content, state], (err) => {
        if (err) return resolve({ ok: false, error: err });
        else resolve({ ok: true, value: undefined });
      });
    });
  }

  async searchLessons(type: string, limit = 5): Promise<Result<Lesson[]>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      // We filter by type in the metadata JSON for maximum flexibility
      this.db.all('SELECT * FROM lessons ORDER BY createdAt DESC', [], (err, rows: Array<Record<string, unknown>>) => {
        if (err) {
          resolve({ ok: false, error: err });
          return;
        }

        const lessons = rows.map(row => {
          const metadata = JSON.parse(row['metadata'] as string) as Record<string, unknown>;
          if (metadata['type'] !== type) return null;

          const embeddingBuffer = row['embedding'] as Buffer;
          const embedding = embeddingBuffer ? new Float32Array(
            embeddingBuffer.buffer,
            embeddingBuffer.byteOffset,
            embeddingBuffer.byteLength / 4
          ) : undefined;

          return {
            ...row,
            embedding,
            projectId: row['projectId'] as string,
            metadata
          } as Lesson;
        }).filter(l => l !== null);

        resolve({ ok: true, value: (lessons as Lesson[]).slice(0, limit) });
      });
    });
  }

  async searchSimilar(queryEmbedding: Float32Array, limit = 5, projectIds?: string | string[]): Promise<Result<Lesson[]>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      const pids = Array.isArray(projectIds) ? projectIds : (projectIds ? [projectIds] : []);

      // Fetch last 1000 lessons to compare
      this.db.all('SELECT * FROM lessons ORDER BY createdAt DESC LIMIT 1000', [], (err, rows: Array<Record<string, unknown>>) => {
        if (err) {
          resolve({ ok: false, error: err });
          return;
        }

        const lessons = rows.map(row => {
          const embeddingBuffer = row['embedding'] as Buffer;
          if (!embeddingBuffer) return null;

          const embedding = new Float32Array(
            embeddingBuffer.buffer,
            embeddingBuffer.byteOffset,
            embeddingBuffer.byteLength / 4
          );

          let similarity = this.cosineSimilarity(queryEmbedding, embedding);

          // Apply boost if it's in the project stack (Federated Awareness)
          if (pids.length > 0 && pids.includes(row['projectId'] as string)) {
            similarity += 0.1;
            // Higher boost if it's the first one in the stack (The "Here" context)
            if (row['projectId'] === pids[pids.length - 1]) {
              similarity += 0.05;
            }
          }

          return {
            ...row,
            embedding,
            projectId: row['projectId'] as string,
            similarity,
            metadata: JSON.parse(row['metadata'] as string) as Record<string, unknown>
          } as Lesson & { similarity: number };
        }).filter(l => l !== null);

        // Sort by similarity and return top K
        const sorted = (lessons as any[])
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit)
          .map(({ similarity: _, ...lesson }) => lesson as Lesson);

        resolve({ ok: true, value: sorted });
      });
    });
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Safety check
    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
      dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
      normA += (a[i] ?? 0) * (a[i] ?? 0);
      normB += (b[i] ?? 0) * (b[i] ?? 0);
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async getLessonCount(): Promise<number> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(0);
      this.db.get('SELECT COUNT(*) as count FROM lessons', (err, row: Record<string, unknown>) => {
        if (err) resolve(0);
        else resolve((row?.['count'] as number) || 0);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) logger.error({ err }, 'Error closing database');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
