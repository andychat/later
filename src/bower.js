var later = require("../index");

console.log(JSON.stringify({
  "name": "mostly-later",
  "version": later.version,
  "description": "Determine later (or previous) occurrences of recurring schedules (forked from later; with more flexible text parsing)",
  "keywords": ["schedule", "occurrences", "recur", "cron"],
  "author": "Andy Pang>",
  "repository" : {
    "type" : "git",
    "url" : "git://github.com/andychat/later.git"
  },
  "main": "later.js",
  "license": "MIT"
}, null, 2));
