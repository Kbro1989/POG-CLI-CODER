export class JagBuffer {
    data: Uint8Array;
    caret: number;

    constructor(data: Uint8Array | Buffer) {
        this.data = new Uint8Array(data);
        this.caret = 0;
    }

    get size() {
        return this.data.length;
    }

    private oobError() {
        return new RangeError('out of bounds');
    }

    getUByte(): number {
        if (this.caret + 1 > this.size) throw this.oobError();
        const out = (this.data[this.caret] ?? 0) >>> 0;
        this.caret += 1;
        return out;
    }

    getUShort(): number {
        if (this.caret + 2 > this.size) throw this.oobError();
        let out = (((this.data[this.caret] ?? 0) & 0xff) << 8) >>> 0;
        out = (out | ((this.data[this.caret + 1] ?? 0) & 0xff)) >>> 0;
        this.caret += 2;
        return out;
    }

    getUInt3(): number {
        if (this.caret + 3 > this.size) throw this.oobError();
        let out = (((this.data[this.caret] ?? 0) & 0xff) << 16) >>> 0;
        out = (out | (((this.data[this.caret + 1] ?? 0) & 0xff) << 8)) >>> 0;
        out = (out | ((this.data[this.caret + 2] ?? 0) & 0xff)) >>> 0;
        this.caret += 3;
        return out;
    }

    getInt4(): number {
        if (this.caret + 4 > this.size) throw this.oobError();
        let out = (((this.data[this.caret] ?? 0) & 0xff) << 24);
        out = (out | (((this.data[this.caret + 1] ?? 0) & 0xff) << 16));
        out = (out | (((this.data[this.caret + 2] ?? 0) & 0xff) << 8));
        out = (out | ((this.data[this.caret + 3] ?? 0) & 0xff));
        this.caret += 4;
        return out;
    }

    getBytes(length: number, start?: number): Uint8Array {
        const s = start === undefined || isNaN(start) ? this.caret : start;
        const bytes = this.data.slice(s, s + length);
        this.caret += length;
        return bytes;
    }

    writeUByte(value: number): void {
        this.data[this.caret] = value;
        this.caret += 1;
    }

    writeUShort(value: number): void {
        this.data[this.caret] = (value >> 8) & 0xff;
        this.data[this.caret + 1] = value & 0xff;
        this.caret += 2;
    }

    writeUInt3(value: number): void {
        this.data[this.caret] = (value >> 16) >>> 0;
        this.data[this.caret + 1] = (value >> 8) >>> 0;
        this.data[this.caret + 2] = value & 0xff;
        this.caret += 3;
    }

    writeInt4(value: number): void {
        this.data[this.caret] = value >> 24;
        this.data[this.caret + 1] = value >> 16;
        this.data[this.caret + 2] = value >> 8;
        this.data[this.caret + 3] = value & 0xff;
        this.caret += 4;
    }
}
