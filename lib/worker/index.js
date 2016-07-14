import { service } from 'bridge';
import PocketSphinxContext from './pocketsphinx-context';

const pocketSphinx = new PocketSphinxContext({
  importScripts: self.importScripts
});

service('pocketsphinx')
  .method('initialize', pocketSphinx.initialize)
  .listen();
