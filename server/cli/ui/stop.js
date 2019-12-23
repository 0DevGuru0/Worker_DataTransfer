const col = require('chalk');
const { Spinner } = require('clui');

const auto_all = require('../components/start/transfer/auto/all'),
    auto_bucket = require('../components/start/transfer/auto/bucket'),
    manualTransfer = require('../components/start/transfer/manual');

module.exports = (parent,str) => {
    let all    = auto_all().initialize()
    let bucket = auto_bucket().initialize()
    let Manual = manualTransfer().initialize()

    if (all || bucket || Manual) {
        let question = col.green("? ") + col.bold.white('Do yo really want to stop operation?') + col.gray(" [Y]Yes/[N]No");
        let answer = ans =>{
             let regex = /((yes)|[y])\b/gmi;
            if (regex.test(ans)) {
                let stopping = new Spinner(
                    'Stopping the Transfer Operation...',
                    ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
                );
                stopping.start()
                if (Manual) {
                    manualTransfer().stop().then(() => {
                        stopping.stop()
                        process.stdout.write('\n');
                        console.log(col.black.bold.bgGreen('Transfer Operation turned off.'))
                        parent.rl.prompt()
                    })
                }
                if (all) {
                    auto_all.stop().then(() => {
                        stopping.stop()
                        process.stdout.write('\n');
                        console.log(col.black.bold.bgGreen('AutoMatic Transfer turned off.'))
                        parent.rl.prompt()
                    })
                }
                if (bucket) {
                    auto_bucket().stop().then(() => {
                        stopping.stop()
                        process.stdout.write('\n');
                        console.log(col.black.bold.bgGreen('AutoMatic Transfer turned off.'))
                        parent.rl.prompt()
                    })
                }
            }
        }
        parent.rl.question(question, answer)
    } else { !str ? console.log('no Operation or Interval has been set Yet') : ''}
}