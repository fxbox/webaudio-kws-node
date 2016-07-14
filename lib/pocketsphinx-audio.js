import CircularBuffer from './utils/circular-buffer';
import EventEmitter from 'eventemitter2';

// Must be a power of 2
const DEFAULT_BUFFER_LENGTH = 4096;

const p = Object.freeze({
  targetRate: Symbol('targetRate'),
  decimate: Symbol('decimate'),
  audioContext: Symbol('audioContext'),
  inputBufferLength: Symbol('inputBufferLength'),
  sampleCount: Symbol('sampleCount'),
  sampleInterval: Symbol('sampleInterval'),
  buffer: Symbol('buffer'),
});

/* PocketSphinx expects audio as a single-channel (monaural), little-endian,
 * 16-bit signed PCM audio, sampled at 16 kHz
 *
 * This processor constrains input to 16 kHZ and combines multichannel inputs,
 * listen for the 'data' event after hooking up to the WebAudio API for input,
 * to get buffered 16KHz Int16Array buffers.
 */
export default class PocketSphinxAudio extends EventEmitter {

  constructor(audioContext, targetSampleRate) {
    super();
    this[p.targetRate] = targetSampleRate;
    this[p.audioContext] = audioContext;
    this[p.inputBufferLength] = DEFAULT_BUFFER_LENGTH;

    const sampleRate = audioContext.sampleRate;
    const newSampleCount = Math.round(this[p.inputBufferLength] * (this[p.targetRate] / sampleRate));
    this[p.sampleCount] = newSampleCount;

    this[p.sampleInterval] = (this[p.inputBufferLength] / newSampleCount);

    this[p.buffer] = new CircularBuffer(new Float32Array(this[p.inputBufferLength] * 2));
  }

  start(source) {
    // To avoid signal aliasing first lowpass everything below the new
    // Nyquist frequency
    const nyquist = this[p.targetRate] / 2;
    const lowpass  = createLowPassFilter(this[p.audioContext], nyquist);

    source.connect(lowpass);

    const decimationNode = this[p.audioContext].createScriptProcessor(this[p.inputBufferLength]);
    decimationNode.onaudioprocess = this[p.decimate].bind(this);

    // Merge every output channel of the lowpass filter into a single input in the
    // decimation node (PocketSphinx expects mono audio)
    for (let outputIndex = 0; outputIndex < source.numberOfOutputs; outputIndex++) {
      lowpass.connect(decimationNode, outputIndex, 0);
    }

    return decimationNode;
  }

  // Take a signal from the web audio API and buffer a decimated signal down to
  // the target sample rate. If the target sample rate is > twice the bandwidth
  // of the original signal an error is thrown - to avoid accidental signal
  // ambiguity/aliasing.
  [p.decimate](audioProcessingEvent) {
    const inputBuffer = audioProcessingEvent.inputBuffer;
    const outputBuffer = audioProcessingEvent.outputBuffer;

    // Only care about channel 0 because it should be mono thanks to the merge
    // in `start` (we only care about one channel anyway).
    const inputData = inputBuffer.getChannelData(0);
    const outputData = outputBuffer.getChannelData(0);

    let originalSample = 0;
    for (let sample = 0; sample < inputBuffer.length; sample += this[p.sampleInterval]) {

      // TODO: Proper LERP
      const sampleData = inputData[Math.round(sample)];
      this[p.buffer].push(sampleData);
    }

    if (this[p.buffer].length >= DEFAULT_BUFFER_LENGTH) {
      // Create audioBuffer
      const buffer = new Int16Array(DEFAULT_BUFFER_LENGTH);
      for (let i = 0; i < DEFAULT_BUFFER_LENGTH; i++) {
        buffer[i] = floatToInt16(this[p.buffer].pop());
      }

      this.emit('data', buffer);
    }
  }
}

function floatToInt16(f) {
  const _f = (f * 32768)|0;

  if (_f > 32767) {
    return 32767;
  } else if (_f < -32768) {
    return -32768;
  } else {
    return _f;
  }
}

function createLowPassFilter(audioContext, cutoffFrequency) {
  const lowpassFilter = audioContext.createBiquadFilter();
  lowpassFilter.type = 'lowpass';
  lowpassFilter.frequency.value = cutoffFrequency;
  return lowpassFilter;
}
