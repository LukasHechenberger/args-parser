# args-parser

Parses command line arguments passed to node.js.

[![CircleCI](https://circleci.com/gh/ls-age/args-parser.svg?style=shield)](https://circleci.com/gh/ls-age/args-parser)
[![codecov](https://codecov.io/gh/ls-age/args-parser/branch/master/graph/badge.svg)](https://codecov.io/gh/ls-age/args-parser)
[![ESDoc](https://doc.esdoc.org/github.com/ls-age/args-parser/badge.svg)](https://doc.esdoc.org/github.com/ls-age/args-parser)

**Note that this package is still under heavy development.**

## Installation

Run `npm install [--save[-dev]] @ls-age/args-parser` to install this module.

## Usage

Basic usage:

```javascript
import parseArgs from '@ls-age/parse-args';

const args = parseArgs(
  ['non-option', '--number', '13', '--bool'],
  {
    options: {
      number: { type: 'number' },
      bool: 'Description of "bool" option'
    }
  }
);

console.log(args._); // logs ['non-option']
console.log(args.number); // logs `13`
console.log(args.test); // logs `true`
```

Look at the [docs](https://doc.esdoc.org/github.com/ls-age/args-parser) and [tests](https://doc.esdoc.org/github.com/ls-age/args-parser/test.html) for more detailed usage examples.
