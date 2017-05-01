
'use strict'

const { TrimRegExp } = require('./separators')

function trimClean(gram) {
  return gram.replace(TrimRegExp, ' ').trim()
}

module.exports = trimClean
