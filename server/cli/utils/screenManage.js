'use strict'
const _ = require('lodash'),
    util = require('./readline'),
    cliWidth = require('cli-width'),
    stripAnsi = require('strip-ansi'),
    stringWidth = require('string-width');

class ScreenManager {
    constructor(rl){
        this.height = 0;
        this.extraLinesUnderPrompt = 0;
        this.rl = rl;
    }
    render(content,bottomContent){
        // this.rl.output.unmute();
        this.clean(this.extraLinesUnderPrompt);

        let promptLine = lastLine(content);
        let rawPromptLine = stripAnsi(promptLine);
        let prompt = rawPromptLine;
        // if(this.rl.line.length) prompt = prompt.slice(0,-this.rl.line.length)
        
        this.rl.setPrompt(prompt);

        let cursorPos   = this.rl._getCursorPos();
        let width       = this.normalizeCliWidth();

        content = this.forceLineReturn(content,width);
        if(bottomContent) bottomContent = this.forceLineReturn(bottomContent,width);

        if(rawPromptLine.length % width === 0 ) content += '\n';
        let fullContent = content + (bottomContent ? '\n'+bottomContent : '' );
        process.stdout.write(fullContent);
        
        let promptLineUpDiff = Math.floor( rawPromptLine.length / width ) - cursorPos.rows;
        let bottomContentHeight = promptLineUpDiff + ( bottomContent ? height(bottomContent) : 0 );

        if( bottomContent > 0 ) util.up(this.rl,bottomContentHeight);

        util.left(this.rl,stringWidth(lastLine(fullContent)));

        if(cursorPos.cols > 0) util.right(this.rl,cursorPos.cols);
        
        this.extraLinesUnderPrompt = bottomContentHeight;
        this.height = height(fullContent);

        // this.rl.output.mute();
    }
    clean(extraLines){
        extraLines>0 
            ? util.down(this.rl,extraLines)
            : util.clearLine(this.rl,this.height);
    }
    done(){
        this.rl.setPrompt('');
        // this.rl.output.unmute();
        process.stdout.write('\n');
    }
    releaseCursor(){
        if( this.extraLinesUnderPrompt > 0 ) util.down(this.rl,this.extraLinesUnderPrompt)
    }
    normalizeCliWidth(){
        return cliWidth({ defaultWidth:80, output:process.stdout })
    }
    breakLines(lines,width){
        width = width || this.normalizeCliWidth();
        var regex = new RegExp('(?:(?:\\033[[0-9;]*m)*.?){1,' + width + '}', 'g');
        return lines.map(line=>{
            let chunk = line.match(regex);
            chunk.pop();
            return chunk || '';
        });
    }
    forceLineReturn(content,width){
        width = width || this.normalizeCliWidth();
        return _.flatten(this.breakLines(content.split('\n'),width)).join('\n')
    }
} 
function lastLine(content)  { return _.last(content.split('\n')); }
function height(content)    { return content.split('\n').length;  }

module.exports = ScreenManager