'use strict'

// external lib for word indexing
const FastIndex         = require('@datagica/fast-index')

// utilities
const isString          = require('./isString')
const isBoolean         = require('./isBoolean')
const isValidNumber     = require('./isValidNumber')

// some constants (list of characters, regular expressions)
const {
  separators,
  SeparatorsPattern,
  SeparatorsRegExp,
  SpaceRegExp,
  TrimRegExp
} = require('./separators')

// some algorithms
const filterOverlapping = require('./filterOverlapping')
const replaceEntities   = require('./replaceEntities')
const trimArray         = require('./trimArray')
const trimClean         = require('./trimClean')

// steal some stuff from the splitSentences library (we package the lib but it
// should be external)
const {
  sentenceEndingChars,
  spacingChars,
  chunkEndingChars
} = require('./splitSentences')

class Treegram {
  constructor(opts) {

    this.opts = opts

    // validate the options
    this.maxLength          = (isValidNumber(this.opts.maxLength))      ? this.opts.maxLength          : 10
    this.excludePunctuation = (isBoolean(this.opts.excludePunctuation)) ? this.opts.excludePunctuation : true

    this.cache = new Map()

    this.index = new FastIndex({
      fields:    this.opts.fields,
      spellings: this.opts.spellings
    })

    if (Array.isArray(opts.data)) {
      this.loadSync(opts.data)
    }
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
    return Promise.resolve(
      replaceEntities(txt, entities, wrapper).buffer
    )
  }

  /**
   * Find treegrams in an input text
   *
   * This is the main entry point of Treegram.
   */
  find(input) {

    let text = ""
    if (isString(input)) {
      text = input
    } else if (isString(input.text)) {
      text = input.text
    } else {
      return Promise.resolve(new Error(`input is not text but ${typeof input} (${input})`))
    }

    const removeOverlapping = !this.opts.overlapping

    /*
    const blacklist = new Set(
      (Array.isArray(args.blacklist) ? args.blacklist : []).map(i => `${i}`.trim().toLowerCase())
    )
    */

    // as the name says, this is where the magic happens
    const mainExtractionAlgorithm = (
      wordsStr, sentenceIndex, globalResults, parentPosition
    ) => {

      if (typeof wordsStr !== 'string' || wordsStr === '') { return }

      // these regexp should be reviewed / changed maybe
      const wordsArr = this.excludePunctuation
        ? wordsStr.split(SeparatorsRegExp) // eg. "vegetables!" become "vegetables "
        : wordsStr.split(SpaceRegExp)      // eg. "vegetables!" become "vegetables!"

      // we can't have a-ngram of arity superior to the current sentence length
      const maxLength = Math.min(this.maxLength, wordsArr.length)

      // this is the local list of matching entities
      const localBufferSeq = []

      for (let n = 1; n <= maxLength; n++) {
        let mobilePosition = 0 + parentPosition.begin
        //console.log("level: "+n)
        for (let i = 0; i <= (wordsArr.length - n); i++) {

          // get a fresh slice of n-gram from the array
          const ngramArr = wordsArr.slice(i, i + n)

          // compute the real arity of the n-gram (once empty spaces around are removed)
          const realArity = trimArray(ngramArr).length

          const headLength = (typeof wordsArr[i] !== 'undefined') ? wordsArr[i].length : 0
          const currentPosition = 0 + mobilePosition
          mobilePosition += 1 + headLength

          // get the ngram as a string.
          // might contains a lot of empty space, we don't clean or trim them
          // because we need to conserve all the structure (even if it's empty)
          // to provides an accurate absolute positioning
          const ngramStrRaw = ngramArr.join(' ')

          // however, we are also interest in the bare text content,
          // which are gonna use to query the index
          const ngramStr = trimClean(ngramStrRaw)

          // sequence was only made of punctuation characters, skipping it
          if (ngramStr.length === 0) { continue }

          const matches = this.index.get(ngramStr)
          if (!matches) { continue }

          //if (blacklist.has(ngramStr)) { continue }


          // note: maybe we should stop using this, and instead use sentences
          // as a whole eg ": foo, bar,"
          // in this case, it would have to be cleaned first
          const trimLeftCut = ngramStrRaw.indexOf(ngramStr)

          for (let m = 0; m < matches.length; m++) {
            localBufferSeq.push({
              ngram: ngramStrRaw,
              //key: ngramStr,
              value: matches[m].value,
              arity: ngramArr.length, // absolute arity (with maybe spaces before/after)
              score: matches[m].score,
              realArity: realArity, // arity without space before and after

              // if we have the sentence: "I am.. speechless!!"
              // this will contain coordinates of: "speechless"
              position: {
                sentence: sentenceIndex,
                word: i,
                //chunk: chunkIndex,
                begin: currentPosition + trimLeftCut,
                end: currentPosition + trimLeftCut + ngramStr.length
              },

              // if we have the sentence: "I am.. speechless!!"
              // this will contain coordinates of: "speechless!!"
              realPosition: {
                index: i,
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
      const localResults = removeOverlapping
        ? filterOverlapping(localBufferSeq)
        : localBufferSeq

      // final two-in-one processing step
      for (let i = 0; i < localResults.length; i++) {

        // we delete temporary variables used by the overlapping filter
        delete localResults[i].arity
        delete localResults[i].realArity
        delete localResults[i].realPosition

        // don't forget to push local results to the global results buffer!
        globalResults.push(localResults[i])
      }
    }

    // buffer to hold the final results
    const globalResults = []

    // variables used to keep track of global positioning
    const parentPosition = {
      begin: 0,
      end: text.length
    }

    // these variables are used by the sentence splitting algorithm
    let buffer = []
    let isEnding = false
    let sentenceIndex = 0

    // important: we use the native UTF-8 character iterator
    for (const character of input) {

      // basically tell if a character is a dot or a space, with a twist:
      // we also need to handle line returns, !, ?, non-western punctuation..
      const isBreakingChar = ~sentenceEndingChars.indexOf(character)
      const isSpacingChar = ~spacingChars.indexOf(character)

      // this is how we handle sequences such as "what?!!"
      // basically if we detect a sentence ending character, we continue to read
      // the rest until we detect we are back on a "normal" character path again
      if(isEnding && !(isBreakingChar || isSpacingChar)) {
        isEnding = false
        mainExtractionAlgorithm(buffer.join(''), sentenceIndex++, globalResults, parentPosition)
        buffer = []
        buffer.push(character)
        continue
      }

      // detect if we have an ending char after somewhat-looking sentence
      // sorry it's a bit vague, because there is no universal and formal
      // description here: eg. "Yes. I am." is two sentences, but "H. G. Wells"
      // is not. Also in Chinese this is even harder to tell that way
      // (no space or uppercase etc)
      if (buffer.length > 5 && isBreakingChar) {
        isEnding = true
      }

      buffer.push(character)
    }

    // let's check the buffer one more time after the loop
    // because even if text doesn't end with a dot, \0 still ends the sentence!
    mainExtractionAlgorithm(buffer.join(''), sentenceIndex++, globalResults, parentPosition)

    // my word is my word, even if it takes me a long time to give it
    return Promise.resolve(globalResults)
  }
}

module.exports = Treegram
module.exports.default = Treegram
module.exports.Treegram = Treegram
