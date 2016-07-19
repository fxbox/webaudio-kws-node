import { service } from 'bridge';
import PocketSphinxContext from './pocketsphinx-context';

const pocketSphinx = new PocketSphinxContext({
  importScripts: self.importScripts
});

service('pocketsphinx')
  .method('initialize', pocketSphinx.initialize.bind(pocketSphinx))
  .method('addWords', pocketSphinx.addWords.bind(pocketSphinx))
  .method('lookupWords', pocketSphinx.lookupWords.bind(pocketSphinx))
  .method('process', pocketSphinx.process.bind(pocketSphinx))
  .method('addGrammar', pocketSphinx.addGrammar.bind(pocketSphinx))
  .method('addKeyword', pocketSphinx.addKeyword.bind(pocketSphinx))
  .method('start', pocketSphinx.start.bind(pocketSphinx))
  .listen();
