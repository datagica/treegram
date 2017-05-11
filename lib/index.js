'use strict'

// external libs
const FastIndex = require('@datagica/fast-index')
const Tokenize  = require('@datagica/tokenize')

// utilities
const isString          = require('./isString')
const isBoolean         = require('./isBoolean')
const isValidNumber     = require('./isValidNumber')

// some algorithms
const filterOverlapping = require('./filterOverlapping')
const replaceEntities   = require('./replaceEntities')
const trimArray         = require('./trimArray')
const lightTrim         = require('./lightTrim')
const hardTrim          = require('./hardTrim')

const { SeparatorsRegExp, SpaceRegExp } = require('./separators')

class Treegram {
  constructor(opts) {

    // validate the options
    this.maxLength =
      isValidNumber(opts.maxLength)
        ? opts.maxLength
        : 10

    this.removeOverlapping = !opts.overlapping
    this.cache = new Map()

    this.index = new FastIndex({
      fields:    opts.fields,
      spellings: opts.spellings
    })

    if (Array.isArray(opts.data)) {
      this.loadSync(opts.data)
    }

    this.excludePunctuation = isBoolean(opts.excludePunctuation)
      ? opts.excludePunctuation
      : true

    this.tokenize = new Tokenize({})
  }

  loadAsync(collection) {
    return this.index.loadAsync(collection).then(done => Promise.resolve(this))
  }

  loadSync(collection) {
    this.index.loadSync(collection)
    return this
  }

  loadOne(a, b) {
    return this.index.loadOne(a, b)
  }

  // match and hydrate done in one step
  replace(txt, wrapper) {
    return this.find(txt).then(entities => this.replaceEntities(txt, entities, wrapper))
  }

  /**
   * Replace entities in a template text
   */
  replaceEntities(txt, entities, wrapper) {
    return Promise.resolve(replaceEntities(txt, entities, wrapper).buffer)
  }

 parseSentence ({
      sentence,
      positions,
      results
    }) {

    const words = this.excludePunctuation
      ? sentence.split(SeparatorsRegExp) // eg. "vegetables!" become "vegetables "
      : sentence.split(SpaceRegExp)      // eg. "vegetables!" become "vegetables!"

    const lastWordPosition = positions.word

    // we can't have a-ngram of arity superior to the current sentence length
    const maxLength = Math.min(this.maxLength, words.length)

    // this is the local list of matching entities
    const localBufferSeq = []

    // n-gram arity (ex. for a bigram n=2)
    for (let n = 1; n <= maxLength; n++) {

      // absolute positioning requires the global reference
      let localPosition = positions.character

      for (let wordIndex = 0; wordIndex <= (words.length - n); wordIndex++) {

        // get a fresh slice of n-gram from the array
        const ngramArr = words.slice(wordIndex, wordIndex + n)

        // compute the real arity of the n-gram (once empty spaces around are removed)
        const realArity = trimArray(ngramArr).length

        // during the first loop, ngram size is one, so we can simply use the
        // word index to build-up the global word index
        if (n == 1 && realArity > 0) {
          positions.word = lastWordPosition + wordIndex + 1
        }


        const headLength = (typeof words[wordIndex] !== 'undefined') ? words[wordIndex].length : 0
        const currentPosition = localPosition
        localPosition += 1 + headLength

        // get the ngram as a string.
        // might contains a lot of empty space, we don't clean or trim them
        // because we need to conserve all the structure (even if it's empty)
        // to provides an accurate absolute positioning
        const ngramStrRaw = ngramArr.join(' ')

        // however, we are also interest in the bare text content,
        // which are gonna use to query the index

        const ngramStrLight = lightTrim(ngramStrRaw)
        let ngramStrHard = ""
        let ngramStr = ngramStrLight

        // sequence was only made of punctuation characters, skipping it
        if (ngramStr.length === 0) {
          ngramStrHard = hardTrim(ngramStrRaw)
          if (ngramStrHard.length === 0) { continue }
          ngramStr = ngramStrHard
        }

        let matches = this.index.get(ngramStr)
        if (!matches.length && !ngramStrHard) {
          ngramStrHard = hardTrim(ngramStrRaw)
          if (ngramStr === ngramStrHard) { continue }
          matches = this.index.get(ngramStrHard)
          if (!matches.length) { continue }
          ngramStr = ngramStrHard
        }

        //if (blacklist.has(ngramStr)) { continue }

        // note: maybe we should stop using this, and instead use sentences
        // as a whole eg ": foo, bar,"
        // in this case, it would have to be cleaned first
        const trimLeftCut = ngramStrRaw.indexOf(ngramStr)

        for (let m = 0; m < matches.length; m++) {

          // ex. in "d'asthénie", the "d'" prefix accounts for 2/10 (20%) of
          //the total "mass" of the word
          const score = ngramStrHard.length
            ? matches[m].score - matches[m].score * (1 - (ngramStrHard.length / ngramStrLight.length))
            : matches[m].score

          localBufferSeq.push({
            ngram: ngramStrRaw,
            //key: ngramStr,
            value: matches[m].value,
            arity: ngramArr.length, // absolute arity (with maybe spaces before/after)
            score: score,
            realArity: realArity, // arity without space before and after

            // if we have the sentence: "I am.. speechless!!"
            // this will contain coordinates of: "speechless"
            position: {
              sentence: positions.sentence,
              word: lastWordPosition + wordIndex,
              //chunk: chunkIndex,
              begin: currentPosition + trimLeftCut,
              end: currentPosition + trimLeftCut + ngramStr.length
            },

            // if we have the sentence: "I am.. speechless!!"
            // this will contain coordinates of: "speechless!!"
            realPosition: {
              index: lastWordPosition + wordIndex,
              begin: currentPosition,
              end:  currentPosition + ngramStrRaw.length
            }
          })
        }
      }
    }

    // Perform overlapping matches filtering
    //
    // What the algorithm does is to only keep the "best" ngram in case of
    // overlapping, eg:
    // If "uber" overlaps with "uber, inc", the 2nd will win the bid
    //
    // Overlapping detection consumes an important chunk of computing time,
    // but it also is essential for our most important use case.
    // Still in some cases we might want to debug or use all the results so
    // it is an optional step (active by default)
    const localResults =
      this.removeOverlapping
        ? filterOverlapping(localBufferSeq)
        : localBufferSeq

    // final two-in-one processing step
    for (let i = 0; i < localResults.length; i++) {

      // we delete temporary variables used by the overlapping filter
      delete localResults[i].arity
      delete localResults[i].realArity
      delete localResults[i].realPosition

      // don't forget to push local results to the global results buffer!
      results.push(localResults[i])
    }
  }

  /**
   * Find treegrams in an input text
   *
   * This is the main entry point of Treegram.
   */
  find(input) {
    return Promise.resolve(this.tokenize(input, this.parseSentence.bind(this), []))
    }
}

module.exports = Treegram
module.exports.default = Treegram
module.exports.Treegram = Treegram
