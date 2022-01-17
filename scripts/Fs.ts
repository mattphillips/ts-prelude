import * as fs from "fs";

import { IO } from "../src/IO/fluent";

export const readFile = IO.ioify<fs.PathLike, BufferEncoding, NodeJS.ErrnoException, string>(fs.readFile);
export const writeFile = IO.ioify<fs.PathLike, string, NodeJS.ErrnoException, void>(fs.writeFile);
export const copyFile = IO.ioify<fs.PathLike, fs.PathLike, NodeJS.ErrnoException, void>(fs.copyFile);
export const mkdir = IO.ioify<fs.PathLike, NodeJS.ErrnoException, void>(fs.mkdir);
export const rmDir = IO.ioify<fs.PathLike, fs.RmDirOptions, NodeJS.ErrnoException, void>(fs.rm);
