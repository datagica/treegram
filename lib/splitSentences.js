const sentenceEndingChars = [
  // '\n', never use this!

  // western
  '.','!','?',

  // japanese
  '。', '！','？',

  // arabic
  '؟',

  // hindi
  '|'
]

const spacingChars = [
  // western or generic
  ' ', '\n', '\r','\t',

  // japanese space
  '　'

]

const chunkEndingChars = [
  // western
  ':', ';',

  // japanese and chinese
  '：',

  // arabic
  '،'
]
/**
 * Split text into sentences, without removing spaces or punctuation
 *
 * UTF8 ready: it uses the String iterator and store chars in an array
 *
 *
 */
 /**
  * Split text into sentences, without removing spaces or punctuation
  *
  * UTF8 ready: it uses the String iterator and store chars in an array
  *
  *
  */
 function splitSentences(input) {

   const sentences = []
   let buffer = []
   let isEnding = false
   for (const character of input) {

     const isBreakingChar = ~sentenceEndingChars.indexOf(character)
     const isSpacingChar = ~spacingChars.indexOf(character)

     // this is how handle sequences such as "what?!!"
     // basically if we detect a sentence ending character, we continue to read
     // the rest until we detect we are back on a "normal" character path again
     if(isEnding && !(isBreakingChar || isSpacingChar)) {
       isEnding = false
       sentences.push(buffer.join(''))
       buffer = []
       buffer.push(character)
       continue
     }

     // detect an ending char
     // we try to avoid matching J. K. Rowling and H. G. Wells but
     // making an algorithm that works with multiple locales is hard: eg. some
     // have no spaces etc
     if (buffer.length > 4 && isBreakingChar) {
       isEnding = true
     }

     buffer.push(character)
   }

   const lastSentence = buffer.join('')
   if (lastSentence !== '') {
     sentences.push(lastSentence)
   }
   buffer = []
   return sentences
 }

/**
quick test:
console.log("sentences: "+JSON.stringify({
  a: splitSentences("hello world!! this is a test.\nIt works?"),
  b: splitSentences("では主にマル「。」について述べる。句点と読点（“、”）を合わせて句読点と呼ぶ。")
}, null, 2))
**/

module.exports = {
  sentenceEndingChars: sentenceEndingChars,
  spacingChars: spacingChars,
  chunkEndingChars: chunkEndingChars,
  splitSentences: splitSentences
}
