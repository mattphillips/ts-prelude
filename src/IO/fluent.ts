import { Maybe } from "../Maybe";
import { Result } from "../Result";
import * as _IO from "./";

export type UIO<A> = IO<never, A>;

export class IO<E, A> {
  static succeed = <E, A>(a: A): IO<E, A> => new IO(_IO.succeed(a));

  static unit = new IO(_IO.unit);

  static fail = <E, A>(e: E): IO<E, A> => new IO(_IO.fail(e));

  static die = <E, A>(e: E): IO<never, A> => new IO(_IO.die(e));

  static sync = <E, A>(lazy: () => A): IO<E, A> => new IO(_IO.sync(lazy));

  static syncFail = <E, A>(lazy: () => E): IO<E, A> => new IO(_IO.syncFail(lazy));

  static suspend = <E, A>(lazy: () => IO<E, A>): IO<E, A> => new IO(_IO.suspend(() => lazy().value));

  static async = <E, A>(onDone: (onError: (e: E) => unit, onSuccess: (a: A) => unit) => unit): IO<E, A> =>
    new IO(_IO.async(onDone));

  static fromResult = <E, A>(result: Result<E, A>): IO<E, A> => new IO(_IO.fromResult(result));

  static fromMaybe =
    <E, A>(fallback: E) =>
    (ma: Maybe<A>): IO<E, A> =>
      new IO(_IO.fromMaybe<E, A>(fallback)(ma));

  static fromNullable =
    <E, A>(fallback: E) =>
    (a: A | null | undefined): IO<E, A> =>
      new IO(_IO.fromNullable<E, A>(fallback)(a));

  static tryCatch = <A>(f: () => A): IO<unknown, A> => new IO(_IO.tryCatch(f));

  static fromPromise = <A>(lazy: () => Promise<A>): IO<unknown, A> => new IO(_IO.fromPromise(lazy));

  static fromPromiseOrDie = <A>(lazy: () => Promise<A>): UIO<A> => new IO(_IO.fromPromiseOrDie(lazy));

  static sleep = (duration: number): IO<never, void> => new IO(_IO.sleep(duration));

  static lift =
    <E, A, B>(f: (a: A) => B) =>
    (a: A): IO<E, B> =>
      new IO(_IO.lift<E, A, B>(f)(a));

  static traverse =
    <E, A, B>(f: (a: A) => IO<E, B>) =>
    (args: Array<A>): IO<E, Array<B>> =>
      new IO<E, Array<B>>(_IO.traverse<E, A, B>((a) => f(a).value)(args));

  static forEach =
    <A>(args: Array<A>) =>
    <E, B>(f: (a: A) => IO<E, B>): IO<E, Array<B>> =>
      new IO<E, Array<B>>(_IO.forEach(args)((a) => f(a).value));

  private constructor(private readonly value: _IO.IO<E, A>) {}

  private to_IO = <E1, A1>(f: (action: _IO.IO<E, A>) => _IO.IO<E1, A1>): IO<E1, A1> => new IO(f(this.value));

  map = <B>(f: (a: A) => B): IO<E, B> => this.to_IO(_IO.map(f));

  flatMap = <B>(f: (a: A) => IO<E, B>): IO<E, B> => this.to_IO(_IO.flatMap((a) => f(a).value));

  flatMapW = <E1, B>(f: (a: A) => IO<E1, B>): IO<E | E1, B> => this.to_IO(_IO.flatMapW((a) => f(a).value));

  mapError = <E1>(f: (e: E) => E1): IO<E1, A> => this.to_IO(_IO.mapError(f));

  catchError = <E1>(f: (e: E) => IO<E1, A>): IO<E1, A> => this.to_IO(_IO.catchError((e) => f(e).value));

  handleError = (f: (e: E) => A): IO<never, A> => this.to_IO(_IO.handleError(f));

  flatHandleError = (f: (e: E) => IO<never, A>): IO<never, A> => this.to_IO(_IO.flatHandleError((e) => f(e).value));

  bimap = <E1, B>(f: (e: E) => E1, g: (a: A) => B): IO<E1, B> => this.to_IO(_IO.bimap(f, g));

  tap = (f: (a: A) => unit): IO<E, A> => this.to_IO(_IO.tap(f));

  tapError = (f: (e: E) => unit): IO<E, A> => this.to_IO(_IO.tapError(f));

  biTap = (f: (e: E) => unit, g: (a: A) => unit): IO<E, A> => this.to_IO(_IO.biTap(f, g));

  flatTap = (f: (a: A) => UIO<unit>): IO<E, A> => this.to_IO(_IO.flatTap((a) => f(a).value));

  flatTapError = (f: (e: E) => UIO<unit>): IO<E, A> => this.to_IO(_IO.flatTapError((e) => f(e).value));

  refineErrorOrDie = <E1>(f: (e: E) => Maybe<E1>): IO<E1, A> => this.to_IO(_IO.refineErrorOrDie(f));

  biFlatTap = (f: (e: E) => UIO<unit>, g: (a: A) => UIO<unit>) =>
    this.to_IO(
      _IO.biFlatTap(
        (e) => f(e).value,
        (a) => g(a).value
      )
    );

  flip = (): IO<A, E> => this.to_IO(() => _IO.flip(this.value));

  delay = (duration: number): IO<E, A> => this.to_IO(_IO.delay(duration));

  filter = (p: (a: A) => boolean, e: E): IO<E, A> => this.to_IO(_IO.filter(p, e));

  refine = <B extends A, E1>(p: (a: A) => a is B, e: E | E1): IO<E | E1, B> => this.to_IO(_IO.refine(p, e));

  filterWith = <E1>(p: (a: A) => boolean, f: (a: A) => E1): IO<E | E1, A> => this.to_IO(_IO.filterWith(p, f));

  unsafeRunAsync = (onFailure: (e: E) => unit, onSuccess: (a: A) => unit, onDie: (e: unknown) => unit): unit =>
    _IO.unsafeRunAsync(onFailure, onSuccess, onDie)(this.value);

  unsafeRunAsyncOrDie = (onFailure: (e: E) => unit, onSuccess: (a: A) => unit): unit =>
    _IO.unsafeRunAsyncOrDie(onFailure, onSuccess)(this.value);

  toPromise = (): Promise<A> => _IO.toPromise(this.value);

  orDie = (): UIO<A> => this.to_IO(_IO.orDie);

  toUnit = (): IO<E, void> => this.to_IO(_IO.toUnit);

  // TODO: investigate removing () syntax and add to underlying impl
  nothing = (): IO<never, void> => this.toUnit().orDie();

  merge = (): UIO<A | E> => this.to_IO(_IO.merge);

  fold = <B>(f: (e: E) => B, g: (a: A) => B): UIO<B> => this.map(g).mapError(f).merge();

  static do = <Eff extends _IO.GenIO<any, any>, AEff>(
    f: (i: <E, A>(_: IO<E, A>) => _IO.GenIO<E, A>) => Generator<Eff, AEff, any>
  ): IO<_IO._E<Eff["op"]>, AEff> => new IO(_IO.gen(() => f((io) => new _IO.GenIO(io.value))));
}

type unit = void;
