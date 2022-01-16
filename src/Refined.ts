import { match_, Pattern, TagUnion } from './match';
import { Nominal, SimpleNominal } from './Nominal';
import { Result } from './Result';
import { TaggedUnion } from './TaggedUnion';

type InferType<A extends SimpleNominal<unknown>> = A['_raw'];

type UnknownNominal = SimpleNominal<unknown>;

type Match<ADT extends TagUnion> = <A>(pattern: Pattern<'tag', ADT, A>) => (adt: ADT) => A;

const unwrap = <A extends UnknownNominal>(a: A): InferType<A> => a;

// TODO: Eventually it would be good to decouple `Refined` types from `Nominals`
// and have `Refined` prove the refinement at the type level
export type Refined<A extends UnknownNominal, E extends TagUnion> = {
  /**
   * **Use at own risk.**
   *
   * Favour `from` unless you are certain the data conforms to the correct structure.
   */
  unsafeFrom: (a: InferType<A>) => A;

  from: (a: InferType<A>) => Result<E, A>;

  is: (a: InferType<A>) => a is A;

  handleError: Match<E>;
};

export const refine = <A extends UnknownNominal, E extends TagUnion>(
  p: (a: InferType<A>) => Result<E, InferType<A>>
): Refined<A, E> => ({
  unsafeFrom: (a) => Nominal<A>()(a),
  from: (a) => p(a).map(Nominal<A>()),
  handleError: match_,
  is: (a): a is A => p(a).isOk
});

export namespace Refined {
  export namespace Boolean {
    export type And<A extends UnknownNominal, L extends Refined<A, any>, R extends Refined<A, any>> = Refined<
      A,
      ExtractError<L | R>
    >;

    export const And = <A extends UnknownNominal, L extends Refined<A, any>, R extends Refined<A, any>>(
      l: L,
      r: R
    ): And<A, L, R> => refine<A, any>((s) => l.from(s).map(unwrap).flatMap(r.from).map(unwrap));

    export type Or<
      A extends UnknownNominal,
      L extends Refined<A, any>,
      R extends Refined<A, any>
      // TODO: should this be an intersection of errors?
    > = Refined<A, ExtractError<L> | ExtractError<R>>;

    export const Or = <A extends UnknownNominal, L extends Refined<A, any>, R extends Refined<A, any>>(
      l: L,
      r: R
    ): Or<A, L, R> =>
      refine<A, any>((s) =>
        l
          .from(s)
          .catchError(() => r.from(s))
          .map(unwrap)
      );

    type ExtractError<A> = A extends Refined<any, infer E> ? E : never;
  }
  export namespace String {
    type StringNominal = SimpleNominal<string>;
    // TODO: Add tests
    export type MatchesRegex<A extends StringNominal> = Refined<A, MatchesRegex.E>;
    export namespace MatchesRegex {
      export type E = TaggedUnion<{ MatchesRegexError: {} }>;
      export const E = TaggedUnion<E>(['MatchesRegexError']).of.MatchesRegexError({});
      export const refinement = <A extends StringNominal>(s: RegExp): MatchesRegex<A> =>
        refine<A, E>(Result.fromPredicate(MatchesRegex.E, (i) => s.test(i)));
    }
  }

  export namespace Iterable {
    type IterableNominal = SimpleNominal<Iterable<any>>;

    export type MinLength<A extends IterableNominal> = Refined<A, MinLength.E> & {
      minLength: number;
    };
    export namespace MinLength {
      export type E = TaggedUnion<{ MinLengthError: { minLength: number } }>;
      export const E = TaggedUnion<E>(['MinLengthError']).of.MinLengthError;

      export const refinement = <A extends IterableNominal>(minLength: number): MinLength<A> => ({
        ...refine<A, E>(Result.fromPredicate(MinLength.E({minLength}), (s) => [...s].length >= minLength)),
        minLength
      });
    }

    export type MaxLength<A extends IterableNominal> = Refined<A, MaxLength.E> & { maxLength: number };
    export namespace MaxLength {
      export type E = TaggedUnion<{ MaxLengthError: { maxLength: number } }>;
      export const E = TaggedUnion<E>(['MaxLengthError']).of.MaxLengthError;

      export const refinement = <A extends IterableNominal>(maxLength: number): MaxLength<A> => ({
        ...refine<A, E>(Result.fromPredicate(MaxLength.E({ maxLength }), (s) => [...s].length <= maxLength)),
        maxLength
      });
    }

    export type MinMaxLength<A extends IterableNominal> = Refined.Boolean.And<A, MinLength<A>, MaxLength<A>> & {
      minLength: number;
      maxLength: number;
    };
    export namespace MinMaxLength {
      export const refinement = <A extends IterableNominal>(minLength: number, maxLength: number): MinMaxLength<A> => ({
        ...Refined.Boolean.And<A, MinLength<A>, MaxLength<A>>(
          MinLength.refinement(minLength),
          MaxLength.refinement(maxLength)
        ),
        minLength,
        maxLength
      });
    }
  }

  export namespace Number {
    type NumberNominal = SimpleNominal<number>;

    // TODO: Rename error messages for less/greater etc as they are confusing
    export type Less<A extends NumberNominal> = Refined<A, Less.E> & { max: number };
    export namespace Less {
      export type E = TaggedUnion<{ LessError: {} }>;
      export const E = TaggedUnion<E>(['LessError']).of.LessError({});

      export const refinement = <A extends NumberNominal>(max: number): Less<A> => ({
        ...refine<A, E>(Result.fromPredicate(Less.E, (n) => n < max)),
        max
      });
    }

    export type LessEqual<A extends NumberNominal> = Refined<A, LessEqual.E> & { max: number };
    export namespace LessEqual {
      export type E = TaggedUnion<{ LessEqualError: {} }>;
      export const E = TaggedUnion<E>(['LessEqualError']).of.LessEqualError({});

      export const refinement = <A extends NumberNominal>(max: number): LessEqual<A> => ({
        ...refine<A, E>(Result.fromPredicate(LessEqual.E, (n) => n <= max)),
        max
      });
    }

    export type Greater<A extends NumberNominal> = Refined<A, Greater.E> & { min: number };
    export namespace Greater {
      export type E = TaggedUnion<{ GreaterError: {} }>;
      export const E = TaggedUnion<E>(['GreaterError']).of.GreaterError({});

      export const refinement = <A extends NumberNominal>(min: number): Greater<A> => ({
        ...refine<A, E>(Result.fromPredicate(E, (n) => n > min)),
        min
      });
    }

    export type GreaterEqual<A extends NumberNominal> = Refined<A, GreaterEqual.E> & { min: number };
    export namespace GreaterEqual {
      export type E = TaggedUnion<{ GreaterEqualError: {} }>;
      export const E = TaggedUnion<E>(['GreaterEqualError']).of.GreaterEqualError({});

      export const refinement = <A extends NumberNominal>(min: number): GreaterEqual<A> => ({
        ...refine<A, E>(Result.fromPredicate(GreaterEqual.E, (n) => n >= min)),
        min
      });
    }

    export namespace Bounds {
      export type Inclusive<A extends NumberNominal> = Boolean.And<A, GreaterEqual<A>, LessEqual<A>> & {
        min: number;
        max: number;
      };
      export const Inclusive = <A extends NumberNominal>(min: number, max: number): Inclusive<A> => ({
        ...Boolean.And<A, GreaterEqual<A>, LessEqual<A>>(GreaterEqual.refinement(min), LessEqual.refinement(max)),
        min,
        max
      });

      export type Exclusive<A extends NumberNominal> = Boolean.And<A, Greater<A>, Less<A>> & {
        min: number;
        max: number;
      };
      export const Exclusive = <A extends NumberNominal>(min: number, max: number): Exclusive<A> => ({
        ...Boolean.And<A, Greater<A>, Less<A>>(Greater.refinement(min), Less.refinement(max)),
        min,
        max
      });

      export type LowerInclusiveUpperExclusive<A extends NumberNominal> = Boolean.And<A, GreaterEqual<A>, Less<A>> & {
        min: number;
        max: number;
      };
      export const LowerInclusiveUpperExclusive = <A extends NumberNominal>(
        min: number,
        max: number
      ): LowerInclusiveUpperExclusive<A> => ({
        ...Boolean.And<A, GreaterEqual<A>, Less<A>>(GreaterEqual.refinement(min), Less.refinement(max)),
        min,
        max
      });

      export type LowerExclusiveUpperInclusive<A extends NumberNominal> = Boolean.And<A, Greater<A>, LessEqual<A>> & {
        min: number;
        max: number;
      };
      export const LowerExclusiveUpperInclusive = <A extends NumberNominal>(
        min: number,
        max: number
      ): LowerExclusiveUpperInclusive<A> => ({
        ...Boolean.And<A, Greater<A>, LessEqual<A>>(Greater.refinement(min), LessEqual.refinement(max)),
        min,
        max
      });
    }
  }
}
