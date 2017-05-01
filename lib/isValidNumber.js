'use strict'

function isValidNumber(ref) {
  return typeof ref === 'number' && !isNaN(ref) && isFinite(ref)
}

module.exports = isValidNumber
