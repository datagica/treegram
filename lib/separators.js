
// TODO add more special characters:
// important: add japanese punctuation:
//https://en.wikipedia.org/wiki/Japanese_typographic_symbols#Brackets_and_quotation_marks

// https://ja.wikipedia.org/wiki/%E6%8B%AC%E5%BC%A7
// https://en.wikipedia.org/wiki/Bracket
// https://en.wikipedia.org/wiki/Comma
// https://en.wikipedia.org/wiki/Colon_(punctuation)
// https://en.wikipedia.org/wiki/Question_mark
// https://en.wikipedia.org/wiki/Quotation_mark
// https://en.wikipedia.org/wiki/Semicolon
// https://en.wikipedia.org/wiki/Slash_(punctuation)

const separators = [
  '0009', // character tabulation
  '000A', // line feed
  '000B', // line tabulation
  '000C', // form feed
  '000D', // carriage return
  '0020', // space
  '0021', // exclamation mark
  '0022', // quotation mark
  // '0027', // apostrophe is not used to split words (well not in our model)
  '0028', // left parenthesis
  '0029', // right parenthesis
  '002C', // comma
  '002E', // full stop (the "dot" .)
  '003A', // colon
  '003B', // semicolon
  '003F', // question mark
  '0085', // next line
  '00A0', // no-break space
  '00A7', // section sign
  '00B6', // pilcrow (paragraph mark, paragraph sign, paraph, alinea)
  '00B7', // interpunct
  '01C3', // latin letter retroflex click
  '02D0', // ipa triangular colon
  '1680', // ogham space mark
  '2000', // en quad
  '2001', // em quad
  '2002', // en space
  '2003', // em space
  '2004', // three-per-em space
  '2005', // four-per-em space
  '2006', // six-per-em space
  '2007', // figure space
  '2008', // punctuation space
  '2009', // thin space
  '200A', // hair space

  // OK actually we want to keep this one, it is part of some words
  // '2012', // figure dash

  '2013', // en dash
  '2014', // em dash
  '2015', // horizontal bar
  '201C', // left double quotation mark
  '201D', // right double quotation mark
  '201E', // double low-9 quotation mark
  '201F', // double high-reversed-9 quotation mark
  '2025', // japanese two-dots ellipsis
  '2026', // japanese three-dots ellipsis
  '2028', // line separator
  '2029', // paragraph separator
  '2047', // double question mark
  '2048', // question exclamation mark
  '2049', // exclamation question mark
  '202F', // narrow no-break space
  '205F', // medium mathematical space
  '203C', // double exclamation mark
  '2E0F', // paragraphos
  '3000', // ideographic space
  '3001', // ideographic comma
  '3002', // japanese full stop
  '300C', // left corner bracket (same meaning as an opening quote in chinese)
  '300D', // right corner bracket (same meaning as an ending quote in japanese)
  '300E', // left white corner bracket (same meaning as an opening quote in..?)
  '300F', // right white corner bracket (same meaning as an ending quote in..?)
  '303D', // japanese part alternation mark
  'FF08', // japanese pāren, or parenthesis: "（"
  'FF09', // japanese pāren, or parenthesis: "）"
  'FF1A', // full-width colon
  'FF1F', // full-width question mark
  'FE56', // small question mark
  'FE57', // small exclamation mark
  'FF01' // full-width exclamation mark
]

const SeparatorsPattern = separators.map(s => '\\u' + s)
const SeparatorsRegExp = new RegExp(SeparatorsPattern.join('|'), 'g')
const SpaceRegExp = new RegExp(' ', 'g')

// remove punctuation, spaces around a word..
const LightTrimPattern = separators.map(s => '\\u' + s)
const LightTrimRegExp = new RegExp(
  `^[ :\\s${LightTrimPattern.join('')}]+`+
  `|`+
  `[ :\\s${LightTrimPattern.join('')}]+$`
  , 'g')

  // remove punctuation, spaces around a word.. but also stuff like "c'est"
  const HardTrimPattern = separators.map(s => '\\u' + s)
  const HardTrimRegExp = new RegExp(
    `^[ :\\s${HardTrimPattern.join('')}]+`+
    `|`+
    `[ :\\s${HardTrimPattern.join('')}]+$`+
    `|`+
    `'s$` + // ex. the dog's ball
    `|`+
    `^qu'` + // ex. "qu'est-ce que"
    `|`+
    `^[tsdjlmcvnq]'` // ex. "d'habitude"
    , 'g')

module.exports = {
  separators: separators,
  SeparatorsPattern: SeparatorsPattern,
  SeparatorsRegExp: SeparatorsRegExp,
  SpaceRegExp: SpaceRegExp,

  LightTrimRegExp: LightTrimRegExp,
  HardTrimRegExp: HardTrimRegExp
}
