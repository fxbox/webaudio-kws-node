import { client } from 'bridge';

import PocketSphinxAudio from './pocketsphinx-audio';

const p = Object.freeze({
  worker: Symbol('worker'),
  workerClient: Symbol('workerClient'),
  initialize: Symbol('initialize'),
  pocketSphinxArguments: Symbol('pocketSphinxArguments'),
  pocketSphinxUrl: Symbol('pocketSphinxUrl'),
});

class PocketSphinx {
  constructor(options = {}) {
    // TODO: Compile worker as a string and then create a blob URL (to keep everything
    // self contained)?
    const workerUrl = options.workerUrl || undefined;
    this[p.pocketSphinxUrl] = options.pocketSphinxUrl || 'pocketsphinx.js';
    this[p.pocketSphinxArguments] = options.args || [];

    this[p.worker] = new Worker(workerUrl);
    this[p.workerClient] = client('pocketsphinx', this[p.worker], 50000);
  }

  initialize() {
    console.log("calling initialize...");
    return this[p.workerClient].method('initialize', {
      pocketSphinxUrl: this[p.pocketSphinxUrl],
      args: this[p.pocketSphinxArguments],
    });
  }

  addWords(newWords) {
    return this[p.workerClient].method('addWords', newWords);
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

  process(buffer) {
    return this[p.workerClient].method('process', buffer)
      .then((result) => {
        console.log(result);
        return result;
      });
  }
}

export {
  PocketSphinxAudio as Audio,
  PocketSphinx,
};
