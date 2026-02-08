import { JagBuffer } from './JagBuffer.js';
import { Bzip2 } from '@ledgerhq/compressjs';
import { Buffer } from 'buffer';

// BZ header for RSC: B, Z, h, 1
const BZIP_HEADER = Buffer.from(['B', 'Z', 'h', '1'].map(c => c.charCodeAt(0)));
const MAX_ENTRIES = 65535;
const MAX_FILE_SIZE = 16777215; // 16MB

function bzipDecompress(compressed: Buffer): Buffer {
    // ledgerhq/compressjs expects Uint8Array or Buffer
    const input = Buffer.concat([BZIP_HEADER, compressed]);
    const decompressed = Bzip2.decompressFile(input);
    return Buffer.from(decompressed);
}

function bzipCompress(data: Buffer): Buffer {
    const compressed = Bzip2.compressFile(data, undefined, 1);
    // Remove header
    return Buffer.from(compressed).subarray(BZIP_HEADER.length);
}

export function hashFilename(filename: string): number {
    filename = filename.toUpperCase();
    let hash = 0;
    for (let i = 0; i < filename.length; i += 1) {
        hash = (((hash * 61) | 0) + filename.charCodeAt(i)) - 32;
    }
    return hash;
}

export class JagArchive {
    entries: Map<number, Buffer>;
    header?: JagBuffer;
    zippedBuffer?: Buffer;
    unzippedBuffer?: JagBuffer;
    size: number = 0;
    compressedSize: number = 0;

    constructor() {
        this.entries = new Map();
    }

    readHeader() {
        if (!this.header) throw new Error('No header');
        this.size = this.header.getUInt3();
        this.compressedSize = this.header.getUInt3();
    }

    decompress() {
        if (!this.zippedBuffer || !this.zippedBuffer.length) {
            throw new Error('no archive to decompress');
        }

        if (this.size !== this.compressedSize) {
            this.unzippedBuffer = new JagBuffer(bzipDecompress(this.zippedBuffer));
        } else {
            this.unzippedBuffer = new JagBuffer(this.zippedBuffer);
        }
    }

    readEntries() {
        if (!this.unzippedBuffer) throw new Error('Unzipped buffer missing');

        const totalEntries = this.unzippedBuffer.getUShort();
        let offset = 2 + totalEntries * 10;

        for (let i = 0; i < totalEntries; i += 1) {
            const hash = this.unzippedBuffer.getInt4();
            const size = this.unzippedBuffer.getUInt3();
            const compressedSize = this.unzippedBuffer.getUInt3();
            const compressed = Buffer.from(this.unzippedBuffer.data.slice(offset, offset + compressedSize));

            let decompressed: Buffer;

            if (size !== compressedSize) {
                decompressed = bzipDecompress(compressed);
            } else {
                decompressed = compressed;
            }

            this.entries.set(hash, decompressed);
            offset += compressedSize;
        }
    }

    readArchive(buffer: Buffer) {
        this.header = new JagBuffer(buffer.subarray(0, 6));
        this.zippedBuffer = buffer.subarray(6);

        this.readHeader();
        this.decompress();
        this.readEntries();
    }

    hasEntry(name: string | number): boolean {
        const hash = typeof name === 'number' ? name : hashFilename(name);
        return this.entries.has(hash);
    }

    getEntry(name: string | number): Buffer {
        const hash = typeof name === 'number' ? name : hashFilename(name);
        if (!this.entries.has(hash)) {
            throw new Error(`entry ${name} (${hash}) not found`);
        }
        return this.entries.get(hash)!;
    }

    putEntry(filename: string, entry: Buffer) {
        const hash = hashFilename(filename);
        this.entries.set(hash, entry);
    }

    writeHeader() {
        if (!this.unzippedBuffer || !this.zippedBuffer) throw new Error('Buffers not prepared');
        this.header = new JagBuffer(Buffer.alloc(6));
        this.header.writeUInt3(this.unzippedBuffer.size);
        this.header.writeUInt3(this.zippedBuffer.length);
    }

    compress(individualCompress = true) {
        if (!this.unzippedBuffer) throw new Error('Unzipped buffer missing');

        if (!individualCompress) {
            this.zippedBuffer = bzipCompress(Buffer.from(this.unzippedBuffer.data));
        } else {
            this.zippedBuffer = Buffer.from(this.unzippedBuffer.data);
        }
    }

    writeEntries(individualCompress = true) {
        if (this.entries.size > MAX_ENTRIES) {
            throw new RangeError(`too many entries (${this.entries.size})`);
        }

        const compressedEntries = new Map<number, Buffer>();
        let compressedSize = 0;

        for (const [hash, entry] of this.entries) {
            const compressed = individualCompress ? bzipCompress(entry) : entry;
            compressedEntries.set(hash, compressed);

            if (entry.length > MAX_FILE_SIZE || compressed.length > MAX_FILE_SIZE) {
                throw new RangeError(`entry ${hash} is too big`);
            }
            compressedSize += compressed.length;
        }

        let entryOffset = 2 + this.entries.size * 10;
        this.unzippedBuffer = new JagBuffer(Buffer.alloc(entryOffset + compressedSize));
        this.unzippedBuffer.writeUShort(this.entries.size);

        for (const [hash, compressedEntry] of compressedEntries) {
            this.unzippedBuffer.writeInt4(hash);
            this.unzippedBuffer.writeUInt3(this.entries.get(hash)!.length);
            this.unzippedBuffer.writeUInt3(compressedEntry.length);

            // Copy data
            Buffer.from(compressedEntry).copy(Buffer.from(this.unzippedBuffer.data.buffer), entryOffset);
            entryOffset += compressedEntry.length;
        }
    }

    toArchive(individualCompress = true): Buffer {
        this.writeEntries(individualCompress);
        this.compress(individualCompress);
        this.writeHeader();

        if (!this.header || !this.zippedBuffer) throw new Error('Build failed');
        return Buffer.concat([Buffer.from(this.header.data), this.zippedBuffer]);
    }
}
