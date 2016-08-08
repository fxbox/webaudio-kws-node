const gulp = require('gulp');
const rollup = require('rollup-stream');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const source = require('vinyl-source-stream');

const WORKER = 'lib/worker/index.js';
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

gulp.task('rollup-lib-amd', () => {
  return rollup({
    entry: LIBRARY,
    plugins: [
      nodeResolve({
        browser: true,
        main: true
      }),
      commonjs(),
    ],
    format: 'amd',
    moduleName: 'PocketSphinx'
  })
  .pipe(source('amd-library.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('rollup-lib-umd', () => {
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
  .pipe(source('umd-library.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('copy-pocketsphinx-compiled', () => {
  return gulp
    .src([
      'lib/external/pocketsphinx*'
    ])
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['copy-pocketsphinx-compiled', 'rollup-lib-amd', 'rollup-lib-umd', 'rollup-worker']);
