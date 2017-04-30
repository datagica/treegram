'use strict';

const FastIndex  = require("@datagica/fast-index");


// TODO add more special characters:
// https://ja.wikipedia.org/wiki/%E6%8B%AC%E5%BC%A7
// https://en.wikipedia.org/wiki/Bracket
// https://en.wikipedia.org/wiki/Comma
// https://en.wikipedia.org/wiki/Colon_(punctuation)
// https://en.wikipedia.org/wiki/Question_mark
// https://en.wikipedia.org/wiki/Quotation_mark
// https://en.wikipedia.org/wiki/Semicolon
// https://en.wikipedia.org/wiki/Slash_(punctuation)

const separators = [
  '0009', // character tabulation
  '000A', // line feed
  '000B', // line tabulation
  '000C', // form feed
  '000D', // carriage return
  '0020', // space
  '0021', // exclamation mark
  '0022', // quotation mark
  '0027', // apostrophe
  '0028', // left parenthesis
  '0029', // right parenthesis
  '002C', // comma
  '002E', // full stop (the "dot" .)
  '003A', // colon
  '003B', // semicolon
  '003F', // question mark
  '0085', // next line
  '00A0', // no-break space
  '00A7', // section sign
  '00B6', // pilcrow (paragraph mark, paragraph sign, paraph, alinea)
  '00B7', // interpunct
  '01C3', // latin letter retroflex click
  '02D0', // ipa triangular colon
  '1680', // ogham space mark
  '2000', // en quad
  '2001', // em quad
  '2002', // en space
  '2003', // em space
  '2004', // three-per-em space
  '2005', // four-per-em space
  '2006', // six-per-em space
  '2007', // figure space
  '2008', // punctuation space
  '2009', // thin space
  '200A', // hair space

  // OK actually we want to keep this one, it is part of some words
  // '2012', // figure dash

  '2013', // en dash
  '2014', // em dash
  '2015', // horizontal bar

  '2025', // japanese two-dots ellipsis
  '2026', // japanese three-dots ellipsis
  '2028', // line separator
  '2029', // paragraph separator
  '2047', // double question mark
  '2048', // question exclamation mark
  '2049', // exclamation question mark
  '202F', // narrow no-break space
  '205F', // medium mathematical space
  '203C', // double exclamation mark
  '2E0F', // paragraphos
  '3000', // ideographic space
  '3002', // japanese full stop
  '303D', // japanese part alternation mark
  'FF1A', // full-width colon
  'FF1F', // full-width question mark
  'FE56', // small question mark
  'FE57', // small exclamation mark
  'FF01' // full-width exclamation mark
];

const SeparatorsPattern = separators.map(s => '\\u' + s);
const SeparatorsRegExp = new RegExp(SeparatorsPattern.join('|'), 'g');
const SpaceRegExp = new RegExp(' ', 'g');
const TrimRegExp = new RegExp(
  `^[ :\\s${SeparatorsPattern.join('')}]+`+
  `|`+
  `[ :\\s${SeparatorsPattern.join('')}]+$`
  , 'g');


function filterOverlapping(seq) {
  return seq.filter(function(item) {

    // if the keyword is a meta-keyword, not a single keyword concept
    // it is a 'ghost' that doesn't collide with other words, because it
    // actually built from various unrelated words, that only make sense
    // and represent a concept when used together. So we do not check
    // collision.
    // Yes, the property name is kinda lame at the moment. Sorry.
    if (typeof item.minimum_hits_required === 'number') {
      if (item.minimum_hits_required > 1) return true;
    }

    let keep = true;

    for (let i = 0; i < seq.length && keep; i++) {

      const item2 = seq[i];

      // OK, I disabled this line and this solved the "duplicate item" bug
      //if (item2.ngram === item.ngram) return;

      // if the other word is a ghost, we also ignore it
      if (typeof item2.minimum_hits_required === 'number') {
        if (item2.minimum_hits_required > 1) continue;
      }

      //console.log(`  item1 (${JSON.stringify(item.ngram)}): ${JSON.stringify(item.realPosition)}, item2 (${JSON.stringify(item2.ngram)}): ${JSON.stringify(item2.realPosition)}`);
      const overlap =
        (item.realPosition.begin <= item2.realPosition.begin &&
        item2.realPosition.begin <= item.realPosition.end)
     ||
        (item.realPosition.begin <= item2.realPosition.end &&
          item2.realPosition.end <= item.realPosition.end)
     ||
        (item2.realPosition.begin <= item.realPosition.begin &&
         item.realPosition.begin <= item2.realPosition.end)
     ||
        (item2.realPosition.begin <= item.realPosition.end &&
         item.realPosition.end <= item2.realPosition.end);
      // debug("  item2 included within item1? " + overlap);
      if (!overlap) continue;
      // debug(`  item1: ${JSON.stringify(item)}, item2: ${JSON.stringify(item2)}`);

      if (item.score < item2.score) {
        // debug("item.score > item2.score: trashing the one ngram too approximative");
        keep = false;
      } else if (item.score > item2.score) {
        //debug("item.score < item2.score");
        //keep = true;
      } else if (item.realArity > item2.realArity) {
        //debug("item.realArity > realArity.arity");
        //keep = true;
      } else if (item.realArity < item2.realArity) {
        // debug("item.realArity < item2.realArity: trashing the one ngram wich is too narrow");
        keep = false; //
      } else if (item.arity < item2.arity) {
        //debug("item.arity < item2.arity");
        // keep = true;

      } else if (item.arity > item2.arity) {
        // debug("item.arity > item2.arity: trashing the one ngram with vacuum around itself");

        keep = false;
      } else {
        // note: we are probably just colliding with ourself
        // debug(`  collision between '${JSON.stringify(item)}' and '${JSON.stringify(item2)}', choosing one arbitrarily`);
        //keep = true;
        //keep = true;
      }

    };

    //console.log("do we keep " + item.ngram + "? " + keep);
    return keep;
  }).sort(function (a, b) {
    if (a.realArity == b.realArity) {
      return b.score - a.score // want most words first
    } else {
      return b.realArity - a.realArity // want biggest first
    }
  })
}


// chars that can split words into sentence, if followed by spaces
const sentenceEnding2Chars = [
  // western
  '.','!','?',

  // japanese
  '。', '！','？',

  // arabic
  '؟',

  // hindi
  '|'
]

// basically, these ware chars that always split text into sentences
const sentenceEnding1Chars = [
  '\n',

  // western
  '!','?',

  // japanese
  '。', '！','？',

  // arabic
  '؟',

  // hindi
  '|'
]

const spacingChars = [
  // western or generic
  ' ', '\n', '\r','\t',

  // japanese space
  '　'

]

const chunkEndingChars = [
  // western
  ':', ';',

  // japanese and chinese
  '：',

  // arabic
  '،'
]
/**
 * Split text into sentences, without removing spaces or punctuation
 *
 * UTF8 ready: it uses the String iterator and store chars in an array
 *
 *
 */
 /**
  * Split text into sentences, without removing spaces or punctuation
  *
  * UTF8 ready: it uses the String iterator and store chars in an array
  *
  *
  */
 function splitSentences(input) {

   const sentences = []
   let buffer = []
   let isEnding = false
   for (const character of input) {

     const isBreakingChar = ~sentenceEnding1Chars.indexOf(character)
     const isSpacingChar = ~spacingChars.indexOf(character)

     // this is how handle sequences such as "what?!!"
     // basically if we detect a sentence ending character, we continue to read
     // the rest until we detect we are back on a "normal" character path again
     if(isEnding && !(isBreakingChar || isSpacingChar)) {
       isEnding = false
       sentences.push(buffer.join(''))
       buffer = []
       buffer.push(character)
       continue
     }

     // detect an ending char
     // we try to avoid matching J. K. Rowling and H. G. Wells but
     // making an algorithm that works with multiple locales is hard: eg. some
     // have no spaces etc
     if (buffer.length > 4 && isBreakingChar) {
       isEnding = true
     }

     buffer.push(character)
   }

   const lastSentence = buffer.join('')
   if (lastSentence !== '') {
     sentences.push(lastSentence)
   }
   buffer = []
   return sentences
 }

console.log("sentences: "+JSON.stringify({
  a: splitSentences("hello world!! this is a test.\nIt works?"),
  b: splitSentences("では主にマル「。」について述べる。句点と読点（“、”）を合わせて句読点と呼ぶ。")
}, null, 2))

class Treegram {
  constructor(opts) {

    this.opts = opts;

    this.maxLength          = (typeof this.opts.maxLength          === "number")  ? this.opts.maxLength          : 10;
    this.excludePunctuation = (typeof this.opts.excludePunctuation === "boolean") ? this.opts.excludePunctuation : true;

    this.cache = new Map();

    this.index = new FastIndex({
      fields: this.opts.fields,
      spellings: this.opts.spellings
    });

    if (Array.isArray(opts.data)) {
      this.loadSync(opts.data);
    }
  }

  loadAsync(collection) {
    return this.index.loadAsync(collection).then(done => {
      return Promise.resolve(this);
    })
  }

  loadSync(collection) {
    this.index.loadSync(collection);
    return this;
  }

  loadOne(a, b) {
    return this.index.loadOne(a, b);
  }

  // super clean
  static clean(gram) {
    return gram.replace(TrimRegExp, ' ').trim();
  }

  /**
   * tailors this:
   * ['', '', '', 'ok', '', '', 'this', 'is', 'ok', '', '']
   *
   * into this:
   * ['ok', '', '', 'this', 'is', 'ok']
   *
   */
  static trimArray(arr){
      let i,j;
      for (i = 0; i < arr.length && !arr[i].length; i++) {}
      for (j = arr.length - 1; j > 0 && !arr[j].length; j--) {}
      return arr.slice(i, j + 1)
   }

  // wraps entities found in the text
  // entities must match the input text
  replaceEntities(txt, entities, wrapper) {
    return Promise.resolve(([].concat(entities)).sort((a, b) => {
      return a.position.begin - b.position.begin
    }).reduce((acc, entity) => {
      const wrap = wrapper(entity);
      const begin = acc.delta + entity.position.begin;
      const end   = acc.delta + entity.position.end;
      //console.log("\ndelta: "+acc.delta+", begin: "+begin+", end: "+end+", len: "+wrap.length);
      acc.buffer = acc.buffer.slice(0, begin) + wrap + acc.buffer.slice(end);
      //console.log("buffer: "+acc.buffer);
      acc.delta = acc.delta + wrap.length - entity.ngram.length;
      //console.log("new delta: "+acc.delta);
      return acc;
    }, {
      buffer: txt,
      delta: 0
    }).buffer);
  }

  // match and hydrate done in one step
  replace(txt, wrapper) {
    return this.find(txt).then(entities => this.replaceEntities(txt, entities, wrapper));
  }

  /**
   * This function is full of expensive operations, function creation etc..
   and needs to be cleaned
   */
  find(input) {

    let text = "";
    if (typeof input === 'string') {
      text = input;
    } else if (typeof input.text === 'string') {
      text = input.text;
    } else {
      return Promise.resolve(new Error(`input is not text but ${typeof input} (${input})`));
    }

    const removeOverlapping = !this.opts.overlapping;

    // uncomment to cut the ngram
    const textWordsArr = (
      (this.excludePunctuation)
        ? text.split(SeparatorsRegExp) // eg. "vegetables!" become "vegetables "
        : text.split(SpaceRegExp)      // eg. "vegetables!" become "vegetables!"
      );

    /*
    const blacklist = new Set(
      (Array.isArray(args.blacklist) ? args.blacklist : []).map(i => `${i}`.trim().toLowerCase())
    );
    */

    let bufferSeq = [];
    let out = [];

    const wordsStr = text;
    const wordsArr = textWordsArr;
    const parentPosition = {
      begin: 0,
      end: text.length
    };

    const maxLength = Math.min(this.maxLength, textWordsArr.length);

    for (let n = 1; n <= maxLength; n++) {
      let mobilePosition = 0 + parentPosition.begin;
      //console.log("level: "+n);
      for (let i = 0; i <= (wordsArr.length - n); i++) {

        // get a fresh slice of n-gram from the array
        const ngramArr = wordsArr.slice(i, i + n);

        // compute the real arity of the n-gram (once empty spaces around are removed)
        const realArity = Treegram.trimArray(ngramArr).length;

        const headLength = (typeof wordsArr[i] !== 'undefined') ? wordsArr[i].length : 0;
        const currentPosition = 0 + mobilePosition;
        mobilePosition = mobilePosition + 1 + headLength;

        // the ngram as a string. might contains a lot of empty space,
        // that's on purpose: we need this empty space to compute a precise
        // location in the final string
        const ngramStrRaw = ngramArr.join(' ');

        // however, we are also interest in the bare text content,
        // which are gonna use to query the index
        const ngramStr = Treegram.clean(ngramStrRaw);

        // sequence was only made of punctuation characters, skipping it
        if (ngramStr.length === 0) continue;

        const matches = this.index.get(ngramStr);
        if (!matches) continue;

        //if (blacklist.has(ngramStr)) continue;
        //
        // note: maybe we should stop using this, and instead use sentences
        // as a whole eg ": foo, bar,"
        // in this case, it would have to be cleaned first
        const trimLeftCut = ngramStrRaw.indexOf(ngramStr);

        for (var m = 0; m < matches.length; m++) {
          bufferSeq.push({
            ngram:     ngramStrRaw,
            //key:     ngramStr,
            value:     matches[m].value,
            arity:     ngramArr.length, // absolute arity (with maybe spaces before/after)
            score:     matches[m].score,
            realArity: realArity, // arity without space before and after

            // if we have the sentence: "I am.. speechless!!"
            // this will contain coordinates of: "speechless"
            position: {
              index: i,
              begin: currentPosition + trimLeftCut,
              end:   currentPosition + trimLeftCut + ngramStr.length
            },

            // if we have the sentence: "I am.. speechless!!"
            // this will contain coordinates of: "speechless!!"
            realPosition: {
              index: i,
              begin: currentPosition,
              end:   currentPosition + ngramStrRaw.length
            }
          })
        }
      }
    }

    // enter the clusterf***
    if (typeof this.opts.clusterBy === 'string') {
      const clusterBy = this.opts.clusterBy;
      out = { 'default': [] };
      const keys = ['default'];
      for (let i = 0; i < bufferSeq.length; i++) {
        const item = bufferSeq[i];
        if (typeof item.value !== 'undefined' && typeof item.value[clusterBy] === 'string') {
          const key = item.value[clusterBy];
          if (out[key]) {
            out[key].push(item);
          } else {
            out[key] = [ item ];
            keys.push(key)
          }
        } else {
          out['default'].push(item);
        }
      }
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        out[key] = filterOverlapping(out[key]);

        // cleanup
        for (let i = 0; i < out.length; i++) {
          delete out[key][i].arity;
          delete out[key][i].realArity;
          delete out[key][i].realPosition;
        }
      }
    } else {
      out = (removeOverlapping) ? filterOverlapping(bufferSeq) : bufferSeq;

      // cleanup
      for (let i = 0; i < out.length; i++) {
        delete out[i].arity;
        delete out[i].realArity;
        delete out[i].realPosition;
      }
    }
    return Promise.resolve(out);
  }
}

module.exports = Treegram
module.exports.default = Treegram
module.exports.Treegram = Treegram
