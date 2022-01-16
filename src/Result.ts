import * as t from 'io-ts';
import { identity } from './Function';
import { match } from './match';
import { Maybe } from './Maybe';
import { serialisableC, Serialisable } from './Serialisable';

export type URI = 'Result';

export class Result<E, A> {
  static ok = <E, A>(value: A): Result<E, A> => new Result<E, A>({ tag: 'Ok', value });

  static error = <E, A>(error: E): Result<E, A> => new Result<E, A>({ tag: 'Error', error });

  static fromMaybe = <E, A>(e: E, ma: Maybe<A>): Result<E, A> =>
    ma.fold<Result<E, A>>(Result.error(e), (a) => Result.ok(a));

  static fromPredicate =
    <E, A>(fallback: E, p: (a: A) => boolean) =>
    (a: A): Result<E, A> =>
      p(a) ? Result.ok(a) : Result.error(fallback);

  private constructor(private readonly value: t<E, A>) {}

  uri: URI = 'Result';

  fold = <B>(onError: (e: E) => B, onOk: (a: A) => B): B =>
    match(this.value, {
      Ok: ({ value }) => onOk(value),
      Error: ({ error }) => onError(error)
    });

  getOk = (): Maybe<A> =>
    this.fold(
      () => Maybe.nothing,
      (a) => Maybe.just(a)
    );

  getOrElse = (a: A): A => this.fold(() => a, identity);

  getOrElseBy = (a: (e: E) => A): A => this.fold(a, identity);

  getError = (): Maybe<E> =>
    this.fold(
      (e) => Maybe.just(e),
      () => Maybe.nothing
    );

  getErrorOrElse = (e: E): E => this.fold(identity, () => e);

  getErrorOrElseBy = (e: (a: A) => E): E => this.fold(identity, e);

  isError: boolean = this.value.tag === 'Error';

  isOk: boolean = !this.isError;

  flip = (): Result<A, E> => this.fold<Result<A, E>>(Result.ok, Result.error);

  map = <B>(f: (a: A) => B): Result<E, B> => this.flatMap((a) => Result.ok(f(a)));

  mapError = <F>(f: (e: E) => F): Result<F, A> =>
    this.fold(
      (e) => Result.error(f(e)),
      (a) => Result.ok<F, A>(a)
    );

  flatMap = <B>(f: (a: A) => Result<E, B>): Result<E, B> => this.fold(Result.error, f);

  catchError = <F>(f: (e: E) => Result<F, A>): Result<F, A> => this.fold(f, (a) => Result.ok(a));
}

type t<E, A> = { tag: 'Error'; error: E } | { tag: 'Ok'; value: A };

const uriC = t.literal<URI>('Result');
const tC = <E, A>(e: t.Type<E>, a: t.Type<A>): t.Type<t<E, A>> =>
  t.union([t.type({ tag: t.literal('Ok'), value: a }), t.type({ tag: t.literal('Error'), error: e })]);

export type SerialiseableResult<E, A> = Serialisable<URI, t<E, A>>;
export const serialisableResultC = <E, A>(e: t.Type<E>, a: t.Type<A>): t.Type<Serialisable<URI, t<E, A>>> =>
  serialisableC(uriC, tC(e, a));
