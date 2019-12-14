'use strict'

let col = require('chalk');
let fig = require('figures');

/**
 * Separator object
 * Used to space/separate choices group
 * @constructor
 * @param {String} line   Separation line content (facultative)
 */

class Separator { 
    constructor(line){
        this.type = 'separator';
        this.line = col.bold.italic.bgYellowBright.black.dim(line || new Array(15).join(fig.ellipsis));
    }
    toString(){
        return this.line
    }
}
Separator.exclude = obj=> obj.type !== 'separator'

module.exports = Separator;