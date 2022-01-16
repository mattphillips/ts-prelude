import * as t from 'io-ts';
import { Serialisable, serialisableC } from './Serialisable';

export type URI = 'Phantom';

export class Phantom<A, B> {
  _A!: A;

  private constructor(public readonly value: B) {}

  uri: URI = 'Phantom';

  static make =
    <N extends Phantom<any, any>>() =>
    (value: N['value']): N =>
      new Phantom<N['_A'], N['value']>(value) as N;
}

const uriC = t.literal<URI>('Phantom');

export type SerialiseablePhantom<A> = Serialisable<URI, A>;
export const serialisablePhantomC = <A>(a: t.Type<A>): t.Type<Serialisable<URI, A>> => serialisableC(uriC, a);
