import * as fc from 'fast-check';
import { refine, Refined } from 'src/Refined';
import { Arbitrary, property } from 'src/Property';
import { Nominal } from 'src/Nominal';
import { Result } from 'src/Result';

describe('Refined', () => {
  describe('Boolean', () => {
    type Value = Nominal<string, { readonly Value: unique symbol }>;

    const pass = refine<Value, { tag: 'Never' }>(Result.fromPredicate({ tag: 'Never' }, () => true));
    type pass = typeof pass;
    const FailedError = { tag: 'Failed' as const };
    const fail = refine<Value, { tag: 'Failed' }>(Result.fromPredicate(FailedError, () => false));
    type fail = typeof fail;

    describe('And', () => {
      test('`from` constructs an OK instance of Value when both refinements hold', () => {
        expect(Refined.Boolean.And<Value, pass, pass>(pass, pass).is('happy')).toBe(true);
        expectValue(Refined.Boolean.And<Value, pass, pass>(pass, pass).from('happy'), Result.ok('happy'));
      });

      test('`from` constructs an Error instance of Value when the left refinement fails', () => {
        expectValue(Refined.Boolean.And<Value, fail, pass>(fail, pass).from('happy'), Result.error(FailedError));
      });

      test('`from` constructs an Error instance of Value when the left refinement passes and right refinement fails', () => {
        expectValue(Refined.Boolean.And<Value, pass, fail>(pass, fail).from('happy'), Result.error(FailedError));
      });
    });

    describe('Or', () => {
      test('`from` constructs an OK instance of Value when left refinement passes', () => {
        expect(Refined.Boolean.Or<Value, pass, fail>(pass, fail).is('happy')).toBe(true);
        expectValue(Refined.Boolean.Or<Value, pass, fail>(pass, fail).from('happy'), Result.ok('happy'));
      });

      test('`from` constructs an OK instance of Value when left refinement fails and right refinement passes', () => {
        expect(Refined.Boolean.Or<Value, fail, pass>(fail, pass).is('happy')).toBe(true);
        expectValue(Refined.Boolean.Or<Value, fail, pass>(fail, pass).from('happy'), Result.ok('happy'));
      });

      test('`from` constructs an Error instance of Value when both refinements fail', () => {
        expectValue(Refined.Boolean.Or<Value, fail, fail>(fail, fail).from('happy'), Result.error(FailedError));
      });
    });
  });

  describe('Iterable', () => {
    type Value = Nominal<Iterable<any>, { readonly Value: unique symbol }>;

    describe('MinLength', () => {
      const minLength = 10;
      const Value = Refined.Iterable.MinLength.refinement<Value>(minLength);

      property(
        '`from` constructs an Ok instance of `Value` forall iterables with a length greater than or equal to the minimum',
        Arbitrary.iterable({ minLength }),
        (i) => {
          expect(Value.is(i)).toBe(true);
          expectValue(Value.from(i), Result.ok(i));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall iterables with a length less than the minimum',
        Arbitrary.iterable({ maxLength: minLength - 1 }),
        (i) => expectValue(Value.from(i), Result.error(Refined.Iterable.MinLength.E({ minLength })))
      );
    });

    describe('MaxLength', () => {
      const maxLength = 10;
      const Value = Refined.Iterable.MaxLength.refinement<Value>(maxLength);

      property(
        '`from` constructs an Ok instance of `Value` forall iterables with a length less than or equal to the maximum',
        Arbitrary.iterable({ maxLength }),
        (i) => {
          expect(Value.is(i)).toBe(true);
          expectValue(Value.from(i), Result.ok(i));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall iterables with a length greater than the maximum',
        Arbitrary.iterable({ minLength: maxLength + 1 }),
        (i) => expectValue(Value.from(i), Result.error(Refined.Iterable.MaxLength.E({ maxLength })))
      );
    });

    describe('MinMaxLength', () => {
      const minLength = 10;
      const maxLength = 10;
      const Value = Refined.Iterable.MinMaxLength.refinement<Value>(minLength, maxLength);

      property(
        '`from` constructs an Ok instance of `Value` forall iterables with a length greater than or equal to the minimum and less than or equal to the maximum',
        Arbitrary.iterable({ minLength, maxLength }),
        (i) => {
          expect(Value.is(i)).toBe(true);
          expectValue(Value.from(i), Result.ok(i));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall iterables with a length less than the minimum',
        Arbitrary.iterable({ maxLength: minLength - 1 }),
        (i) => expectValue(Value.from(i), Result.error(Refined.Iterable.MinLength.E({ minLength })))
      );

      property(
        '`from` constructs an Error instance of `Value` forall iterables with a length greater than the maximum',
        Arbitrary.iterable({ minLength: maxLength + 1 }),
        (i) => expectValue(Value.from(i), Result.error(Refined.Iterable.MaxLength.E({ maxLength })))
      );
    });
  });

  describe('String', () => {
    // TODO
    describe('MatchesRegex', () => {});
  });

  describe('Number', () => {
    type Value = Nominal<number, { readonly Value: unique symbol }>;

    describe('Less', () => {
      const max = 10;
      const Value = Refined.Number.Less.refinement<Value>(max);

      property(
        '`from` constructs an Ok instance of `Value` forall numbers less than `max`',
        fc.integer({ max: max - 1 }),
        (n) => {
          expect(Value.is(n)).toBe(true);
          expectValue(Value.from(n), Result.ok(n));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall numbers greater than or equal to `max`',
        fc.integer({ min: max }),
        (n) => expectValue(Value.from(n), Result.error(Refined.Number.Less.E))
      );
    });

    describe('LessEqual', () => {
      const max = 10;
      const Value = Refined.Number.LessEqual.refinement<Value>(max);

      property(
        '`from` constructs an Ok instance of `Value` forall numbers less than or equal to `max`',
        fc.integer({ max }),
        (n) => {
          expect(Value.is(n)).toBe(true);
          expectValue(Value.from(n), Result.ok(n));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall numbers greater than `max`',
        fc.integer({ min: max + 1 }),
        (n) => expectValue(Value.from(n), Result.error(Refined.Number.LessEqual.E))
      );
    });

    describe('Greater', () => {
      const min = 10;
      const Value = Refined.Number.Greater.refinement<Value>(min);

      property(
        '`from` constructs an Ok instance of `Value` forall numbers greater than `min`',
        fc.integer({ min: min + 1 }),
        (n) => {
          expect(Value.is(n)).toBe(true);
          expectValue(Value.from(n), Result.ok(n));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall numbers less than or equal to `min`',
        fc.integer({ max: min }),
        (n) => expectValue(Value.from(n), Result.error(Refined.Number.Greater.E))
      );
    });

    describe('GreaterEqual', () => {
      const min = 10;
      const Value = Refined.Number.GreaterEqual.refinement<Value>(min);

      property(
        '`from` constructs an Ok instance of `Value` forall numbers greater than or equal to `min`',
        fc.integer({ min }),
        (n) => {
          expect(Value.is(n)).toBe(true);
          expectValue(Value.from(n), Result.ok(n));
        }
      );

      property(
        '`from` constructs an Error instance of `Value` forall numbers less than `min`',
        fc.integer({ max: min - 1 }),
        (n) => expectValue(Value.from(n), Result.error(Refined.Number.GreaterEqual.E))
      );
    });

    describe('Bounds', () => {
      describe('Exclusive', () => {
        const min = 1;
        const max = 10;
        const Value = Refined.Number.Bounds.Exclusive<Value>(min, max);

        property(
          '`from` constructs an Ok instance of `Value` forall numbers greater than `min` and less than `max`',
          fc.integer({ min: min + 1, max: max - 1 }),
          (n) => {
            expect(Value.is(n)).toBe(true);
            expectValue(Value.from(n), Result.ok(n));
          }
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers less than or equal to `min`',
          fc.integer({ max: min }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.Greater.E))
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers greater than or equal to `max`',
          fc.integer({ min: max }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.Less.E))
        );
      });

      describe('Inclusive', () => {
        const min = 1;
        const max = 10;
        const Value = Refined.Number.Bounds.Inclusive<Value>(min, max);

        property(
          '`from` constructs an Ok instance of `Value` forall numbers greater than or equal to `min` and less than or equal to `max`',
          fc.integer({ min, max }),
          (n) => {
            expect(Value.is(n)).toBe(true);
            expectValue(Value.from(n), Result.ok(n));
          }
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers less than `min`',
          fc.integer({ max: min - 1 }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.GreaterEqual.E))
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers greater than `max`',
          fc.integer({ min: max + 1 }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.LessEqual.E))
        );
      });

      describe('LowerInclusiveUpperExclusive', () => {
        const min = 1;
        const max = 10;
        const Value = Refined.Number.Bounds.LowerInclusiveUpperExclusive<Value>(min, max);

        property(
          '`from` constructs an Ok instance of `Value` forall numbers greater than or equal to `min` and less than `max`',
          fc.integer({ min, max: max - 1 }),
          (n) => {
            expect(Value.is(n)).toBe(true);
            expectValue(Value.from(n), Result.ok(n));
          }
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers less than `min`',
          fc.integer({ max: min - 1 }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.GreaterEqual.E))
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers greater than or equal to `max`',
          fc.integer({ min: max }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.Less.E))
        );
      });

      describe('LowerExclusiveUpperInclusive', () => {
        const min = 1;
        const max = 10;
        const Value = Refined.Number.Bounds.LowerExclusiveUpperInclusive<Value>(min, max);

        property(
          '`from` constructs an Ok instance of `Value` forall numbers greater than `min` and less than or equal to `max`',
          fc.integer({ min: min + 1, max }),
          (n) => {
            expect(Value.is(n)).toBe(true);
            expectValue(Value.from(n), Result.ok(n));
          }
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers less than or equal to `min`',
          fc.integer({ max: min }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.Greater.E))
        );

        property(
          '`from` constructs an Error instance of `Value` forall numbers greater than `max`',
          fc.integer({ min: max + 1 }),
          (n) => expectValue(Value.from(n), Result.error(Refined.Number.LessEqual.E))
        );
      });
    });
  });
});

const expectValue = (actual: any, expected: any) => {
  expect(actual.value).toEqual(expected.value);
};
