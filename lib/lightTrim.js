
'use strict'

const { LightTrimRegExp } = require('./separators')

function lightTrim (input) {
  LightTrimRegExp.lastIndex = 0
  return input.replace(LightTrimRegExp, ' ').trim()
}

module.exports = lightTrim
