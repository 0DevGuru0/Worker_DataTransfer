'use strict'

const ansi = require('ansi-escapes')

module.exports = {
    up          :(rl,x)=>process.stdout.write(ansi.cursorUp(x)),
    down        :(rl,x)=>process.stdout.write(ansi.cursorDown(x)),
    right       :(rl,x)=>process.stdout.write(ansi.cursorForward(x)),
    left        :(rl,x)=>process.stdout.write(ansi.cursorBackward(x)),
    clearLine   :(rl,x)=>process.stdout.write(ansi.eraseLines(x))
}