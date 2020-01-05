const _progress = require("cli-progress");

// run the example sequentially! otherwise both will write to stdout/stderr simultaneous !
Example1(() => console.log("finished"));
function Example1(onComplete) {
  // create new progress bar using default values
  const b1 = new _progress.Bar();
  b1.start(200, 0);

  // the bar value - will be linear incremented
  let value = 0;

  // 20ms update rate
  const timer = setInterval(function() {
    // increment value
    value++;

    // update the bar value
    b1.update(value);

    // set limit
    if (value >= b1.getTotal()) {
      // stop timer
      clearInterval(timer);

      b1.stop();

      // run complete callback
      onComplete.apply(this);
    }
  }, 20);
}

function Example2(onComplete) {
  // EXAMPLE 2 ---------------------------------------------
  console.log("\nExample 2 - Custom configuration");

  // create new progress bar using default values
  const b2 = new _progress.Bar({
    barCompleteChar: "#",
    barIncompleteChar: "_",
    format: " |- Current Upload Progress: {percentage}%" + " - " + "||{bar}||",
    fps: 5,
    stream: process.stdout,
    barsize: 30
  });
  b2.start(100, 0);

  // 50ms update rate
  const timer = setInterval(function() {
    // increment value
    b2.increment();

    // set limit
    if (b2.value >= b2.getTotal()) {
      // stop timer
      clearInterval(timer);

      b2.stop();

      // run complete callback
      onComplete.apply(this);
    }
  }, 50);
}

function Example3(onComplete) {
  // EXAMPLE 3 ---------------------------------------------
  console.log("\nExample 3 - Stop the Bar Automatically");
  // create new progress bar using default values
  const b3 = new _progress.Bar({
    stopOnComplete: true,
    clearOnComplete: true
  });
  b3.start(200, 0);

  // the bar value - will be linear incremented
  let value = 0;

  // 20ms update rate
  const timer = setInterval(function() {
    // increment value
    value++;

    // update the bar value
    b3.update(value);

    // set limit
    if (value >= b3.getTotal()) {
      // stop timer
      clearInterval(timer);

      // run complete callback
      onComplete.apply(this);
    }
  }, 20);
}

function Example4(onComplete) {
  // EXAMPLE 1 ---------------------------------------------
  console.log("\nExample 4 - Start ZERO");
  // create new progress bar using default values
  const b1 = new _progress.Bar();
  b1.start(0, 0);

  setTimeout(function() {
    b1.stop();

    // run complete callback
    onComplete.apply(this);
  }, 1000);
}

function Example5(onComplete) {
  // EXAMPLE 5 ---------------------------------------------
  console.log("\nExample 5 - Custom Payload");
  // create new progress bar
  const b1 = new _progress.Bar({
    format:
      "progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Speed: {speed}"
  });

  // initialize the bar -  defining payload token "speed" with the default value "N/A"
  b1.start(200, 0, {
    speed: "N/A"
  });

  // the bar value - will be linear incremented
  let value = 0;

  const speedData = [];

  // 20ms update rate
  let timer = setInterval(function() {
    // increment value
    value++;

    // example speed data
    speedData.push(Math.random() * 2 + 5);
    const currentSpeedData = speedData.splice(-10);

    // update the bar value
    b1.update(value, {
      speed:
        (
          currentSpeedData.reduce(function(a, b) {
            return a + b;
          }, 0) / currentSpeedData.length
        ).toFixed(2) + "mb/s"
    });

    // set limit
    if (value >= b1.getTotal()) {
      // stop timer
      clearInterval(timer);

      b1.stop();

      // run complete callback
      onComplete.apply(this);
    }
  }, 20);
}

function Example6(onComplete) {
  // EXAMPLE 1 ---------------------------------------------
  console.log("\nExample 6 - Set dynamically the total progress");
  // create new progress bar using default values
  const b1 = new _progress.Bar({}, _progress.Presets.shades_grey);
  b1.start(200, 0);

  // the bar value - will be linear incremented
  let value = 0;

  // 50ms update rate
  const timer = setInterval(function() {
    // increment value
    value++;

    // update the bar value
    b1.update(value);

    // change the total value
    if (value > 1500) {
      b1.setTotal(3000);
    } else if (value > 150) {
      b1.setTotal(2000);
    }

    // limit reached ?
    if (value >= b1.getTotal()) {
      // stop timer
      clearInterval(timer);

      b1.stop();

      // run complete callback
      onComplete.apply(this);
    }
  }, 15);
}
