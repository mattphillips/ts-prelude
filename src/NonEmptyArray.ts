import { Eq } from 'fp-ts/lib/Eq';
import { lookup, upsertAt } from 'fp-ts/lib/Map';
import { pipe } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Option';
import { NonEmptyArray, reduce } from 'fp-ts/lib/NonEmptyArray';

export const groupBy =
  <A, B>(f: (a: A) => B, eq: Eq<B>) =>
  (as: NonEmptyArray<A>): NonEmptyArray<[B, Array<A>]> =>
    [
      ...pipe(
        as,
        reduce<A, Map<B, Array<A>>>(new Map(), (acc, a) =>
          pipe(a, f, (b) =>
            pipe(
              lookup(eq)(b)(acc),
              fold(
                () => upsertAt(eq)(b, [a])(acc),
                (value) => upsertAt(eq)(b, value.concat([a]))(acc)
              )
            )
          )
        )
      ).entries()
    ] as any;
