const gulp = require('gulp');
const rollup = require('rollup-stream');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const source = require('vinyl-source-stream');

const WORKER = 'lib/worker.js';
const LIBRARY = 'lib/index.js';

gulp.task('rollup-worker', () => {
  return rollup({
    entry: WORKER,
    plugins: [
      nodeResolve({
        browser: true,
        main: true
      }),
      commonjs()
    ],
    format: 'iife'
  })
  .pipe(source('ps-worker.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('rollup-lib', () => {
  return rollup({
    entry: LIBRARY,
    plugins: [
      nodeResolve({
        browser: true,
        main: true
      }),
      commonjs(),
    ],
    format: 'umd',
    moduleName: 'PocketSphinx'
  })
  .pipe(source('library.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('copy-pocketsphinx-compiled', () => {
  return gulp
    .src([
      'lib/external/pocketsphinxjs/webapp/js/pocketsphinx*'
    ])
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['copy-pocketsphinx-compiled', 'rollup-lib', 'rollup-worker']);
