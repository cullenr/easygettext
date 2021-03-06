#!/usr/bin/env node

/* eslint no-console:0 */

import fs from 'fs';
import pug from 'pug';
import minimist from 'minimist';

import * as constants from './constants.js';
import {Extractor} from './extract.js';

const PROGRAM_NAME = 'easygettext';

// Process arguments
const argv = minimist(process.argv.slice(2));
const files = argv._.sort() || [];
const quietMode = argv.quiet || false;
const outputFile = argv.output || null;
const startDelimiter = argv.startDelimiter === undefined ? constants.DEFAULT_DELIMITERS.start : argv.startDelimiter;
const endDelimiter = argv.endDelimiter === undefined ? constants.DEFAULT_DELIMITERS.end : argv.endDelimiter;
// Allow to pass extra attributes, e.g. gettext-extract --attribute v-translate --attribute v-i18n
const extraAttribute = argv.attribute || false;
const extraFilter = argv.filter || false;
const filterPrefix = argv.filterPrefix || constants.DEFAULT_FILTER_PREFIX;

if (!quietMode && (!files || files.length === 0)) {
  console.log('Usage:\n\tgettext-extract [--attribute EXTRA-ATTRIBUTE] [--filterPrefix FILTER-PREFIX] [--output OUTFILE] <FILES>');
  process.exit(1);
}

function _getExtraNames(extraEntities, defaultEntities) {
  let attributes = defaultEntities.slice();
  if (extraEntities) {
    if (typeof extraEntities === 'string') {  // Only one extra attribute was passed.
      attributes.push(extraEntities);
    } else {  // Multiple extra attributes were passed.
      attributes = attributes.concat(extraEntities);
    }
  }
  return attributes;
}

const attributes = _getExtraNames(extraAttribute, constants.DEFAULT_ATTRIBUTES);
const filters = _getExtraNames(extraFilter, constants.DEFAULT_FILTERS);

// Extract strings
const extractor = new Extractor({
  lineNumbers: true,
  attributes,
  filters,
  filterPrefix,
  startDelimiter,
  endDelimiter,
});

files.forEach(function (filename) {
  let file = filename;
  const ext = file.split('.').pop();
  console.log(`[${PROGRAM_NAME}] extracting: '${filename}`);
  try {
    let data = fs.readFileSync(file, {encoding: 'utf-8'}).toString();
    if (['jade', 'pug'].indexOf(ext) !== -1) {
      file = file.replace(/\.(jade|pug)$/, '.html');
      // Add empty require function to the context to avoid errors with webpack require inside pug
      data = pug.render(data, {filename: file, pretty: true, require: function () {}});
    }
    extractor.parse(file, data);
  } catch (e) {
    console.error(`[${PROGRAM_NAME}] could not read: '${filename}`);
    console.trace(e);
    process.exit(1);
  }
});
if (outputFile) {
  fs.writeFileSync(outputFile, extractor.toString());
} else {
  console.log(extractor.toString());
}
