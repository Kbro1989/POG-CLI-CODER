
import { Buffer } from 'buffer';

export class Stream {
    private readonly data: Buffer;
    private scan: number;

    constructor(data: Buffer, scan = 0) {
        this.data = data;
        this.scan = scan;
    }

    getData(): Buffer {
        return this.data;
    }

    bytesLeft(): number {
        return this.data.length - this.scan;
    }

    readBuffer(len = this.data.length - this.scan): Buffer {
        const res = this.data.slice(this.scan, this.scan + len);
        this.scan += len;
        return res;
    }

    tee(): Stream {
        return new Stream(this.data, this.scan);
    }

    eof(): boolean {
        if (this.scan > this.data.length) { throw new Error("reading past end of buffer"); }
        return this.scan >= this.data.length;
    }

    skip(n: number): Stream {
        this.scan += n;
        return this;
    }

    scanloc(): number {
        return this.scan;
    }

    readByte(): number {
        const val = this.readUByte();
        if (val > 127)
            return val - 256;
        return val;
    }

    readUByte(): number {
        return (this.data[this.scan++] ?? 0);
    }

    readShort(bigendian = false): number {
        const val = this.readUShort(bigendian);
        if (val > 32767)
            return val - 65536;
        return val;
    }

    readUShort(bigendian = false): number {
        if (bigendian)
            return (((this.data[this.scan++] ?? 0) << 8) & 0xFF00) | (this.data[this.scan++] ?? 0);
        else
            return (this.data[this.scan++] ?? 0) | (((this.data[this.scan++] ?? 0) << 8) & 0xFF00);
    }

    readUInt(bigendian = false): number {
        if (bigendian)
            return ((((this.data[this.scan++] ?? 0) << 24) & 0xFF000000) | (((this.data[this.scan++] ?? 0) << 16) & 0xFF0000) | (((this.data[this.scan++] ?? 0) << 8) & 0xFF00) | (this.data[this.scan++] ?? 0)) >>> 0;
        else
            return ((this.data[this.scan++] ?? 0) | (((this.data[this.scan++] ?? 0) << 8) & 0xFF00) | (((this.data[this.scan++] ?? 0) << 16) & 0xFF0000) | (((this.data[this.scan++] ?? 0) << 24) & 0xFF000000)) >>> 0;
    }

    readUShortSmart(): number {
        const byte0 = this.readUByte();
        if ((byte0 & 0x80) == 0) {
            return byte0;
        }
        const byte1 = this.readUByte();
        return ((byte0 & 0x7f) << 8) | byte1;
    }

    readShortSmart(): number {
        const byte0 = this.readUByte();
        let byte0val = byte0 & 0x7f;
        byte0val = (byte0 < 0x40 ? byte0 : byte0 - 0x80);
        if ((byte0 & 0x80) == 0) {
            return byte0val;
        }
        const byte1 = this.readUByte();
        return (byte0val << 8) | byte1;
    }

    readShortSmartBias(): number {
        const byte0 = this.readUByte();
        if ((byte0 & 0x80) == 0) {
            return byte0 - 0x40;
        }
        const byte1 = this.readUByte();
        return (((byte0 & 0x7f) << 8) | byte1) - 0x4000;
    }

    readUIntSmart(): number {
        const byte0 = this.readUByte();
        const byte1 = this.readUByte();
        if ((byte0 & 0x80) == 0) {
            return (byte0 << 8) | byte1;
        }
        const byte2 = this.readUByte();
        const byte3 = this.readUByte();
        return ((byte0 & 0x7f) << 24) | (byte1 << 16) | (byte2 << 8) | byte3;
    }

    readTribyte(): number {
        const val = this.data.readIntBE(this.scan, 3);
        this.scan += 3;
        return val;
    }

    readFloat(bigendian = false, signage = false): number {
        let upper = 0, mid = 0, lower = 0, exponent = 0;
        if (bigendian) {
            exponent = this.data[this.scan++] ?? 0;
            lower = ((this.data[this.scan++] ?? 0) << 16) & 0xFF0000;
            mid = ((this.data[this.scan++] ?? 0) << 8) & 0xFF00;
            upper = this.data[this.scan++] ?? 0;
        }
        else {
            upper = this.data[this.scan++] ?? 0;
            mid = ((this.data[this.scan++] ?? 0) << 8) & 0xFF00;
            lower = ((this.data[this.scan++] ?? 0) << 16) & 0xFF0000;
            exponent = this.data[this.scan++] ?? 0;
        }
        let mantissa = upper | mid | lower;
        if (signage) {
            exponent = (exponent << 1) & 0xFE;
            if ((mantissa & 0x800000) == 0x800000)
                exponent |= 0x1;
            mantissa &= 0x7FFFFF;
        }
        return (1.0 + mantissa * Math.pow(2.0, signage ? -23.0 : -24.0)) * Math.pow(2.0, exponent - 127.0);
    }

    readHalf(_flip = false): number {
        const upper = this.data[this.scan++] ?? 0;
        const lower = this.data[this.scan++] ?? 0;
        let mantissa = lower | ((upper << 8) & 0x0300);
        const exponent = (upper >> 2) & 0x1F;
        mantissa = mantissa * Math.pow(2.0, -10.0) + (exponent == 0 ? 0.0 : 1.0);
        mantissa *= Math.pow(2.0, exponent - 15.0);
        if ((upper & 0x80) == 0x80)
            mantissa *= -1.0;
        return mantissa;
    }
}
