
'use strict'

const { HardTrimRegExp } = require('./separators')

function hardTrim(gram) {
  HardTrimRegExp.lastIndex = 0
  return gram.replace(HardTrimRegExp, ' ').trim()
}

module.exports = hardTrim
