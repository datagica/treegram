# Treegram

*hierarchical n-gram matching library*

## Usage

### Installation

    $ npm install @datagica/treegram --save

### example

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
      "begin": 0,
      "end": 6
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
