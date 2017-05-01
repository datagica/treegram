'use strict'

// wraps entities found in the text
// entities must match the input text
function replaceEntities(txt, entities, wrapper) {
  return ([].concat(entities)).sort((a, b) => {
    return a.position.begin - b.position.begin
  }).reduce((acc, entity) => {
    const wrap = wrapper(entity)
    const begin = acc.delta + entity.position.begin
    const end   = acc.delta + entity.position.end
    //console.log("\ndelta: "+acc.delta+", begin: "+begin+", end: "+end+", len: "+wrap.length)
    acc.buffer = acc.buffer.slice(0, begin) + wrap + acc.buffer.slice(end)
    //console.log("buffer: "+acc.buffer)
    acc.delta = acc.delta + wrap.length - entity.ngram.length
    //console.log("new delta: "+acc.delta)
    return acc
  }, {
    buffer: txt,
    delta: 0
  })
}

module.exports = replaceEntities
