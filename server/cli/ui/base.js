const cliWidth = require('cli-width'),
    ttys = require('ttys');

class BaseUI {
    constructor() {
        this.width = cliWidth({
            defaultWidth: 80,
            output: ttys.output
        })
        process.stdout.on('resize', () => {
            this.width = cliWidth({
                defaultWidth: 80,
                output: ttys.output
            })
        });
    }
    centered(str, width = this.width) {
        if (width > this.width) width = this.width + 15
        let leftPadding = Math.floor((width - str.length) / 2)
        let line = "";
        for (let i = 0; i < leftPadding; i++) {
            line += " "
        }
        line += str
        console.log(line)
    }
    horizontalLine(width = this.width) {
        if (width > this.width) width = this.width
        let line = "";
        for (let i = 0; i < width; i++) {
            line += clc.bold("-")
        }
        console.log(line)
    }
    verticalSpace() {
        console.log('\n')
    }
}
module.exports = BaseUI;