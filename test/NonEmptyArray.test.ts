import { Eq } from 'fp-ts/lib/number';
import { groupBy } from 'src/NonEmptyArray';

describe('NonEmptyArray', () => {
  test('`groupBy` collects elements from the result of the given function', () => {
    const groupByLength = groupBy<string, number>((a) => a.length, Eq);
    expect(groupByLength(['foo'])).toEqual([[3, ['foo']]]);
    expect(groupByLength(['foo', 'bar', 'foobar'])).toEqual([
      [3, ['foo', 'bar']],
      [6, ['foobar']]
    ]);
  });
});
