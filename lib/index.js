import { client } from 'bridge';

import PocketSphinxAudio from './pocketsphinx-audio';

const p = Object.freeze({
  worker: Symbol('worker'),
  initialize: Symbol('initialize'),
});

class PocketSphinx {
  constructor(options = {}) {
    this[p.worker] = undefined;
    this[p.pocketSphinxUrl] = options.pocketSphinxUrl || 'pocketsphinx.js';

    this[p.workerClient] = undefined;
  }
}

export {
  PocketSphinxAudio as Audio,
  PocketSphinx,
};
