'use strict';
/**
 * Sticky bottom bar user interface
 */

var through = require('through');
var Base = require('../utils/base');
var rlUtils = require('../utils/readline');
var _ = require('lodash');

class BottomBar extends Base {
  constructor(opt) {
    opt = opt || {};
    super(opt);
    this.log = through(this.writeLog.bind(this));
    this.bottomBar ='';
    this.render();
  }

  /**
   * Render the prompt to screen
   * @return {BottomBar} self
   */

  render() {
    this.write(this.bottomBar);
    return this;
  }

  clean() {
    rlUtils.clearLine(this.parent.rl, this.bottomBar.split('\n').length);
    return this;
  }

  /**
   * Update the bottom bar content and rerender
   * @param  {String} bottomBar Bottom bar content
   * @return {BottomBar}           self
   */

  updateBottomBar(bottomBar) {
    rlUtils.clearLine(this.parent.rl, 1);
    this.parent.rl.output.unmute();
    this.clean();
    this.bottomBar = bottomBar;
    this.render();
    this.parent.rl.output.mute();
    return this;
  }

  /**
   * Write out log data
   * @param {String} data - The log data to be output
   * @return {BottomBar} self
   */

  writeLog(data) {
    this.parent.rl.output.unmute();
    this.clean();
    this.parent.rl.output.write(this.enforceLF(data.toString()));
    this.render();
    this.parent.rl.output.mute();
    return this;
  }

  /**
   * Make sure line end on a line feed
   * @param  {String} str Input string
   * @return {String}     The input string with a final line feed
   */

  enforceLF(str) {
    return str.match(/[\r\n]$/) ? str : str + '\n';
  }

  /**
   * Helper for writing message in Prompt
   * @param {BottomBar} prompt  - The Prompt object that extends tty
   * @param {String} message - The message to be output
   */
  write(message) {
    var msgLines = message.split(/\n/);
    this.height = msgLines.length;

    // Write message to screen and setPrompt to control backspace
    this.parent.rl.setPrompt(_.last(msgLines));

    if (this.parent.rl.output.rows === 0 && this.parent.rl.output.columns === 0) {
      /* When it's a tty through serial port there's no terminal info and the render will malfunction,
         so we need enforce the cursor to locate to the leftmost position for rendering. */
      rlUtils.left(this.parent.rl, message.length + this.parent.rl.line.length);
    }

    this.parent.rl.output.write(message);
  }
}

module.exports = BottomBar;
