import * as path from "path";
import { IO } from "../src/IO/fluent";
import * as Fs from "./Fs";

const SRC = "src";
const DIST = "dist";

const FILES = ["package.json", "README.md", "LICENSE"];
const IO_FILES = ["fluent.js", "fluent.d.ts", "index.js", "index.d.ts"];

const makeDist = IO.do(function* (_) {
  yield* _(Fs.rmDir(DIST, { recursive: true }).handleError(() => undefined));
  yield* _(Fs.mkdir(DIST));
});

const makeIODir = IO.do(function* (_) {
  const destination = path.join(DIST, "IO");
  yield* _(Fs.mkdir(destination));
  yield* _(IO.forEach(IO_FILES)((from) => Fs.copyFile(`${SRC}/IO/${from}`, path.join(destination, from))));
});

const copyFiles = IO.do(function* (_) {
  yield* _(IO.forEach(FILES)((from) => Fs.copyFile(from, path.join(DIST, from))));
});

const copySrc = IO.do(function* (_) {
  const files = yield* _(Fs.glob(`${SRC}/*.js`));
  yield* _(IO.forEach([...files])(copyModule));
});

const copyModule = (file: string) =>
  IO.do(function* (_) {
    const destination = file.replace(SRC, DIST);
    yield* _(Fs.copyFile(file, destination));
    yield* _(Fs.copyFile(file.replace(".js", ".d.ts"), destination.replace(".js", ".d.ts")));
  });

IO.do(function* (_) {
  yield* _(makeDist);
  yield* _(copyFiles);
  yield* _(makeIODir);
  yield* _(copySrc);
}).unsafeRunAsyncOrDie(
  (e) => console.error("Unable to build module", e),
  () => console.log("Successfully built module")
);
