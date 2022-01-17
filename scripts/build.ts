import * as path from "path";
import { IO } from "../src/IO/fluent";
import * as Fs from "./Fs";
import * as P from "child_process";

const DIST = "dist";
const PKG = "package.json";

const FILES = ["README.md", "LICENSE"];

const exec = (cmd: string, args?: P.ExecOptions): IO<Error, void> =>
  IO.async((onE, onS) => P.exec(cmd, args, (err) => (err !== null ? onE(err) : onS())));

const copyFiles = IO.do(function* (_) {
  yield* _(IO.forEach(FILES)((from) => Fs.copyFile(from, path.join(DIST, from))));
});

const copyPackageJson = IO.do(function* (_) {
  const pkg = yield* _(Fs.readFile(PKG, "utf-8"));
  const json = yield* _(IO.tryCatch(() => JSON.parse(pkg)));
  delete json.scripts;
  delete json.devDependencies;
  yield* _(Fs.writeFile(path.join(DIST, PKG), JSON.stringify(json, null, 2)));
});

IO.do(function* (_) {
  yield* _(exec("yarn tsc -p tsconfig-build.json"));
  yield* _(copyPackageJson);
  yield* _(copyFiles);
}).unsafeRunAsyncOrDie(
  (e) => console.error("Unable to build module", e),
  () => console.log("Successfully built module")
);
