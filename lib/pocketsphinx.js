import { client } from 'bridge';
import EventEmitter from 'eventemitter2';

const p = Object.freeze({
  worker: Symbol('worker'),
  workerClient: Symbol('workerClient'),
  initialize: Symbol('initialize'),
  pocketSphinxArguments: Symbol('pocketSphinxArguments'),
  pocketSphinxUrl: Symbol('pocketSphinxUrl'),
});

export default class PocketSphinx extends EventEmitter {
  constructor(options = {}) {
    super();
    // TODO: Compile worker as a string and then create a blob URL (to keep everything
    // self contained)?
    const workerUrl = options.workerUrl || undefined;
    this[p.pocketSphinxUrl] = options.pocketSphinxUrl || 'pocketsphinx.js';
    this[p.pocketSphinxArguments] = options.args || [];

    this[p.worker] = new Worker(workerUrl);
    this[p.workerClient] = client('pocketsphinx', this[p.worker], 50000);
  }

  get requiredSampleRate() {
    return 16000;
  }

  initialize() {
    console.log("calling initialize...");
    return this[p.workerClient].method('initialize', {
      pocketSphinxUrl: this[p.pocketSphinxUrl],
      args: this[p.pocketSphinxArguments],
    });
  }

  addDictionary(dictionary) {
    return this[p.workerClient].method('addWords', dictionary);
  }

  addGrammar(grammar) {
    return this[p.workerClient].method('addGrammar', grammar);
  }

  lookupWords(words) {
    return this[p.workerClient].method('lookupWords', words);
  }

  addKeyword(keyword) {
    return this[p.workerClient].method('addKeyword', keyword);
  }

  start() {
    return this[p.workerClient].method('start');
  }

  stop() {
    // TODO
  }

  process(buffer) {
    return this[p.workerClient].method('process', buffer)
      .then((result) => {
        if (result && result.hypothesis && result.hypothesis.length) {
          console.log("res: ", result);
          this.emit('keywordspotted', result);
        }
      });
  }
}
