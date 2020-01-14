"use strict";
var { fromEvent } = require("rxjs");
var { filter, map, share, takeUntil } = require("rxjs/operators");

function normalizeKeypressEvents(value, key) {
  return { value: value, key: key || {} };
}

module.exports = rl => {
  let exitKey = fromEvent(rl, "SIGINT").pipe(
    takeUntil(fromEvent(rl, "close"), share())
  );
  let keyPress = fromEvent(rl.input, "keypress", normalizeKeypressEvents).pipe(
    takeUntil(exitKey),
    filter(({ key }) => key.name !== "enter" || key.name !== "return")
  );
  let line = fromEvent(rl, "line");
  let exit = fromEvent(rl, "close");
  let ordinaryKey = fromEvent(rl.input, "keypress", normalizeKeypressEvents);

  let normalizedUpKey = keyPress.pipe(
    filter(
      ({ key }) =>
        key.name === "up" || key.name === "k" || (key.name === "p" && key.ctrl)
    ),
    share()
  );

  let normalizedDownKey = keyPress.pipe(
    filter(
      ({ key }) =>
        key.name === "down" ||
        key.name === "j" ||
        (key.name === "n" && key.ctrl)
    ),
    share()
  );

  let numberKey = keyPress.pipe(
    filter(({ value }) => value && value.match(/[0-9]/g)),
    map(e => e.value),
    share()
  );
  let spaceKey = keyPress.pipe(
    filter(({ key }) => key && key.name === "space"),
    share()
  );
  let aKey = keyPress.pipe(
    filter(({ key }) => key && key.name === "a"),
    share()
  );
  let iKey = keyPress.pipe(
    filter(({ key }) => key && key.name === "i"),
    share()
  );

  return {
    line,
    keyPress,
    normalizedUpKey,
    normalizedDownKey,
    numberKey,
    spaceKey,
    aKey,
    iKey,
    exit,
    exitKey,
    ordinaryKey
  };
};
