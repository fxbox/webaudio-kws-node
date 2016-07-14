// Circular buffer implementation
export default class CircularBuffer {
  constructor(buffer) {
    this.buffer = buffer;
    this.tail = 0;
    this.head = 0;
  }

  push(value) {
    this.buffer[this.head % this.buffer.length] = value;
    this.head++;
  }

  get length() {
    return this.head - this.tail;
  }

  pop() {
    const value = this.buffer[this.tail % this.buffer.length];
    this.tail++;
    return value;
  }
}
