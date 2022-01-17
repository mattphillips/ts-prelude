import { pipe } from "fp-ts/lib/function";
import * as IO from "src/IO";
import { Maybe } from "src/Maybe";
import { Result } from "src/Result";

const nodeStyleCallbackSuccess = (args: 42, cb: (err: number | null, data?: number) => void) => {
  cb(null, args);
};

describe("IO", () => {
  describe.each`
    title                             | io
    ${"Succeed"}                      | ${IO.succeed(42)}
    ${"Sync () -> value"}             | ${IO.sync(() => 42)}
    ${"Suspend () -> Succeed"}        | ${IO.suspend(() => IO.succeed(42))}
    ${"fromMaybe(Just(value))"}       | ${IO.fromMaybe(null)(Maybe.just(42))}
    ${"fromNullable(value)"}          | ${IO.fromNullable(null)(42)}
    ${"fromResult(Ok(value))"}        | ${IO.fromResult(Result.ok(42))}
    ${"Async.onSuccess"}              | ${IO.async((_, onSuccess) => onSuccess(42))}
    ${"TryCatch"}                     | ${IO.tryCatch(() => 42)}
    ${"fromPromise(Promise.resolve)"} | ${IO.fromPromise(() => Promise.resolve(42))}
    ${"fromPromiseOrDie"}             | ${IO.fromPromiseOrDie(() => Promise.resolve(42))}
    ${"ioify"}                        | ${IO.ioify(nodeStyleCallbackSuccess)(42)}
  `("$title", ({ io }: { io: IO.IO<number, number> }) => {
    test(".unsafeRunAsync", () => {
      expect.assertions(1);
      expectSuccess((value) => expect(value).toEqual(42))(io);
    });

    test(".map", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.map((a) => a * 2),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".flatMap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap((a) => IO.succeed(a * 2)),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".flatMapW", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMapW((a) => IO.succeed(a * 2)),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".flapMap -> IO.fail", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap((a) => IO.fail(-1)),
        expectError((value) => expect(value).toBe(-1))
      );
    });

    test(".mapError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.mapError((a) => a * 2),
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".catchError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.catchError((a) => IO.fail(a * 2)),
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".handleError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.handleError((a) => a * 2),
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".flatHandleError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatHandleError((a) => IO.succeed(a * 2)),
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".flatMap -> .catchError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap((a) => IO.fail<number, number>(a)),
        IO.catchError(() => IO.succeed(-1)),
        expectSuccess((value) => expect(value).toEqual(-1))
      );
    });

    test(".flatMap(succeed) -> .flatMap(fail) -> .catchError(succeed)", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap((a) => IO.succeed<number, number>(a * 2)),
        IO.flatMap((a) => IO.fail<number, number>(a * 2)),
        IO.catchError((e) => IO.succeed(e * 2)),
        expectSuccess((value) => expect(value).toEqual(336))
      );
    });

    test(".flatMap(succeed) -> .flatMap(succeed) -> .catchError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap((a) => IO.succeed<number, number>(a * 2)),
        IO.flatMap((a) => IO.succeed<number, number>(a * 2)),
        IO.catchError(() => IO.succeed(-1)),
        expectSuccess((value) => expect(value).toEqual(168))
      );
    });

    test(".bimap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.bimap(
          () => -1,
          (a) => a * 2
        ),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".biFlatMap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.biFlatMap(
          () => IO.fail(-1),
          (a) => IO.succeed(a * 2)
        ),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".tap", () => {
      expect.assertions(3);
      const cb = jest.fn();
      pipe(
        io,
        IO.tap(cb),
        expectSuccess((value) => {
          expect(cb).toHaveBeenCalledTimes(1);
          expect(cb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".tapError", () => {
      expect.assertions(2);
      const cb = jest.fn();
      pipe(
        io,
        IO.tapError(cb),
        expectSuccess((value) => {
          expect(cb).not.toHaveBeenCalled();
          expect(value).toEqual(42);
        })
      );
    });

    test(".biTap", () => {
      expect.assertions(4);
      const errorCb = jest.fn();
      const succeedCb = jest.fn();
      pipe(
        io,
        IO.biTap(errorCb, succeedCb),
        expectSuccess((value) => {
          expect(errorCb).not.toHaveBeenCalled();
          expect(succeedCb).toHaveBeenCalledTimes(1);
          expect(succeedCb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".flatTap", () => {
      expect.assertions(3);
      const cb = jest.fn().mockReturnValue(io);
      pipe(
        io,
        IO.flatTap(cb),
        expectSuccess((value) => {
          expect(cb).toHaveBeenCalledTimes(1);
          expect(cb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".flatTapError", () => {
      expect.assertions(2);
      const cb = jest.fn();
      pipe(
        io,
        IO.flatTapError(cb),
        expectSuccess((value) => {
          expect(cb).not.toHaveBeenCalled();
          expect(value).toEqual(42);
        })
      );
    });

    test(".biFlatTap", () => {
      expect.assertions(4);
      const errorCb = jest.fn();
      const succeedCb = jest.fn().mockReturnValue(io);
      pipe(
        io,
        IO.biFlatTap(errorCb, succeedCb),
        expectSuccess((value) => {
          expect(errorCb).not.toHaveBeenCalled();
          expect(succeedCb).toHaveBeenCalledTimes(1);
          expect(succeedCb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".filter", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.filter(() => true, -1),
        expectSuccess((value) => expect(value).toEqual(42))
      );
      pipe(
        io,
        IO.filter(() => false, -1),
        expectError((value) => expect(value).toEqual(-1))
      );
    });

    test(".filterWith", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.filterWith(
          () => true,
          () => -1
        ),
        expectSuccess((value) => expect(value).toEqual(42))
      );
      pipe(
        io,
        IO.filterWith(
          () => false,
          () => -1
        ),
        expectError((value) => expect(value).toEqual(-1))
      );
    });

    test(".refine", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.refine((a): a is 42 => a == 42, -1),
        expectSuccess((value) => expect(value).toEqual(42))
      );
      pipe(
        io,
        IO.refine((a): a is 40 => a == 40, -1),
        expectError((value) => expect(value).toEqual(-1))
      );
    });

    test(".refineErrorOrDie", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.refineErrorOrDie(() => Maybe.nothing),
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".merge", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.merge,
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".fold", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.fold(
          () => -1,
          (a) => a * 2
        ),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".toPromise", () => {
      expect.assertions(1);
      return pipe(io, IO.toPromise, (p) => p.then((n) => expect(n).toBe(42)));
    });

    test(".orDie", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.orDie,
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".toUnit", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.toUnit,
        expectSuccess((value) => expect(value).toEqual(undefined))
      );
    });

    test(".nothing", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.nothing,
        expectSuccess((value) => expect(value).toEqual(undefined))
      );
    });

    test.todo(".delay");
  });

  const throwsError = () => {
    throw 42;
  };
  const nodeStyleCallbackFailure = (args: 42, cb: (err: number | null, data?: number) => void) => {
    cb(args);
  };

  describe.each`
    title                            | io
    ${"Fail"}                        | ${IO.fail(42)}
    ${"SyncFail () -> value"}        | ${IO.syncFail(() => 42)}
    ${"Suspend () -> IO.Fail"}       | ${IO.suspend(() => IO.fail(42))}
    ${"fromMaybe(Maybe.nothing)"}    | ${IO.fromMaybe(42)(Maybe.nothing)}
    ${"fromNullable(null)"}          | ${IO.fromNullable(42)(null)}
    ${"fromNullable(undefined)"}     | ${IO.fromNullable(42)(undefined)}
    ${"fromResult(Error(value))"}    | ${IO.fromResult(Result.error(42))}
    ${"Async.onFailure"}             | ${IO.async((onFailure) => onFailure(42))}
    ${"fromPromise(Promise.reject)"} | ${IO.fromPromise(() => Promise.reject(42))}
    ${"TryCatch"}                    | ${IO.tryCatch(throwsError)}
    ${"ioify"}                       | ${IO.ioify(nodeStyleCallbackFailure)(42)}
  `("$title", ({ io }: { io: IO.IO<number, number> }) => {
    test(".unsafeRunAsync", () => {
      expect.assertions(1);
      expectError((value) => expect(value).toEqual(42))(io);
    });

    test(".map", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.map((a) => a * 2),
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".flatMap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap((a) => IO.succeed(a * 2)),
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".flatMapW", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMapW((a) => IO.succeed(a * 2)),
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".catchError -> IO.succeed", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.catchError((a) => IO.succeed(-1)),
        expectSuccess((value) => expect(value).toBe(-1))
      );
    });

    test(".mapError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.mapError((a) => a * 2),
        expectError((value) => expect(value).toEqual(84))
      );
    });

    test(".catchError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.catchError((a) => IO.fail(a * 2)),
        expectError((value) => expect(value).toEqual(84))
      );
    });

    test(".handleError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.handleError((a) => a * 2),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".flatHandleError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatHandleError((a) => IO.succeed(a * 2)),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".catchError -> .flatMap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.catchError((e) => IO.fail(e * 2)),
        IO.flatMap(() => IO.succeed<number, number>(-1)),
        expectError((value) => expect(value).toEqual(84))
      );
    });

    test(".flatMap -> .flatMap -> .catchError", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.flatMap(() => IO.succeed<number, number>(-1)),
        IO.flatMap(() => IO.succeed<number, number>(-1)),
        IO.catchError((e) => IO.fail(e * 2)),
        expectError((value) => expect(value).toEqual(84))
      );
    });

    test(".bimap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.bimap(
          (a) => a * 2,
          () => -1
        ),
        expectError((value) => expect(value).toEqual(84))
      );
    });

    test(".biFlatMap", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.biFlatMap(
          (a) => IO.fail(a * 2),
          () => IO.succeed(-1)
        ),
        expectError((value) => expect(value).toEqual(84))
      );
    });

    test(".tap", () => {
      expect.assertions(2);
      const cb = jest.fn();
      pipe(
        io,
        IO.tap(cb),
        expectError((value) => {
          expect(cb).not.toHaveBeenCalled();
          expect(value).toEqual(42);
        })
      );
    });

    test(".tapError", () => {
      expect.assertions(3);
      const cb = jest.fn();
      pipe(
        io,
        IO.tapError(cb),
        expectError((value) => {
          expect(cb).toHaveBeenCalledTimes(1);
          expect(cb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".biTap", () => {
      expect.assertions(4);
      const errorCb = jest.fn();
      const succeedCb = jest.fn();
      pipe(
        io,
        IO.biTap(errorCb, succeedCb),
        expectError((value) => {
          expect(succeedCb).not.toHaveBeenCalled();
          expect(errorCb).toHaveBeenCalledTimes(1);
          expect(errorCb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".flatTap", () => {
      expect.assertions(2);
      const cb = jest.fn();
      pipe(
        io,
        IO.flatTap(cb),
        expectError((value) => {
          expect(cb).not.toHaveBeenCalled();
          expect(value).toEqual(42);
        })
      );
    });

    test(".flatTapError", () => {
      expect.assertions(3);
      const cb = jest.fn().mockReturnValue(io);
      pipe(
        io,
        IO.flatTapError(cb),
        expectError((value) => {
          expect(cb).toHaveBeenCalledTimes(1);
          expect(cb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".biFlatTap", () => {
      expect.assertions(4);
      const errorCb = jest.fn().mockReturnValue(io);
      const succeedCb = jest.fn();
      pipe(
        io,
        IO.biFlatTap(errorCb, succeedCb),
        expectError((value) => {
          expect(succeedCb).not.toHaveBeenCalled();
          expect(errorCb).toHaveBeenCalledTimes(1);
          expect(errorCb).toHaveBeenCalledWith(42);
          expect(value).toEqual(42);
        })
      );
    });

    test(".filter", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.filter(() => true, -1),
        expectError((value) => expect(value).toEqual(42))
      );
      pipe(
        io,
        IO.filter(() => false, -1),
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".filterWith", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.filterWith(
          () => true,
          () => -1
        ),
        expectError((value) => expect(value).toEqual(42))
      );
      pipe(
        io,
        IO.filterWith(
          () => false,
          () => -1
        ),
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".refine", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.refine((a): a is number => true, -1),
        expectError((value) => expect(value).toEqual(42))
      );
      pipe(
        io,
        IO.refine((a): a is number => false, -1),
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".refineErrorOrDie", () => {
      expect.assertions(2);
      pipe(
        io,
        IO.refineErrorOrDie(() => Maybe.just(41)),
        expectError((value) => expect(value).toEqual(41))
      );
      pipe(
        IO.fail(42),
        IO.refineErrorOrDie(() => Maybe.nothing),
        expectDie((value) => expect(value).toEqual(42))
      );
    });

    test(".merge", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.merge,
        expectSuccess((value) => expect(value).toEqual(42))
      );
    });

    test(".fold", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.fold(
          (a) => a * 2,
          () => -1
        ),
        expectSuccess((value) => expect(value).toEqual(84))
      );
    });

    test(".toPromise", () => {
      expect.assertions(1);
      return pipe(io, IO.toPromise, (p) => p.catch((n) => expect(n).toBe(42)));
    });

    test(".orDie", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.orDie,
        expectDie((value) => expect(value).toEqual(42))
      );
    });

    test(".toUnit", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.toUnit,
        expectError((value) => expect(value).toEqual(42))
      );
    });

    test(".nothing", () => {
      expect.assertions(1);
      pipe(
        io,
        IO.nothing,
        expectDie((value) => expect(value).toEqual(42))
      );
    });

    test.todo(".delay");
  });
});

test(".fromPromiseOrDie", () => {
  expect.assertions(1);
  pipe(
    IO.fromPromiseOrDie(() => Promise.reject(42)),
    expectDie((value) => expect(value).toEqual(42))
  );
});

describe.each`
  constructor               | io
  ${"Succeed"}              | ${IO.succeed(1)}
  ${"Suspend() -> Succeed"} | ${IO.suspend(() => IO.succeed(1))}
  ${"Async(onSuccess)"}     | ${IO.async((_, onSuccess) => onSuccess(1))}
`("$constructor: flips to error channel", ({ io }: { io: IO.IO<number, number> }) => {
  test("no transformations", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.flip,
      expectError((e) => expect(e).toBe(1))
    );
  });

  test("`map` -> `mapError` -> `map`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.map((a) => a * 2),
      IO.mapError(() => -1),
      IO.map((a) => a * 2),
      IO.flip,
      expectError((value) => expect(value).toBe(4))
    );
  });

  test("`flatMap(succeed)` -> `flatMap(succeed)`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.flatMap((a) => IO.succeed(a * 2)),
      IO.flatMap((a) => IO.succeed(a * 2)),
      IO.flip,
      expectError((e) => expect(e).toBe(4))
    );
  });

  test("`flatMap(fail)` -> `catchError(succeed)` -> `flatMap(succeed)", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.flatMap<number, number, number>((a) => IO.fail(a * 2)),
      IO.catchError((a) => IO.succeed(a * 2)),
      IO.flatMap((a) => IO.succeed(a * 2)),
      IO.flip,
      expectError((e) => expect(e).toBe(8))
    );
  });

  test("`catchError`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.catchError((a) => IO.succeed(a * 2)),
      IO.flip,
      expectError((e) => expect(e).toBe(1))
    );
  });

  test("`flatMap(fail)` -> `catchError(succeed)` -> `catchError(succeed)`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.flatMap<number, number, number>((a) => IO.fail(a * 2)),
      IO.catchError<number, number, number>((a) => IO.succeed(a * 2)),
      IO.catchError((a) => IO.succeed(a * 2)),
      IO.flip,
      expectError((e) => expect(e).toBe(4))
    );
  });
});

describe.each`
  constructor            | io
  ${"Fail"}              | ${IO.fail(1)}
  ${"Suspend() -> Fail"} | ${IO.suspend(() => IO.fail(1))}
  ${"Async(onError)"}    | ${IO.async((onError) => onError(1))}
`("$constructor: flips to success channel", ({ io }: { io: IO.IO<number, number> }) => {
  test("no transformations", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.flip,
      expectSuccess((e) => expect(e).toBe(1))
    );
  });

  test("`mapError` -> `map` -> `mapError`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.mapError((a) => a * 2),
      IO.map(() => -1),
      IO.mapError((a) => a * 2),
      IO.flip,
      expectSuccess((value) => expect(value).toBe(4))
    );
  });

  test("`catchError(fail)` -> `catchError(fail)`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.catchError((a) => IO.fail(a * 2)),
      IO.catchError((a) => IO.fail(a * 2)),
      IO.flip,
      expectSuccess((e) => expect(e).toBe(4))
    );
  });

  test("`catchError(succeed)` -> `flatMap(fail)` -> `catchError(fail)", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.catchError<number, number, number>((a) => IO.succeed(a * 2)),
      IO.flatMap<number, number, number>((a) => IO.fail(a * 2)),
      IO.catchError((a) => IO.fail(a * 2)),
      IO.flip,
      expectSuccess((e) => expect(e).toBe(8))
    );
  });

  test("`flatMap`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.flatMap((a) => IO.succeed(a * 2)),
      IO.flip,
      expectSuccess((e) => expect(e).toBe(1))
    );
  });

  test("`catchError(succeed)` -> `flatMap(fail)` -> `flatMap(fail)`", () => {
    expect.assertions(1);
    pipe(
      io,
      IO.catchError<number, number, number>((a) => IO.succeed(a * 2)),
      IO.flatMap<number, number, number>((a) => IO.fail(a * 2)),
      IO.flatMap<number, number, number>((a) => IO.fail(a * 2)),
      IO.flip,
      expectSuccess((e) => expect(e).toBe(4))
    );
  });
});

describe("gen", () => {
  test("flatMaps multiple success IOs", () => {
    expect.assertions(1);
    const program = IO.gen(function* (_) {
      const a = yield* _(IO.succeed(1));
      const b = yield* _(IO.suspend(() => IO.succeed(1)));
      const c = yield* _(IO.async<never, number>((_, onS) => onS(1)));

      return a + b + c;
    });

    expectSuccess((a) => expect(a).toBe(3))(program);
  });

  test("short-circuits when encountering a failed IO", () => {
    expect.assertions(1);
    const program = IO.gen(function* (_) {
      const a = yield* _(IO.succeed(1));
      const b = yield* _(IO.suspend(() => IO.fail<Error, number>(new Error("Failed"))));
      const c = yield* _(IO.async<never, number>((_, onS) => onS(1)));

      return a + b + c;
    });

    expectError((e) => expect(e).toEqual(new Error("Failed")))(program);
  });

  test("Failed IOs can be recovered", () => {
    expect.assertions(1);
    const program = IO.gen(function* (_) {
      const a = yield* _(IO.catchError(IO.succeed)(IO.fail<number, number>(1)));
      const b = yield* _(IO.suspend(() => IO.succeed(1)));
      const c = yield* _(IO.async<never, number>((_, onS) => onS(1)));

      return a + b + c;
    });

    expectSuccess((a) => expect(a).toBe(3))(program);
  });
});

const expectError =
  <E, A>(assertion: (e: E) => void) =>
  (io: IO.IO<E, A>): void =>
    IO.unsafeRunAsync(
      assertion,
      (a) => {
        throw new Error(`Ran in Success channel with: ${a}`);
      },
      (e) => {
        throw new Error(`Ran in Die channel with: ${e}`);
      }
    )(io);

const expectSuccess =
  <E, A>(assertion: (a: A) => void) =>
  (io: IO.IO<E, A>): void =>
    IO.unsafeRunAsync(
      (e) => {
        throw new Error(`Ran in Error channel with: ${e}`);
      },
      assertion,
      (e) => {
        throw new Error(`Ran in Die channel with: ${e}`);
      }
    )(io);

const expectDie =
  <E, A>(assertion: (e: unknown) => void) =>
  (io: IO.IO<E, A>): void =>
    IO.unsafeRunAsync(
      (e) => {
        throw new Error(`Ran in Error channel with: ${e}`);
      },
      (a) => {
        throw new Error(`Ran in Success channel with: ${a}`);
      },
      assertion
    )(io);
