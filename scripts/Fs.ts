import * as fs from "fs";
import * as G from "glob";

import { IO } from "../src/IO/fluent";

// TODO: Inline this on IO
function ioify<L, R>(f: (cb: (e: L | null | undefined, r?: R) => void) => void): () => IO<L, R>;
function ioify<A, L, R>(f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void): (a: A) => IO<L, R>;
function ioify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => IO<L, R>;
function ioify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => IO<L, R>;
function ioify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => IO<L, R>;
function ioify<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => IO<L, R>;
function ioify<E, A>(f: Function): () => IO<E, A> {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return IO.async<E, A>((onE, onS) => {
      const cbResolver = (e: E, r: A) => {
        return e != null ? onE(e) : onS(r);
      };
      f.apply(null, args.concat(cbResolver));
    });
  };
}
export const copyFile = ioify<fs.PathLike, fs.PathLike, NodeJS.ErrnoException, void>(fs.copyFile);
export const mkdir = ioify<fs.PathLike, NodeJS.ErrnoException, void>(fs.mkdir);
export const rmDir = ioify<fs.PathLike, fs.RmDirOptions, NodeJS.ErrnoException, void>(fs.rm);
export const glob = ioify<string, Error, ReadonlyArray<string>>(G);
