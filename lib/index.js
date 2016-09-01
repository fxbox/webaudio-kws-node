import CircularBuffer from './utils/circular-buffer';
import EventEmitter from 'eventemitter2';
import PocketSphinx from './pocketsphinx';
import VAD from './external/vad';

// Polyfill AudioNode to allow composite audio nodes:
// https://github.com/GoogleChrome/web-audio-samples/wiki/CompositeAudioNode
const _connect = Symbol('_connect');
const _input = Symbol('_input');
const _output = Symbol('_output');
const _isCompositeAudioNode = Symbol('_isCompositeAudioNode');

AudioNode.prototype[_connect] = AudioNode.prototype.connect;
AudioNode.prototype.connect = function() {
  const args = Array.prototype.slice.call(arguments);
  if (args[0][_isCompositeAudioNode]) {
    args[0] = args[0][_input];
  }

  return this[_connect].apply(this, args);
};

// Must be a power of 2
const DEFAULT_BUFFER_LENGTH = 4096;

const p = Object.freeze({
  decimate: Symbol('decimate'),
  audioContext: Symbol('audioContext'),
  sampleInterval: Symbol('sampleInterval'),
  buffer: Symbol('buffer'),
  setupEvents: Symbol('setupEvents'),
  pocketSphinx: Symbol('pocketSphinx'),
});

export default class PocketSphinxAnalyzerNode extends EventEmitter {

  constructor(audioContext, options) {
    super();

    this[p.pocketSphinx] = new PocketSphinx(options);

    this[p.audioContext] = audioContext;

    const targetRate = this[p.pocketSphinx].requiredSampleRate;
    const sampleRate = audioContext.sampleRate;
    this[p.sampleInterval] = sampleRate / targetRate;

    this[_input] = audioContext.createGain();
    this[_output] = audioContext.createGain();

    // To avoid signal aliasing first lowpass everything below the new
    // Nyquist frequency
    const nyquist = targetRate / 2;
    const lowpass = createLowPassFilter(audioContext, nyquist);

    this[_input].connect(lowpass);

    const decimationNode = this[p.audioContext].createScriptProcessor(4096);
    console.log("Using buffer size: ", decimationNode.bufferSize);

    this[p.buffer] = new CircularBuffer(new Int16Array(decimationNode.bufferSize * 2));

    decimationNode.onaudioprocess = this[p.decimate].bind(this);

    // Merge every output channel of the lowpass filter into a single input in the
    // decimation node (PocketSphinx expects mono audio)
    for (let outputIndex = 0; outputIndex < this[_input].numberOfOutputs; outputIndex++) {
      lowpass.connect(decimationNode, outputIndex, 0);
    }

    this[_output] = decimationNode;
    this.voiceDetected = false;

    const vadOptions = {
      source: this[_input],
      voice_start: () => {
        console.log('Voice activity detected');
        this.voiceDetected = true;
      },
      voice_stop: () => {
        console.log('Voice activity stopped');
        this.voiceDetected = false;
      },
    };

    this.vad = new VAD(vadOptions);

    this[p.setupEvents]();
    // Kick off initialization.
    this[p.initialization] = this[p.pocketSphinx].initialize();
  }

  addDictionary(dictionary) {
    return this[p.initialization].then(() => {
      return this[p.pocketSphinx].addDictionary(dictionary);
    });
  }

  addKeyword(keyword) {
    return this[p.initialization].then(() => {
      return this[p.pocketSphinx].addKeyword(keyword);
    });
  }

  // PocketSphinx expects audio as a single-channel (monaural), little-endian,
  // 16-bit signed PCM audio, sampled at 16 kHz
  //
  // This processor constrains input to 16 kHZ and combines multichannel inputs,
  // listen for the 'data' event after hooking up to the WebAudio API for input,
  // to get buffered 16KHz Int16Array buffers.
  [p.decimate](audioProcessingEvent) {

    const inputBuffer = audioProcessingEvent.inputBuffer;
    const outputBuffer = audioProcessingEvent.outputBuffer;

    // Only care about channel 0 because it should be mono thanks to the merge
    // in `start` (we only care about one channel anyway).
    const inputData = inputBuffer.getChannelData(0);

    for (let sample = 0; sample < (inputBuffer.length - 1); sample += this[p.sampleInterval]) {

      // Calculate a value between two samples using linear interpolation
      // (`sample` will be a floating point number)
      const lowerIndex = sample|0;
      const upperIndex = lowerIndex + 1;
      const blend = sample - lowerIndex;
      const lowerValue = inputData[lowerIndex];
      const upperValue = inputData[upperIndex];
      const sampleData = lerp(lowerValue, upperValue, blend);

      this[p.buffer].push(floatToInt16(sampleData));
    }

    if (this[p.buffer].length >= DEFAULT_BUFFER_LENGTH) {
      const buffer = new Int16Array(DEFAULT_BUFFER_LENGTH);

      // Create audioBuffer if we have enough data samples.
      for (let i = 0; i < DEFAULT_BUFFER_LENGTH; i++) {
        buffer[i]  = this[p.buffer].pop();
      }

      this[p.pocketSphinx].process(buffer);
    }
  }

  get [_isCompositeAudioNode]() {
    return true;
  }

  get context() {
    return this[p.audioContext];
  }

  // Polyfill method
  connect() {

    // NOTE: (Spec question really) Is it ok for this method to be async?
    // Although not explicit here - nothing will apparently happen until
    // this[p.initialization] has resolved.

    this[p.pocketSphinx].start();
    this[_output].connect.apply(this[_output], arguments);
  }

  // Polyfill method
  disconnect() {
    this[_output].disconnect.apply(this[_output], arguments);
    this[p.pocketSphinx].stop();
  }

  [p.setupEvents]() {
    this[p.pocketSphinx].on('keywordspotted', (event) => {
      if (!this.voiceDetected) { return; };
      this.voiceDetected = false;
      this.emit('keywordspotted', event);
    });
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

function lerp(a, b, blend) {
  return a * (1 - blend) + b * blend;
}
