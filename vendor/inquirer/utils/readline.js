'use strict'

const ansi = require('ansi-escapes')

module.exports = {
    up          :(rl,x)=>rl.output.write(ansi.cursorUp(x)),
    down        :(rl,x)=>rl.output.write(ansi.cursorDown(x)),
    right       :(rl,x)=>rl.output.write(ansi.cursorForward(x)),
    left        :(rl,x)=>rl.output.write(ansi.cursorBackward(x)),
    clearLine   :(rl,x)=>rl.output.write(ansi.eraseLines(x))
}