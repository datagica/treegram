/**
 * tailors this:
 * ['', '', '', 'ok', '', '', 'this', 'is', 'ok', '', '']
 *
 * into this:
 * ['ok', '', '', 'this', 'is', 'ok']
 *
 */
function trimArray(arr){
    let i, j
    for (i = 0; i < arr.length && !arr[i].length; i++) {}
    for (j = arr.length - 1; j > 0 && !arr[j].length; j--) {}
    return arr.slice(i, j + 1)
 }

 module.exports = trimArray
