const {
    Spinner
} = require("clui");

module.exports = msg => new Spinner(msg, ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]);