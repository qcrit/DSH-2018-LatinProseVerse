#Sentence Boundary Detection (SBD)
==================

Split text into sentences with a `vanilla` rule based approach (i.e working ~95% of the time).

* Split a text based on period, question- and exclamation marks.
    * Skips (most) abbreviations (Mr., Mrs., PhD.)
    * Skips numbers/currency
    * Skips urls, websites, email addresses, phone nr.
    * Counts ellipsis and ?! as single punctuation

## Attribution
This is a fork of [http://github.com/Tessmore/sbd](http://github.com/Tessmore/sbd) by Fabiën Tesselaar. Most of this README is the same.


## Installation

Use [npm](http://npmjs.org):

    $ npm install @knod/sbd


## How to

```javascript
var tokenizer = require('sbd');

var text = "On Jan. 20, former Sen. Barack Obama became the 44th President of the U.S. Millions attended the Inauguration.";
var sentences = tokenizer.sentences(text, optional_options);

// Returns:
// [
//  'On Jan. 20, former Sen. Barack Obama became the 44th President of the U.S.',
//  'Millions attended the Inauguration.',
// ]
```

or

```javascript
var tokenizer = require('sbd');

var text = "There are many copies. And they have a plan.";
var sentences = tokenizer.sentences(text, {parse_type: 'words'});

// Returns:
// [
//  [ 'There', 'are', 'many', 'copies.' ],
//  [ 'And', 'they', 'have', 'a', 'plan.' ]
// ]
```

See a demo at [https://knod.github.io/sbd/](https://knod.github.io/sbd/)


#### Optional options

Defaults:

```
var options = {
    "parse_type"          : "strings",
    "newline_boundaries"  : false,
    "html_boundaries"     : false,
    "html_boundaries_tags": ["p","div","ul","ol"],
    "sanitize"            : false,
    "allowed_tags"        : false,
    "abbreviations"       : null
};
```

* `parse_type`: Value can be either 'strings' or 'words'. 'strings' will turn your text into a list of sentences, each of which is a string. 'words' will turn your text into a list of sentences, each of which is a list of words.
* `newline_boundaries`: Force sentence split at newlines
* `html_boundaries`: Force sentence split at specific tags (br, and closing p, div, ul, ol)
* `sanitize`: If you don't expect nor want html in your text.
* `allowed_tags`: To sanitize html, the library [santize-html](https://github.com/punkave/sanitize-html) is used. You can pass the allowed tags option.
* `abbreviations`: list of abbreviations to override the original ones for use with other languages. Don't put dots in abbreviations.



## Contributing

You can run unit tests with `npm test`.

If you feel something is missing, you can open an issue at [http://github.com/knod/sbd/issues](http://github.com/knod/sbd/issues) stating the problem sentence and desired result. If code is unclear give me a @mention. Pull requests are welcome.


## Building the (minified) scripts

(If you already have browserify, there's no need to include the first line)


```
npm install -g browserify

npm run-script build
```

## Next

* Update tests for new capabilities
* New tests to show failing cases
* Remove html parsing. The combination of the two should happen in a separate module.
