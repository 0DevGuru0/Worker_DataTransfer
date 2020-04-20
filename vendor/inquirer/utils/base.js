/**
 * Base interface class other can inherits from
 */

class BaseUI {
  constructor(parent) {
    // opt is `this` argument of interface
    this.parent = parent;
    this.parent.rl.resume();
  }

  close() {
    this.parent.rl.removeListener("SIGINT", this.close);
    process.removeListener("exit", this.close);
    // unmute the mute-stream Package
    this.parent.rl.output.unmute();
    // close prompt from each source
    if (this.activePrompt && typeof this.activePrompt.close === "function") {
      this.activePrompt.close();
    }
  }
}

module.exports = BaseUI;
