# Treegram

*Treegram is a hierarchical n-gram extraction library*

## Overview

Treegram is a hierarchical n-gram extraction library designed for named entities
identification and substitution.

It was created for use in the Datanote project (which is still in development)
so code should be considered experimental and subject to change.

Yes it is in Javascript, it is not the fastest but that's not really the point:
treegram is more like a prototype. If the project gets real time, HR and money
treegram will eventually be implemented as a native C++ Node module.

Current JS code is not particularly optimized anyway, so there is room for
improvement. Even without optimization, it can scale in parallel: for instance
the intra-sentence algorithm could be a map-reduce operation.

One more thing: it is important to keep in mind that using async functions to
compute chunks in a non-blocking way is good for a multi-user server, but in
term of raw performance and compute time it is slower than an old fashioned
for-loop. It all comes done to compromises and use cases.

In Datanote, processing in done in sub-process so blocking the thread is not
(too much) of a problem.

### Example

```javascript
import Treegram from "@datagica/treegram";

// an array
const database = [{
  label: 'vegetable',
  description: 'edible thing'
}, {
  label: 'vegeta',
  description: 'character'
}];

// these options are here to help you
const options = {
  debug: false,
  fields: 'name',
  spellings: (map, ngram) => {

    // plural to singular
    map.set(ngram.replace(/(es )/gi, 'e '), 0.80)
  }
};

// now you can construct the treegram index
const treegram = new Treegram(database, options);

// get the treegrams
treegram
  .find('Vegeta, eat your vegetables!')
  .then(results => { console.log(results) })

// will print:
[
  {
    "ngram": "Vegeta",
    "value": {
      "label": "vegeta",
      "description": "character"
    },
    "score": 1,
    "position": {
      "sentence": 0, // absolute sentence index (ie. how many sentences before)
      "word": 0,     // absolute word index (ie. how many words before)
      "begin": 0,    // absolute position of the start of the sequence
      "end": 6       // absolute position of the end of the sequence
    },
  },
  {
    "ngram": "vegetables",
    "value": {
      "label": "vegetable",
      "description": "edible thing"
    },
    "score": 0.8,
    "position": {
      "sentence": 0,
      "word": 3,
      "begin": 17,
      "end": 27
    }
  }
]
```


The interesting thing is that you can also use Treegram as a template engine
using the `replaceEntities` function.

I mean this is really a cool feature, look at this example:

```javascript
treegram.replace(
  "Vegeta, eat your vegetables!",
  function (ngram) { return `<a
    href="/resource/${ngram.value.label}"
    class="${ (ngram.score > 0.80) ? 'good' : 'normal' }">${ ngram.ngram }</a>
    <i>(${ ngram.value.description })</i>`
  }
}).then(html => {
  console.log(html);
})

```

the output will be:

```html
<a
  href="/resource/vegeta"
  class="good">Vegeta</a>
  <i>(character)</i>, eat your <a
  href="/resource/vegetable"
  class="normal">vegetables</a>
  <i>(edible thing)</i>!
```
