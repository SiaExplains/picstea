import { messageTemplate, messageText, type Message, type Msg } from "../../core/message";

/**
 * Bounds-checked binary reading and writing for the file-format parsers (docs/12: treat files as
 * untrusted). Every read checks the remaining length and throws `FormatError` instead of reading
 * past the end; parsers turn that into a friendly message.
 */

/** A file problem the user should read. A `Msg` keeps its template for translation (ADR-0039). */
export class FormatError extends Error {
  override name = "FormatError";
  readonly template?: Msg;

  constructor(message: Message) {
    super(messageText(message));
    this.template = messageTemplate(message);
  }
}

export class ByteReader {
  private offset: number;
  private readonly view: DataView;

  constructor(
    readonly bytes: Uint8Array,
    private readonly littleEndian = false,
    start = 0,
    private readonly end = bytes.length,
  ) {
    if (start < 0 || end > bytes.length || start > end) throw new FormatError("Invalid range.");
    this.offset = start;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get position(): number {
    return this.offset;
  }

  get remaining(): number {
    return this.end - this.offset;
  }

  private need(n: number): void {
    if (!Number.isInteger(n) || n < 0 || n > this.remaining) {
      throw new FormatError("The file ends unexpectedly or a length is invalid.");
    }
  }

  seek(position: number): void {
    if (!Number.isInteger(position) || position < 0 || position > this.end) {
      throw new FormatError("The file contains an invalid offset.");
    }
    this.offset = position;
  }

  skip(n: number): void {
    this.need(n);
    this.offset += n;
  }

  u8(): number {
    this.need(1);
    return this.view.getUint8(this.offset++);
  }

  i8(): number {
    this.need(1);
    return this.view.getInt8(this.offset++);
  }

  u16(): number {
    this.need(2);
    const v = this.view.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return v;
  }

  i16(): number {
    this.need(2);
    const v = this.view.getInt16(this.offset, this.littleEndian);
    this.offset += 2;
    return v;
  }

  u32(): number {
    this.need(4);
    const v = this.view.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return v;
  }

  i32(): number {
    this.need(4);
    const v = this.view.getInt32(this.offset, this.littleEndian);
    this.offset += 4;
    return v;
  }

  f32(): number {
    this.need(4);
    const v = this.view.getFloat32(this.offset, this.littleEndian);
    this.offset += 4;
    return v;
  }

  f64(): number {
    this.need(8);
    const v = this.view.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return v;
  }

  /** A view (not a copy) of the next `n` bytes. */
  bytesView(n: number): Uint8Array {
    this.need(n);
    const out = this.bytes.subarray(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }

  ascii(n: number): string {
    const b = this.bytesView(n);
    let s = "";
    for (const c of b) s += String.fromCharCode(c);
    return s;
  }

  /** A reader over the next `n` bytes; this reader skips past them. */
  sub(n: number): ByteReader {
    this.need(n);
    const r = new ByteReader(this.bytes, this.littleEndian, this.offset, this.offset + n);
    this.offset += n;
    return r;
  }
}

export class ByteWriter {
  private buffer = new Uint8Array(1024);
  private view = new DataView(this.buffer.buffer);
  private length = 0;

  constructor(private readonly littleEndian = false) {}

  get position(): number {
    return this.length;
  }

  private ensure(n: number): void {
    if (this.length + n <= this.buffer.length) return;
    let size = this.buffer.length * 2;
    while (size < this.length + n) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buffer.subarray(0, this.length));
    this.buffer = next;
    this.view = new DataView(next.buffer);
  }

  u8(v: number): this {
    this.ensure(1);
    this.view.setUint8(this.length++, v);
    return this;
  }

  i8(v: number): this {
    this.ensure(1);
    this.view.setInt8(this.length++, v);
    return this;
  }

  u16(v: number): this {
    this.ensure(2);
    this.view.setUint16(this.length, v, this.littleEndian);
    this.length += 2;
    return this;
  }

  i16(v: number): this {
    this.ensure(2);
    this.view.setInt16(this.length, v, this.littleEndian);
    this.length += 2;
    return this;
  }

  u32(v: number): this {
    this.ensure(4);
    this.view.setUint32(this.length, v, this.littleEndian);
    this.length += 4;
    return this;
  }

  i32(v: number): this {
    this.ensure(4);
    this.view.setInt32(this.length, v, this.littleEndian);
    this.length += 4;
    return this;
  }

  f32(v: number): this {
    this.ensure(4);
    this.view.setFloat32(this.length, v, this.littleEndian);
    this.length += 4;
    return this;
  }

  f64(v: number): this {
    this.ensure(8);
    this.view.setFloat64(this.length, v, this.littleEndian);
    this.length += 8;
    return this;
  }

  bytes(b: Uint8Array): this {
    this.ensure(b.length);
    this.buffer.set(b, this.length);
    this.length += b.length;
    return this;
  }

  ascii(s: string): this {
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i) & 0xff);
    return this;
  }

  /** Overwrite a u32 written earlier (for lengths known only afterwards). */
  patchU32(at: number, v: number): void {
    this.view.setUint32(at, v, this.littleEndian);
  }

  toBytes(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}
