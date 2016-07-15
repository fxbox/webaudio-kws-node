// NOTE: This should be run in the worker context.
const p = Object.freeze({
  recognizer: Symbol('recognizer'),
  buffer: Symbol('buffer'),
  segmentation: Symbol('segmentation'),
  initialized: Symbol('initialized'),
  importIntoScopeFn: Symbol('importIntoScopeFn'),
  checkInit: Symbol('checkInit'),
});

export default class PocketSphinxContext {
  constructor(options = {}) {
    // Values initialized by 'initalize'
    this[p.recognizer] = undefined;
    this[p.buffer] = undefined;
    this[p.segmentation] = undefined;

    this[p.initialized] = false;
    this[p.grammarMap] = new Map();

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
   * @param {string} options.pocketSphinxUrl The URL from which to load the
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
    this[p.buffer] = new Module.AudioBuffer();

    config.delete();

    if (!this[p.recognizer]) {
      throw new Error('Failed to initialize PocketSphinx recognizer');
    }

    this[p.initialized] = true;
  }

  addWords(newWords) {
    this[p.checkInit]();

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

  addGrammar(grammar) {
    this[p.checkInit]();

    const transitions = new Module.VectorTransitions();

    // Normalize transitions and build VectorTransitions
    grammar.transitions
      .filter((transition) => transition.hasOwnProperty('from') && transition.hasOwnProperty('to'))
      .forEach((transition) => {
        transition.word = transition.word || '';
        transition.logp = transition.logp || 0;

        transitions.push_back(transition);
      });

    // Replace with VectorTransitions
    grammar.transitions = transitions;

    const grammarName = grammar.name;

    // Remove the name (so we have a clean object for the 'FFI')
    // Not sure if this is actually necessary (sgiles)
    delete grammar.name;

    const grammarIdRef = new Module.Integers();
    const output = this[p.recognizer].addGrammar(grammarIdRef, grammar);

    transitions.delete();

    if (output !== Module.ReturnType.SUCCESS) {
      grammarIdRef.delete();
      throw new Error('Failed to add grammar: ', grammarName);
    }

    // Save the internal ID (integer) so it can be referred to by a name
    this[p.grammarMap].set(grammarName, grammarIdRef.get(0));
    grammarIdRef.delete();
  }

  lookupWords(keyword) {
    this[p.checkInit]();

    return data.filter((word) => {
      const wordId = this[p.recognizer].lookupWord(word);
      return wordId && output.indexOf(word) === -1;
    });
  }

  process(buffer) {
    this[p.checkInit]();

    // Expand the buffer if necessary
    while(this[p.buffer].size() < buffer.length) {
      this[p.buffer].push_back(0);
    }

    for (let i = 0; i < buffer.length; i++) {
      this[p.buffer].set(i, buffer[i]);
    }

    const output = this[p.recognizer].process(this[p.buffer]);

    if (output !== Module.ReturnType.SUCCESS) {
      throw new Error('Failed to process audio data - recognizer.process returned: (', output, ')');
    }

    this[p.recognizer].getHypseg(this[p.segmentation]);

    return {
      hypothesis: this[p.recognizer].getHyp(),
      hypothesisSegmentation: segmentationToArray(this[p.segmentation])
    };
  }

  [p.checkInit]() {
    if (!this[p.initialized]) {
      throw new Error('PocketSphinxContext has not yet been initialized - must call "initialize" prior to use.');
    }
  }
}

function segmentationToArray(segmentation) {
  const output = [];
  for (let segIndex = 0; segIndex < segmentation.size(); segIndex++) {
    output.push({
      'word': segmentation.get(segIndex).word,
      'start': segmentation.get(segIndex).start,
      'end': segmentation.get(sefIndex).end
    });
  }

  return output;
}