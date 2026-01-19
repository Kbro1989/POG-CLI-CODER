/**
 * Vector Database - Local storage for lessons and embeddings
 * 
 * Responsibilities:
 * - Persist lessons and errors for long-term learning
 * - Provide vector search using cosine similarity (JS-side)
 * - Manage database schema
 */

import sqlite3 from 'sqlite3';
import { join } from 'path';
import pino from 'pino';
import type { Result, VibeConfig, Lesson } from '../core/models.js';

const logger = pino({
  name: 'VectorDB',
  base: { hostname: 'POG-VIBE' }
});

export class VectorDB {
  private db?: sqlite3.Database;
  private readonly dbPath: string;

  constructor(config: VibeConfig) {
    this.dbPath = join(config.pogDir, 'vibe-learning.db');
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

  private async ensureSchema(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      this.db!.all("PRAGMA table_info(lessons)", async (err, rows: any[]) => {
        if (err) {
          logger.error({ err }, 'Failed to check schema');
          resolve();
          return;
        }

        const columns = rows.map(r => r.name);
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
  async getHexagramContext(projectId: string): Promise<Result<any[]>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      this.db.all('SELECT * FROM hexagram_context WHERE projectId = ? ORDER BY line_index ASC', [projectId], (err, rows) => {
        if (err) return resolve({ ok: false, error: err });
        else resolve({ ok: true, value: rows });
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

  async searchSimilar(queryEmbedding: Float32Array, limit = 5): Promise<Result<Lesson[]>> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ ok: false, error: new Error('Database not initialized') });
        return;
      }

      // Fetch last 1000 lessons to compare
      this.db.all('SELECT * FROM lessons ORDER BY createdAt DESC LIMIT 1000', [], (err, rows: any[]) => {
        if (err) {
          resolve({ ok: false, error: err });
          return;
        }

        const lessons = rows.map(row => {
          const embedding = new Float32Array(
            row.embedding.buffer,
            row.embedding.byteOffset,
            row.embedding.byteLength / 4
          );

          return {
            ...row,
            embedding,
            similarity: this.cosineSimilarity(queryEmbedding, embedding),
            metadata: JSON.parse(row.metadata as string)
          };
        });

        // Sort by similarity and return top K
        const sorted = lessons
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
      this.db.get('SELECT COUNT(*) as count FROM lessons', (err, row: any) => {
        if (err) resolve(0);
        else resolve(row?.count || 0);
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