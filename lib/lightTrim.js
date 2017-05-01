
'use strict'

const { TrimRegExp } = require('./separators')

function lightTrim(gram) {
  return gram.replace(TrimRegExp, ' ').trim()
}

module.exports = lightTrim
