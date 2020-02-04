import { take, map, combineAll, tap } from "rxjs/operators";
import { interval, fromEvent } from "rxjs";
console.clear();

let op1 = (x, y) =>
  interval(1000).pipe(
    take(10),
    tap(z => `Result ${x},${y},${z}`)
  );

let op2 = x => interval(500).pipe(map(y => op1(x, y)));

let source = interval(700).pipe(map(op2));

source.pipe(combineAll()).subscribe(console.log);
