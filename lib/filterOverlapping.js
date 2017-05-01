'use strict'

function filterOverlapping(seq) {
  return seq.filter(function(item) {

    // if the keyword is a meta-keyword, not a single keyword concept
    // it is a 'ghost' that doesn't collide with other words, because it
    // actually built from various unrelated words, that only make sense
    // and represent a concept when used together. So we do not check
    // collision.
    // Yes, the property name is kinda lame at the moment. Sorry.
    if (
      typeof item.minimum_hits_required === 'number' &&
      item.minimum_hits_required > 1
    ) { return true }

    let keep = true

    for (let i = 0; i < seq.length && keep; i++) {

      const item2 = seq[i]

      // OK, I disabled this line and this solved the "duplicate item" bug
      //if (item2.ngram === item.ngram) return;

      // if the other word is a ghost, we also ignore it
      if (typeof item2.minimum_hits_required === 'number' &&
        item2.minimum_hits_required > 1
      ) { continue }

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
         item.realPosition.end <= item2.realPosition.end)
      // debug("  item2 included within item1? " + overlap)
      if (!overlap) { continue }
      // debug(`  item1: ${JSON.stringify(item)}, item2: ${JSON.stringify(item2)}`)

      if (item.score < item2.score) {
        // debug("item.score > item2.score: trashing the one ngram too approximative")
        keep = false
      } else if (item.score > item2.score) {
        //debug("item.score < item2.score")
        //keep = true
      } else if (item.realArity > item2.realArity) {
        //debug("item.realArity > realArity.arity")
        //keep = true
      } else if (item.realArity < item2.realArity) {
        // debug("item.realArity < item2.realArity: trashing the one ngram wich is too narrow")
        keep = false //
      } else if (item.arity < item2.arity) {
        //debug("item.arity < item2.arity")
        // keep = true

      } else if (item.arity > item2.arity) {
        // debug("item.arity > item2.arity: trashing the one ngram with vacuum around itself")

        keep = false
      } else {
        // note: we are probably just colliding with ourself
        // debug(`  collision between '${JSON.stringify(item)}' and '${JSON.stringify(item2)}', choosing one arbitrarily`)
        //keep = true
        //keep = true
      }

    }

    //console.log("do we keep " + item.ngram + "? " + keep)
    return keep
  }).sort(function (a, b) {
    if (a.realArity == b.realArity) {
      return b.score - a.score // want most words first
    } else {
      return b.realArity - a.realArity // want biggest first
    }
  })
}

module.exports = filterOverlapping
