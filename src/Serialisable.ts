import * as t from 'io-ts';

import * as R from './Result';
import * as M from './Maybe';
import * as P from './Phantom';
import { Nominal } from './Nominal';

export type Serialisable<URI extends string, A> = { uri: URI; value: A };
export const Serialisable = <URI extends string, A>(uri: URI, value: A): Serialisable<URI, A> => ({ uri, value });

export const serialisableC = <URI extends string, A>(
  uri: t.LiteralC<URI>,
  value: t.Type<A>
): t.Type<Serialisable<URI, A>> =>
  t.type({
    uri,
    value
  });

export type ToSerialisable<U> = U extends M.Maybe<infer A>
  ? M.SerialiseableMaybe<ToSerialisable<A>>
  : U extends R.Result<infer E, infer A>
  ? R.SerialiseableResult<ToSerialisable<E>, ToSerialisable<A>>
  : U extends P.Phantom<infer A, infer B>
  ? P.SerialiseablePhantom<ToSerialisable<B>>
  : U extends Nominal<infer A, infer B>
  ? A
  : U extends Date
  ? SerialiseableDate
  : U extends Record<string, any>
  ? SerialiseableObject<{
      [K in keyof U]: ToSerialisable<U[K]>;
    }>
  : U extends Array<infer A>
  ? SerialiseableArray<ToSerialisable<A>>
  : U;

const has = <K extends string>(key: K, x: {}): x is { [key in K]: unknown } => key in x;

export const isInstanceOfUriClass = <URI, A extends {}>(uri: URI, a: unknown): a is A =>
  typeof a === 'object' && a !== null && has('uri', a) && a.uri === uri;

export const toSerialisable = <A>(a: A): ToSerialisable<A> => {
  // TODO: This is a temporary implementation and may change.
  // Currently when mounting capabilities to global in next we are losing `instanceof` checking in dev when the page is rebuilt
  if (a instanceof M.Maybe || isInstanceOfUriClass<'Maybe', M.Maybe<any>>('Maybe', a)) {
    return a.fold<M.SerialiseableMaybe<ToSerialisable<A>>>(Serialisable(a.uri, { tag: 'Nothing' }), (value) =>
      Serialisable(a.uri, { tag: 'Just', value: toSerialisable(value) })
    ) as ToSerialisable<A>;
  }

  // TODO: This is a temporary implementation and may change.
  // Currently when mounting capabilities to global in next we are losing `instanceof` checking in dev when the page is rebuilt
  if (a instanceof R.Result || isInstanceOfUriClass<'Result', R.Result<any, any>>('Result', a)) {
    return a.fold<R.SerialiseableResult<ToSerialisable<A>, ToSerialisable<A>>>(
      (e) => Serialisable(a.uri, { tag: 'Error', error: toSerialisable(e) }),
      (value) => Serialisable(a.uri, { tag: 'Ok', value: toSerialisable(value) })
    ) as ToSerialisable<A>;
  }

  // TODO: This is a temporary implementation and may change.
  // Currently when mounting capabilities to global in next we are losing `instanceof` checking in dev when the page is rebuilt
  if (a instanceof P.Phantom || isInstanceOfUriClass<'Phantom', P.Phantom<any, any>>('Phantom', a)) {
    return Serialisable(a.uri, toSerialisable(a.value)) as ToSerialisable<A>;
  }

  if (a instanceof Date) {
    return Serialisable(dateURI, a.toJSON()) as ToSerialisable<A>;
  }

  if (Array.isArray(a)) {
    return Serialisable(
      arrayURI,
      a.map((value) => toSerialisable(value))
    ) as ToSerialisable<A>;
  }

  if (typeof a === 'object' && a !== null) {
    return Serialisable(
      objectURI,
      Object.entries(a).reduce((acc, [key, value]) => ({ ...acc, [key]: toSerialisable(value) }), {})
    ) as ToSerialisable<A>;
  }

  return a as ToSerialisable<A>;
};

export const fromSerialisable = <A>(a: ToSerialisable<A>): A => {
  if (M.serialisableMaybeC(t.unknown).is(a)) {
    if (a.value.tag === 'Just') {
      return M.Maybe.just(fromSerialisable(a.value.value)) as any;
    } else {
      return M.Maybe.nothing as any;
    }
  }

  if (R.serialisableResultC(t.unknown, t.unknown).is(a)) {
    if (a.value.tag === 'Ok') {
      return R.Result.ok(fromSerialisable(a.value.value)) as any;
    } else {
      return R.Result.error(fromSerialisable(a.value.error)) as any;
    }
  }

  if (P.serialisablePhantomC(t.unknown).is(a)) {
    return P.Phantom.make()(fromSerialisable(a.value)) as any;
  }

  if (dateC.is(a)) {
    return new Date(a.value) as any;
  }

  if (arrayC(t.unknown).is(a)) {
    return a.value.map((value) => fromSerialisable(value)) as any;
  }

  if (objectC.is(a)) {
    return Object.entries(a.value).reduce(
      (acc, [key, value]) => ({ ...acc, [key]: fromSerialisable(value) }),
      {}
    ) as any;
  }

  return a as any;
};

export type ObjectURI = 'Object';
export const objectURI: ObjectURI = 'Object';
const objectC = serialisableC<ObjectURI, Record<string, unknown>>(t.literal(objectURI), t.record(t.string, t.unknown));
type SerialiseableObject<A> = Serialisable<ObjectURI, A>;

export type DateURI = 'Date';
export const dateURI: DateURI = 'Date';
const dateC = serialisableC<DateURI, string>(t.literal(dateURI), t.string);
type SerialiseableDate = Serialisable<DateURI, string>;

export type ArrayURI = 'Array';
export const arrayURI: ArrayURI = 'Array';
const arrayC = <A>(a: t.Type<A>) => serialisableC<ArrayURI, Array<A>>(t.literal(arrayURI), t.array(a));
type SerialiseableArray<A> = Serialisable<ArrayURI, Array<A>>;
