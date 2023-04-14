import { pipe } from "fp-ts/lib/function";
import { match } from "../match";
import { Maybe } from "../Maybe";
import { Result } from "../Result";

// Model
export type IO<E, A> = Succeed<A> | Die | Fail<E> | Suspend<E, A> | Async<E, A> | FlatMap<E, any, A>;

/**
  UIO is a type alias for IO<never, A>, which represents an effect
  that cannot fail, but can succeed with an A.
*/
export type UIO<A> = IO<never, A>;

type Succeed<A> = { tag: "Succeed"; a: A };

type Fail<E> = { tag: "Fail"; e: E };

type Die = { tag: "Die"; e: unknown };

type Async<E, A> = {
  tag: "Async";
  onDone: (onError: (e: E) => unit, onSuccess: (a: A) => unit, onDie: (e: unknown) => unit) => unit;
};

class Suspend<E, A> {
  tag: "Suspend" = "Suspend";
  _E!: E;
  _A!: A;
  constructor(public readonly lazy: () => IO<E, A>) {}
}

class FlatMap<E, A0, A> {
  tag: "FlatMap" = "FlatMap";
  _E!: E;
  _A0!: A0;
  _A!: A;
  constructor(public readonly aToIOB: (a: A0) => IO<E, A>, public readonly ioA: IO<E, A0>) {}
}

type unit = void;

// Constructors
/**
 **succeed** constructs a success IO from the provided value.
 */
export const succeed = <E, A>(a: A): IO<E, A> => ({ tag: "Succeed", a });

/**
 **unit** represents an IO that successfully resolves to void.
 */
export const unit = succeed<never, unit>(undefined);

/**
 **fail** wraps a strictly-evaluated error value in an error IO.
 */
export const fail = <E, A>(e: E): IO<E, A> => ({ tag: "Fail", e });

/**
 **die** constructs an IO that will die by throwing the given `e`.
 */
export const die = <E, A>(e: E): IO<never, A> => ({ tag: "Die", e });

/**
 **sync** wraps a lazily-evaluated value of type A in a success IO.
 */
export const sync = <E, A>(lazy: () => A): IO<E, A> => suspend(() => succeed(lazy()));

/**
 **syncFail** wraps a lazily-evaluated value of type E in an error IO.
 */
export const syncFail = <E, A>(lazy: () => E): IO<E, A> => suspend(() => fail(lazy()));

/**
 **suspend** wraps a lazily-evaluated IO value in an IO.
 */
export const suspend = <E, A>(lazy: () => IO<E, A>): IO<E, A> => new Suspend(lazy);

/**
   **async** creates an async IO value that is run by invoking a callback.
 
   Example:
 
   ```ts
   async((onF, onS) => onS(1));
   async((onF, onS) => onF(new Error('Failed')));
   async((onF, onS, onE) => onE(new Error('Failed')));
   ```
 */
export const async = <E, A>(
  onDone: (onError: (e: E) => unit, onSuccess: (a: A) => unit, onDie: (e: unknown) => unit) => unit
): IO<E, A> => ({
  tag: "Async",
  onDone,
});

/**
  IO.**fromMaybe** lifts an evaluated Maybe<A> to an IO<E, A> by providing a
  fallback E value to use when the Maybe is `Nothing`.
*/
export const fromMaybe =
  <E, A>(fallback: E) =>
  (ma: Maybe<A>): IO<E, A> =>
    ma.fold(fail<E, A>(fallback), (a) => succeed<E, A>(a));

/**
  IO.**fromNullable** lifts a nullable value to an IO<E, A> by providing a
  fallback E value to use when the value is `null` or `undefined`.
*/
export const fromNullable =
  <E, A>(fallback: E) =>
  (a: A | null | undefined): IO<E, A> =>
    a === undefined || a === null ? fail(fallback) : succeed(a);

/**
  IO.**fromResult** lifts an evaluated result value of type Result<E, A> to an IO<E, A>.
*/
export const fromResult = <E, A>(result: Result<E, A>): IO<E, A> => result.fold<IO<E, A>>(fail, succeed);

/**
  IO.**tryCatch** lifts a lazy function (() => A) that can throw an unknown exception to an IO<unknown, A>.
*/
export const tryCatch = <A>(f: () => A): IO<unknown, A> => {
  try {
    return succeed(f());
  } catch (e) {
    return fail(e);
  }
};

/**
  IO.**fromPromise** lifts a lazyily-evaluated promise into an async IO value.
*/
export const fromPromise = <A>(lazy: () => Promise<A>): IO<unknown, A> =>
  async((onFailure, onSuccess) => lazy().then(onSuccess).catch(onFailure));

/**
  IO.**fromPromiseOrDie** lifts a lazyily-evaluated promise into an async IO value and eliminates the error channel
*/
export const fromPromiseOrDie = <A>(lazy: () => Promise<A>): UIO<A> => pipe(fromPromise(lazy), orDie);

/**
 **sleep** creates an async IO that will sleep for the given millisecond duration.
 */
export const sleep = (duration: number): IO<never, void> => async((_, onSuccess) => setTimeout(onSuccess, duration));

/**
 **ioify** lifts a node style callback function to one returning an `IO`
 */
export function ioify<L, R>(f: (cb: (e: L | null | undefined, r?: R) => void) => void): () => IO<L, R>;
export function ioify<A, L, R>(f: (a: A, cb: (e: L | null | undefined, r?: R) => void) => void): (a: A) => IO<L, R>;
export function ioify<A, B, L, R>(
  f: (a: A, b: B, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B) => IO<L, R>;
export function ioify<A, B, C, L, R>(
  f: (a: A, b: B, c: C, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C) => IO<L, R>;
export function ioify<A, B, C, D, L, R>(
  f: (a: A, b: B, c: C, d: D, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D) => IO<L, R>;
export function ioify<A, B, C, D, E, L, R>(
  f: (a: A, b: B, c: C, d: D, e: E, cb: (e: L | null | undefined, r?: R) => void) => void
): (a: A, b: B, c: C, d: D, e: E) => IO<L, R>;
export function ioify<E, A>(f: Function): () => IO<E, A> {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    return async<E, A>((onE, onS) => {
      const cbResolver = (e: E, r: A) => {
        return e != null ? onE(e) : onS(r);
      };
      f.apply(null, args.concat(cbResolver));
    });
  };
}

/**
 **traverse** converts an Array<A> to an IO<E, Array<B>> where each element of the array is ran through the given `f`.

 It is useful when you have an array of items you want to run an effect on each item without ending up with an Array<IO<E, B>>,
 instead having just one IO.
 */
export const traverse =
  <E, A, B>(f: (a: A) => IO<E, B>) =>
  (args: Array<A>): IO<E, Array<B>> => {
    return args.reduce(
      (acc, a) =>
        pipe(
          acc,
          flatMap((bs) =>
            pipe(
              a,
              f,
              map((b) => bs.concat([b]))
            )
          )
        ),
      succeed<E, Array<B>>([])
    );
  };

/**
 **forEach** converts an Array<A> to an IO<E, Array<B>> where each element of the array is ran through the given `f`.

 It is useful when you have an array of items you want to run an effect on each item without ending up with an Array<IO<E, B>>,
 instead having just one IO.
 */
export const forEach =
  <A>(args: Array<A>) =>
  <E, B>(f: (a: A) => IO<E, B>): IO<E, Array<B>> => {
    return args.reduce(
      (acc, a) =>
        pipe(
          acc,
          flatMap((bs) =>
            pipe(
              a,
              f,
              map((b) => bs.concat([b]))
            )
          )
        ),
      succeed<E, Array<B>>([])
    );
  };

/**
  IO.**lift** lifts a function of (A => B) into a function of (A => IO<E, A>).
*/
export const lift =
  <E, A, B>(f: (a: A) => B) =>
  (a: A): IO<E, B> =>
    succeed(f(a));

// Combinators

/**
  **flatMap** applies an effectful function (A => IO<E, B>) on the success channel
  to produce an IO<E, B>.
*/
export const flatMap =
  <E, A, B>(f: (a: A) => IO<E, B>) =>
  (io: IO<E, A>): IO<E, B> =>
    new FlatMap<E, A, B>(f, io);

/**
  **flatMapW** applies an effectful function (A => IO<E1, B>) on the success channel
  to produce an IO<E | E1, B> growing the error channel with E1.
*/
export const flatMapW =
  <E, E1, A, B>(f: (a: A) => IO<E1, B>) =>
  (io: IO<E, A>): IO<E | E1, B> =>
    new FlatMap<E | E1, A, B>(f, io);

/**
 **map** applies a function (**A** => **B**) on an IO<E, **A**> success channel to produce an IO<E, **B**>.
 */
export const map =
  <E, A, B>(f: (a: A) => B) =>
  (io: IO<E, A>): IO<E, B> =>
    pipe(
      io,
      flatMap((a) => succeed(f(a)))
    );

/**
  **handleError** applies a function (E => A) on the error channel
  to convert an error value to a success value, which serves to "clear" the error in the IO,
  making the error type `never`.
*/
export const handleError =
  <E, A>(f: (e: E) => A) =>
  (io: IO<E, A>): IO<never, A> =>
    pipe(
      io,
      catchError((e) => succeed(f(e)))
    );

/**
  **flatHandleError** applies an effectful function (E => IO<never, A>) on the error channel
  to convert an error value to a success value, which serves to "clear" the error in the IO,
  making the error type `never`.
*/
export const flatHandleError =
  <E, A>(f: (e: E) => IO<never, A>) =>
  (io: IO<E, A>): IO<never, A> =>
    pipe(io, catchError(f));

/**
  **catchError** applies an effectful function (E => IO<E1, A>) on the error channel
  to produce an IO<E1, A>.
*/
export const catchError =
  <E, E1, A>(f: (e: E) => IO<E1, A>) =>
  (io: IO<E, A>): IO<E1, A> =>
    match(io, {
      Succeed: ({ a }) => succeed(a),
      Fail: ({ e }) => f(e),
      Die: ({ e }) => die(e),
      Suspend: ({ lazy }) => suspend(() => catchError(f)(lazy())),
      Async: ({ onDone }) => async((onE, onS, onD) => onDone((e) => unsafeRunAsync(onE, onS, onD)(f(e)), onS, onD)),
      FlatMap: ({ aToIOB, ioA }) =>
        match(ioA, {
          Succeed: ({ a }) => pipe(a, aToIOB, catchError(f)),
          Die: ({ e }) => die(e),
          Fail: ({ e }) => f(e),
          Suspend: ({ lazy }) =>
            pipe(
              suspend(() => pipe(lazy(), flatMap(aToIOB))),
              catchError(f)
            ),
          Async: ({ onDone }) =>
            async((onE, onS, onD) =>
              onDone(
                (e) => pipe(e, f, unsafeRunAsync(onE, onS, onD)),
                (a) => pipe(a, aToIOB, catchError(f), unsafeRunAsync(onE, onS, onD)),
                onD
              )
            ),
          FlatMap: ({ ioA: ioA1, aToIOB: aToIOB1 }) =>
            pipe(
              ioA1,
              flatMap((a1) => pipe(a1, aToIOB1, flatMap(aToIOB))),
              catchError(f)
            ),
        }),
    });

/**
  **mapError** applies a function (**E** => **E1**) on an IO<**E**, A> error channel to produce an
  IO<**E1**, A>.
*/
export const mapError =
  <E, E1, A>(f: (e: E) => E1) =>
  (io: IO<E, A>): IO<E1, A> =>
    pipe(
      io,
      catchError((e) => fail(f(e)))
    );

/**
  IO.**biFlatMap** applies flatMap functions on both the success and failure channels of the IO. Equivalent to:
  ```ts
  io.flatMap(f).flatMapFailure(g);
  ```
*/
export const biFlatMap =
  <E, E1, A, B>(g: (e: E) => IO<E1, B>, f: (a: A) => IO<E, B>) =>
  (io: IO<E, A>): IO<E1, B> =>
    pipe(io, flatMap(f), catchError(g));

/**
 **bimap** applies map functions on both the success and error channels of the IO.
 */
export const bimap =
  <E, E1, A, B>(f: (e: E) => E1, g: (a: A) => B) =>
  (io: IO<E, A>): IO<E1, B> =>
    pipe(io, map(g), mapError(f));

/**
  IO.**flatTap** applies a side-effect function (A => UIO<unit>) on an IO<E, A> success channel,
  and propagates the A value unchanged.
  This is useful for doing things like logging the value inside the IO.
*/
export const flatTap =
  <E, A>(f: (a: A) => UIO<unit>) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(
      io,
      flatMap<E, A, A>((a) =>
        pipe(
          f(a),
          map(() => a)
        )
      )
    );

/**
  IO.**tap** applies a side-effect function (A => unit) on an IO<E, A> success channel,
  and propagates the A value unchanged.
  This is useful for doing things like logging the value inside the IO.
*/
export const tap =
  <E, A>(f: (a: A) => unit) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(
      io,
      map((a) => {
        f(a);
        return a;
      })
    );

/**
  IO.**tapError** applies a side-effect function (E => unit) on an IO<E, A> error channel,
  and propagates the E value unchanged.
  This is useful for doing things like logging the value inside the IO.
*/
export const tapError =
  <E, A>(f: (e: E) => unit) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(
      io,
      mapError((e) => {
        f(e);
        return e;
      })
    );

/**
  IO.**biFlatTap** applies a side-effect function to an IO to both channels,
  and propagates the values unchanged.
  This is useful for doing things like logging the value inside the IO..
 */
export const biFlatTap =
  <E, A>(f: (e: E) => UIO<unit>, g: (a: A) => UIO<unit>) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(io, flatTap(g), flatTapError(f));

/**
  IO.**flatTapError** applies a side-effect function (E => UIO<unit>) on an IO<E, A> error channel,
  and propagates the E value unchanged.
  This is useful for doing things like logging the error inside the IO.
*/
export const flatTapError =
  <E, A>(f: (e: E) => UIO<unit>) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(
      io,
      catchError((e) =>
        pipe(
          f(e),
          flatMap(() => fail(e))
        )
      )
    );

/**
  IO.**biTap** applies a side-effect function to both channels,
  and propagates the values unchanged.
  This is useful for doing things like logging the value inside the IO.
*/
export const biTap =
  <E, A>(f: (e: E) => unit, g: (a: A) => unit) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(io, tap(g), tapError(f));

/**
  IO.**orDie** will throw the E value if ran on a failed IO and will eliminate the E type
  completely resulting in an IO<never, A>.

  This is useful for dealing with exceptions that cannot be recovered in the IO context.
*/
export const orDie = <E, A>(io: IO<E, A>): UIO<A> =>
  pipe(
    io,
    catchError((e) => die(e))
  );

/**
  IO.**toUnit** converts a successful IO to void
*/
export const toUnit = <E, A>(io: IO<E, A>): IO<E, void> =>
  pipe(
    io,
    flatMapW(() => unit)
  );

/**
  IO.**nothing** converts a successful IO to void and kills a failed IO

  Syntaxical sugar for: `IO.toUnit.orDie`
*/
export const nothing = <E, A>(io: IO<E, A>): UIO<void> => pipe(io, toUnit, orDie);

/**
  IO.**filter** interrogates the success channel with a given predicate which when fails converts the IO
  to an error with the given fallback
*/
export const filter =
  <E, A>(p: (a: A) => boolean, e: E) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(
      io,
      flatMap((a) => (p(a) ? succeed(a) : fail(e)))
    );

/**
  IO.**filterWith** interrogates the success channel with a given predicate which when fails converts the IO
  to an error using the given `f` to produce a newly typed error E1
*/
export const filterWith =
  <E, E1, A>(p: (a: A) => boolean, f: (a: A) => E1) =>
  (io: IO<E, A>): IO<E | E1, A> =>
    pipe(
      io,
      flatMapW((a) => (p(a) ? succeed<E | E1, A>(a) : fail<E | E1, A>(f(a))))
    );

/**
  IO.**refine** runs the given refinement function on the success channel to allow the `A` to be changed to `B`.
  If refinement fails the IO is converted to an error with the given fallback
*/
export const refine =
  <E, E1, A, B extends A>(p: (a: A) => a is B, e: E | E1) =>
  (io: IO<E, A>): IO<E | E1, B> =>
    pipe(
      io,
      flatMap((a) => (p(a) ? succeed(a) : fail(e)))
    );
/**
  IO.**refineErrorOrDie** runs the given refinement function on the error channel to allow the `E` to be changed to `E1`.
  IO dies if the result of the given refinement function is `Maybe.nothing`.
*/
export const refineErrorOrDie =
  <E, E1, A>(f: (e: E) => Maybe<E1>) =>
  (io: IO<E, A>): IO<E1, A> =>
    pipe(
      io,
      catchError((e) => f(e).foldL<IO<E1, A>>(() => die(e), fail))
    );

/**
  IO.**merge** joins the error and success channel into a success UIO<A | E>.

  This is useful when you need to work over a success value and both A and E have a shared super type.
*/
export const merge = <E, A>(io: IO<E, A>): UIO<A | E> =>
  pipe(
    io,
    catchError((e) => succeed<never, A | E>(e)),
    flatMapW((a) => succeed<never, A | E>(a))
  );

/**
  IO.**fold** converts the IO to a UIO<B> that cannot fail by running the success and error channels over 
  the given functions and merges the results
*/
export const fold =
  <E, A, B>(f: (e: E) => B, g: (a: A) => B) =>
  (io: IO<E, A>): UIO<B> =>
    pipe(io, map(g), mapError(f), merge);

/**
 **flip** Flips the values between the success and error channels.
 */
export const flip = <E, A>(io: IO<E, A>): IO<A, E> => {
  switch (io.tag) {
    case "Succeed": {
      return fail(io.a);
    }
    case "Fail": {
      return succeed(io.e);
    }
    case "Die": {
      return io;
    }
    case "Suspend": {
      return new Suspend(() => flip(io.lazy()));
    }
    case "Async": {
      return async((onE, onS, onD) => io.onDone(onS, onE, onD));
    }
    case "FlatMap": {
      const { aToIOB, ioA } = io;
      return match(ioA, {
        Succeed: ({ a }) => flip(aToIOB(a)),
        Fail: ({ e }) => succeed(e),
        Die: ({ e }) => die(e),
        Suspend: ({ lazy }) => new Suspend(() => pipe(lazy(), flatMap(aToIOB), flip)),
        Async: ({ onDone }) =>
          async((onE, onS, onD) => onDone(onS, (a) => pipe(a, aToIOB, flip, unsafeRunAsync(onE, onS, onD)), onD)),
        FlatMap: ({ ioA: ioR, aToIOB: aToIOR }) => flip(flatMap((r) => flatMap(aToIOB)(aToIOR(r)))(ioR)),
      });
    }
  }
};

/**
 **delay** delays the exectuion of a successful IO by the giving time in milliseconds
 */
export const delay =
  <E, A>(duration: number) =>
  (io: IO<E, A>): IO<E, A> =>
    pipe(
      io,
      flatMapW((a) =>
        pipe(
          sleep(duration),
          map(() => a)
        )
      )
    );

/**
  **unsafeRunAsync** runs the effectual IO<E, A> and applies the given onFailure and
  onSuccess callbacks to the outcome of the IO depending on the channel the IO ends in
  and if the effect dies the onDie callback is invoked.

  This function should be run "at the edge of the world" to evaluate the
  suspended side-effects in the IO.
*/
export const unsafeRunAsync =
  <E, A>(onFailure: (e: E) => unit, onSuccess: (a: A) => unit, onDie: (e: unknown) => unit) =>
  (io: IO<E, A>): unit => {
    match(io, {
      Succeed: ({ a }) => onSuccess(a),
      Fail: ({ e }) => onFailure(e),
      Die: ({ e }) => onDie(e),
      Suspend: ({ lazy }) => unsafeRunAsync(onFailure, onSuccess, onDie)(lazy()),
      Async: ({ onDone }) => onDone(onFailure, onSuccess, onDie),
      FlatMap: ({ ioA, aToIOB }) =>
        unsafeRunAsync(onFailure, (a) => unsafeRunAsync(onFailure, onSuccess, onDie)(aToIOB(a)), onDie)(ioA),
    });
  };

/**
  **unsafeRunAsyncOrDie** runs the effectual IO<E, A> and applies the given onFailure and
  onSuccess callbacks to the outcome of the IO depending on the channel the IO ends in.

  _Note:_ Should the effect die then this error will be thrown.

  This function should be run "at the edge of the world" to evaluate the
  suspended side-effects in the IO.
*/
export const unsafeRunAsyncOrDie =
  <E, A>(onFailure: (e: E) => unit, onSuccess: (a: A) => unit) =>
  (io: IO<E, A>): unit =>
    unsafeRunAsync(onFailure, onSuccess, (e) => {
      throw e;
    })(io);

/**
  IO.**toPromise** runs the effectual IO<A, E> and lifts the outcome into a `Promise`.
  In doing so it throws away the failure channel (E) type information.

  This function should be run "at the edge of the world" to evaluate the
  suspended side-effects in the IO.
*/
export const toPromise = <E, A>(io: IO<E, A>): Promise<A> =>
  new Promise((res, rej) => unsafeRunAsyncOrDie(rej, res)(io));

export class GenIO<E, A> {
  constructor(readonly op: IO<E, A>) {}

  *[Symbol.iterator](): Generator<GenIO<E, A>, A, any> {
    return yield this;
  }
}

// Inspiration: https://dev.to/matechs/abusing-typescript-generators-4m5h
export const gen = <Eff extends GenIO<any, any>, AEff>(
  f: (i: <E, A>(_: IO<E, A>) => GenIO<E, A>) => Generator<Eff, AEff, any>
): IO<_E<Eff["op"]>, AEff> =>
  suspend(() => {
    const iterator = f(<E, A>(_: IO<E, A>) => new GenIO(_));
    const state = iterator.next();

    const run = (state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>): IO<_E<Eff["op"]>, AEff> => {
      if (state.done) {
        return succeed(state.value);
      }
      return pipe(
        state.value["op"],
        flatMap((val) => {
          const next = iterator.next(val);
          return run(next);
        })
      );
    };

    return run(state);
  });

export type _E<T> = T extends Fail<infer E> | Suspend<infer E, any> | Async<infer E, any> | FlatMap<infer E, any, any>
  ? E
  : never;
