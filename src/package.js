var later = require("../index");

console.log(JSON.stringify({
  "name": "mostly-later",
  "version": later.version,
  "description": "Determine later (or previous) occurrences of recurring schedules (forked from later; with more flexible text parsing)",
  "keywords": ["schedule", "occurrences", "recur", "cron"],
  "author": "Andy Pang",
  "repository" : {
    "type" : "git",
    "url" : "git://github.com/andychat/later.git"
  },
  "main": "index.js",
  "browserify": "index-browserify.js",
  "jam": {
    "main": "later.js",
    "shim": {
      "exports": "later"
    }
  },
  "devDependencies": {
    "smash": "~0.0.8",
    "mocha": "*",
    "should": ">=0.6.3",
    "jslint": "*",
    "uglify-js": "*",
    "benchmark": "*"
  },
  "license": "MIT",
  "scripts": {
    "test": "./node_modules/.bin/mocha test/**/*-test.js --reporter dot"
  }
}, null, 2));
