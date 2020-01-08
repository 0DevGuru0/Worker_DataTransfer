const _ = require('Lodash'),
    fig = require('figures')
col = require('chalk');

module.exports = (logBucket, section, message) =>_.join([
        col.red(fig.warning),
        col.red('[' + logBucket + ']'),
        col.white.bgRed("[ERROR]"),
        col.bold.red('[' + section + ']'),
        col.bold(message.message)
    ], ' ')