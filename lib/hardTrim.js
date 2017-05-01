
'use strict'

const { HardTrimRegExp } = require('./separators')

function hardTrim(gram) {
  return gram.replace(HardTrimRegExp, ' ').trim()
}

module.exports = hardTrim
