// NOTE: This should be run in the worker context.
const p = Object.freeze({
  recognizer: Symbol('recognizer'),
  buffer: Symbol('buffer'),
  segmentation: Symbol('segmentation'),
  initialized: Symbol('initialized'),
  importIntoScopeFn: Symbol('importIntoScopeFn'),
});

export default class PocketSphinxContext {

  constructor(options = {}) {
    this[p.recognizer] = undefined;
    this[p.buffer] = undefined;
    this[p.segmentation] = undefined;
    this[p.initialized] = false;

    this[p.importIntoScopeFn] =
      options.importScripts ||
      self.importScripts ||
      function() { throw new Error('Could not load ', arguments + '. Ensure an importScripts function is available'); };
  }

  /**
   * Initialize the context that PocketSphinx will run in.
   *
   * HACK: This will call an 'importScripts' method (that can be configured via
   * the constructor), which should load the library into the scope of at least
   * this class (but will probably be global thanks to a web worker's
   * `importScripts` function.
   *
   * @param {Object} options Initial configuration options for the pocketsphinx
   *                         library
   * @param {string} options.pocketSphinxUrl The URL from which to load th
   *                                         pocketsphinx binary (webasm/asmjs)
   *                                         module.
   * @param {Array} options.args Command line arguments to pass to
   *                             pocketsphinx.
   */
  initialize(options) {
    const pocketSphinxUrl = options.pocketSphinxUrl;
    this[p.importIntoScopeFn](pocketSphinxUrl);

    const config = new Model.Config();

    while (options.args && options.args) {
      const option = options.args.pop();

      // TODO: Make the config API less "command-line optiony"
      if (option.length === 2) {
        config.push_back(option);
      } else {
        console.error('PocketSphinx config item should be a pair.. ignoring: ', option);
      }
    }

    this[p.recognizer] = new Module.Recognizer(config);
    this[p.segmentation] = new Module.Segmentation();

    config.delete();

    if (!this[p.recognizer]) {
      throw new Error('Failed to initialize PocketSphinx recognizer');
    }

    this[p.initialized] = true;
  }

  addWords(newWords) {
    if (!this[p.initialized]) {
      throw new Error('PocketSphinxContext has not yet been initialized - must call "initialize" prior to use.');
    }

    const words = new Module.VectorWords();
    while (newWords && newWords.length) {
      const word = newWords.pop();
      if(word.length === 2) {
        words.push_back(word);
      } else {
        console.error('Word should be a pair. (', word, '). Ignoring.');
      }
    }

    const rv = recognizer.addWords(words);
    words.delete();

    if (rv !== Module.ReturnType.SUCCESS) {
      throw new Error('Failed to add words to the PocketSphinx recognizer: (Error code: ', rv, ')');
    }
  }
}
