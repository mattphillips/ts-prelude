import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';

import { Maybe } from './Maybe';
import { Result } from './Result';

export const optionToMaybe = <A>(o: O.Option<A>): Maybe<A> =>
  pipe(
    o,
    O.fold(() => Maybe.nothing, Maybe.just)
  );

export const eitherToMaybe = <E, A>(e: E.Either<E, A>): Maybe<A> =>
  pipe(
    e,
    E.fold(
      () => Maybe.nothing,
      (a) => Maybe.just(a)
    )
  );

export const eitherToResult = <E, A>(e: E.Either<E, A>): Result<E, A> =>
  pipe(
    e,
    E.fold(
      (e) => Result.error(e),
      (a) => Result.ok(a)
    )
  );
