import fc from 'fast-check';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Maybe } from './Maybe';

type Config = {
  beforeEach?: () => void;
  afterEach?: () => void;
  timeout?: number;
  runs: number;
};

const defaultConfig: Required<Config> = {
  beforeEach: () => {},
  afterEach: () => {},
  timeout: 5000,
  runs: 100
};

export const asyncProperty = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Promise<boolean | void>,
  config: Config = defaultConfig
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test(
    title,
    async () =>
      fc.assert(fc.asyncProperty(arbs, predicate).beforeEach(beforeEach).afterEach(afterEach), {
        numRuns: config.runs
      }),
    timeout
  );
};

asyncProperty.skip = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Promise<boolean | void>,
  config: Config = defaultConfig
) => {
  test.skip(title, () => {});
};
asyncProperty.only = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Promise<boolean | void>,
  config: Config = defaultConfig
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test.only(
    title,
    async () =>
      fc.assert(fc.asyncProperty(arbs, predicate).beforeEach(beforeEach).afterEach(afterEach), {
        numRuns: config.runs
      }),
    timeout
  );
};

export const property = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => boolean | void,
  config: Config = defaultConfig
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test(
    title,
    async () =>
      fc.assert(fc.property(arbs, predicate).afterEach(afterEach).beforeEach(beforeEach), { numRuns: config.runs }),
    timeout
  );
};

property.skip = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => boolean | void,
  config: Config = defaultConfig
) => {
  test.skip(title, () => {});
};

property.only = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => boolean | void,
  config: Config = defaultConfig
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test.only(
    title,
    async () =>
      fc.assert(fc.property(arbs, predicate).afterEach(afterEach).beforeEach(beforeEach), { numRuns: config.runs }),
    timeout
  );
};

export namespace Arbitrary {
  export const set = <A>(a: fc.Arbitrary<A>, c: fc.SetConstraints<A>): fc.Arbitrary<Set<A>> =>
    fc.set(a, c).map((as) => new Set([...as]));

  export const maybe = <A>(a: fc.Arbitrary<A>): fc.Arbitrary<Maybe<A>> => fc.option(a).map(Maybe.fromNullable);

  export const iterable = ({
    minLength,
    maxLength
  }: {
    minLength?: number;
    maxLength?: number;
  }): fc.Arbitrary<Iterable<any>> =>
    fc.oneof(
      fc.string({ minLength, maxLength }),
      fc.array(fc.anything(), { minLength, maxLength }),
      fc.int32Array({ minLength, maxLength }),
      fc.uint32Array({ minLength, maxLength }),
      Arbitrary.set(fc.anything(), {
        minLength,
        maxLength
      })
      // // TODO: Not the best definition of a map
      // Arbitrary.set(fc.anything(), { minLength }).map((s) => new Map([...s].map((i) => [i, i])))
    );

  export const nonEmptyArray = <A>(a: fc.Arbitrary<A>): fc.Arbitrary<NonEmptyArray<A>> =>
    fc.array(a, { minLength: 1 }).map((array) => array as NonEmptyArray<A>);
}
