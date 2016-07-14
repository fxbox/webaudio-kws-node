// Incredibly simple circular buffer -
//
export default class CircularBuffer {
  constructor(buffer, start) {
    this.buffer = buffer;
    this.tail = 0;
    this.head = start || 0;

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
