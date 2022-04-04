import * as t from 'io-ts';
import { identity } from './Function';
import { match } from './match';
import { serialisableC, Serialisable, isInstanceOfUriClass } from './Serialisable';

export type URI = 'Maybe';

export class Maybe<A> {
  static just = <A>(a: A): Maybe<A> => new Maybe({ tag: 'Just', value: a });

  static nothing = new Maybe<never>({ tag: 'Nothing' });

  static fromNullable = <A>(a: A | null | undefined): Maybe<A> =>
    a === null || a === undefined ? Maybe.nothing : Maybe.just(a);

  static tryCatch = <A>(f: () => A): Maybe<A> => {
    try {
      return Maybe.just(f());
    } catch (e) {
      return Maybe.nothing;
    }
  };

  private constructor(private readonly value: t<A>) {}

  uri: URI = 'Maybe';

  map = <B>(f: (a: A) => B): Maybe<B> => this.flatMap((a) => Maybe.just(f(a)));

  flatMap = <B>(f: (a: A) => Maybe<B>): Maybe<B> => this.fold(Maybe.nothing, f);

  mapNullable = <B>(f: (a: A) => B | undefined | null): Maybe<B> => this.flatMap((a) => Maybe.fromNullable(f(a)));

  fold = <B>(onNothing: B, onJust: (a: A) => B): B =>
    match(this.value, {
      Just: ({ value }) => onJust(value),
      Nothing: () => onNothing
    });

  foldL = <B>(onNothing: () => B, onJust: (a: A) => B): B =>
    match(this.value, {
      Just: ({ value }) => onJust(value),
      Nothing: onNothing
    });

  getOrElse(a: A): A {
    return this.fold(a, identity);
  }

  filter = (p: (a: A) => boolean): Maybe<A> => this.flatMap((a) => (p(a) ? Maybe.just(a) : Maybe.nothing));

  isNothing: boolean = this.fold(true, () => false);

  isJust = !this.isNothing;

  exists = (p: (a: A) => boolean): boolean => this.fold(false, p);

  toNullable: A | null = this.fold(null, identity);

  foldToNullable = <B>(f: (a: A) => B): B | null => this.fold(null, f);
}

type t<A> = Nothing | Just<A>;
type Nothing = { tag: 'Nothing' };
type Just<A> = { tag: 'Just'; value: A };

const uriC = t.literal<URI>('Maybe');
const tC = <A>(a: t.Type<A>): t.Type<t<A>> =>
  t.union([t.type({ tag: t.literal('Just'), value: a }), t.type({ tag: t.literal('Nothing') })]);

export type SerialiseableMaybe<A> = Serialisable<URI, t<A>>;
export const serialisableMaybeC = <A>(a: t.Type<A>): t.Type<Serialisable<URI, t<A>>> => serialisableC(uriC, tC(a));

export const fromSerialisable = <A>(a: t.Type<A>): t.Type<Maybe<A>> =>
  new t.Type<Maybe<A>>(
    'Maybe',
    (input: unknown): input is Maybe<A> => serialisableMaybeC(a).is(input),
    (input, context) => {
      const outcome = serialisableMaybeC(a).validate(input, context);
      if (outcome._tag === 'Right') {
        if (outcome.right.value.tag === 'Just') {
          return t.success(Maybe.just(outcome.right.value.value));
        } else {
          return t.success(Maybe.nothing);
        }
      } else {
        return outcome;
      }
    },
    t.identity
  );

const isMaybe =
  <A>(a: t.Type<A>) =>
  (input: unknown): input is Maybe<A> =>
    maybeC(a).is(input) && input instanceof Maybe;

const maybeC = <A>(a: t.Type<A>) => t.type({ value: tC(a) });

export const JustC = <A>(a: t.Type<A>) =>
  new t.Type<Maybe<A>>(
    'Just',
    (input: unknown): input is Maybe<A> => isMaybe(a)(input) && input.isJust,
    (input, context) => {
      const failure = t.failure<Maybe<A>>(input, context, `Input is not a Just`);
      if (isMaybe(a)(input)) {
        return input.fold(failure, (value) => t.success(Maybe.just(value)));
      } else {
        return failure;
      }
    },
    t.identity
  );

export const NothingC = <A>(a: t.Type<A>) =>
  new t.Type<Maybe<A>>(
    'Nothing',
    (input: unknown): input is Maybe<A> => isMaybe(a)(input) && input.isNothing,
    (input, context) => {
      const failure = t.failure<Maybe<A>>(input, context, `Input is not Nothing`);
      if (isMaybe(a)(input)) {
        return input.fold(t.success(Maybe.nothing), () => failure);
      } else {
        return failure;
      }
    },
    t.identity
  );

export const MaybeC = <A>(a: t.Type<A>) =>
  new t.Type<Maybe<A>>(
    'Maybe',
    isMaybe(a),
    (input, context) => {
      if (isMaybe(a)(input)) {
        return input.fold(t.success(Maybe.nothing), (value) => t.success(Maybe.just(value)));
      } else {
        return t.failure(input, context, `Input is not a Maybe.`);
      }
    },
    t.identity
  );

export const requiredC = <A, O>(aC: t.Type<A, O, unknown>, message: string = `${aC.name} is required.`) =>
  new t.Type<A, Maybe<O>, unknown>(
    'Required',
    (input: unknown): input is A => aC.is(input),
    (input: unknown, context: t.Context): t.Validation<A> => {
      if (input instanceof Maybe || isInstanceOfUriClass<'Maybe', Maybe<any>>('Maybe', input)) {
        return input.fold(t.failure(input, context, message), (a) => aC.validate(a, context));
      } else {
        return t.failure(input, context, 'Could not parse Value.');
      }
    },
    (a: A): Maybe<O> => Maybe.just(aC.encode(a))
  );
