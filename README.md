# WebAudio API Keyword spotting

This is a wrapper around [pocketsphinx.js](https://github.com/syl22-00/pocketsphinx.js)
designed for use in the browser in conjunction with the WebAudio API and any
input the WebAudio API accepts.

## Usage (Keyword Spotting)

First set up an audio source for the Web Audio API:

```JS
import { PocketSphinx, Audio as PsAudio } from 'psjs';

// Create a Web Audio Context
const audioContext = new AudioContext();

// Set up a source from the user's media input
// See:
// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaStreamSource
// for an example of how to accomplish this.
const source = ...;

```

Next, you need to set up Speech recognition and attach the node to the audio
API graph.

Because we load what is essentially a binary containing the pocketsphinx code,
you need to specify its location, along with the worker code (distributed as
part of this library).

We then initialize with a dictionary, that outlines words and their possible
pronunciations (see the [CMU dictionary format](http://www.speech.cs.cmu.edu/cgi-bin/cmudict)).
And set up a keyword using words found in the dictionary.

```JS
const speechRecognition = new PocketSphinx(audioContext, {
  pocketSphinxUrl: 'dist/pocketsphinx.js', // Path to the emscripten bundle
  workerUrl: 'dist/ps-worker.js', // Path to the pocketsphinx worker URL
});

const dictionary = {
  'MOZILLA': ['M AA Z IH L AH', 'M AA Z IH L ER'],
  'HELLO': ['HH AH L OW'],
};

speechRecognition.addDictionary(dictionary))
  .then(() => speechRecognition.addKeyword('HELLO MOZILLA'))
  .then(() => {
    // Connect your source to the speech recognition
    source.connect(speechRecognition);
  })
  .catch(console.error);

speechRecognition.on('keywordspotted', (event) => {
  console.log(`Spotted keyword ${event.keyword}`);
});
```

## TODO

- Full pocketsphinx capabilities (grammars etc)
- Remove polyfill for composite nodes when supported by Web Audio API
- Use AudioWorker once supported.

# License

All code in this repository unless otherwise stated is licensed under the
MPL-2.0 license.

The third party PocketSphinx.js, included as a git submodule, is licensed under the MIT license:

Copyright © 2013-2016 Sylvain Chevalier

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
