import fc from 'fast-check';

import { Maybe } from 'src/Maybe';
import { Phantom } from 'src/Phantom';
import { Result } from 'src/Result';
import { fromSerialisable, Serialisable, toSerialisable, arrayURI, objectURI } from 'src/Serialisable';
import { property } from 'src/Property';

const maybeArb = <A>(fca: fc.Arbitrary<A>): fc.Arbitrary<Maybe<A>> => fca.map(Maybe.fromNullable);

const nullArb = (): fc.Arbitrary<null> => fc.anything().map(() => null);

describe('Maybe', () => {
  describe('shallow', () => {
    property('toSerialisable -> fromSerialisable', maybeArb(fc.anything()), (ma) =>
      expect(ma.toNullable).toEqual(fromSerialisable<typeof ma>(toSerialisable(ma)).toNullable)
    );

    property('nothing -> toSerialise', maybeArb(nullArb()), (ma) =>
      expect(toSerialisable(ma)).toEqual(Serialisable(ma.uri, { tag: 'Nothing' }))
    );

    property('just -> toSerialise', maybeArb(fc.string()), (ma) =>
      expect(toSerialisable(ma)).toEqual(Serialisable(ma.uri, { tag: 'Just', value: ma.toNullable }))
    );
  });

  describe('array', () => {
    property('toSerialisable -> fromSerialisable', fc.array(maybeArb(fc.anything())), (mas) =>
      expect(mas.map((ma) => ma.toNullable)).toEqual(
        fromSerialisable<typeof mas>(toSerialisable(mas)).map((ma) => ma.toNullable)
      )
    );

    property('nothing -> toSerialise', fc.array(maybeArb(nullArb())), (mas) =>
      expect(toSerialisable(mas)).toEqual(
        Serialisable(
          arrayURI,
          mas.map((ma) => Serialisable(ma.uri, { tag: 'Nothing' }))
        )
      )
    );

    property('just -> toSerialise', fc.array(maybeArb(fc.string())), (mas) =>
      expect(toSerialisable(mas)).toEqual(
        Serialisable(
          arrayURI,
          mas.map((ma) => Serialisable(ma.uri, { tag: 'Just', value: ma.toNullable }))
        )
      )
    );
  });

  describe('object', () => {
    property('toSerialisable -> fromSerialisable', fc.record({ ma: maybeArb(fc.anything()) }), (o) =>
      expect(o.ma.toNullable).toEqual(fromSerialisable<typeof o>(toSerialisable(o)).ma.toNullable)
    );

    property('nothing -> toSerialise', fc.record({ ma: maybeArb(nullArb()) }), (o) =>
      expect(toSerialisable(o)).toEqual(Serialisable(objectURI, { ma: Serialisable(o.ma.uri, { tag: 'Nothing' }) }))
    );

    property('just -> toSerialise', fc.record({ ma: maybeArb(fc.string()) }), (o) =>
      expect(toSerialisable(o)).toEqual(
        Serialisable(objectURI, { ma: Serialisable(o.ma.uri, { tag: 'Just', value: o.ma.toNullable }) })
      )
    );
  });

  describe('mixed depth', () => {
    property(
      'toSerialisable -> fromSerialisable',
      fc.record({ mas: fc.array(maybeArb(maybeArb(fc.anything()))) }),
      (o) =>
        expect(o.mas.map((ma) => ma.toNullable?.toNullable)).toEqual(
          fromSerialisable<typeof o>(toSerialisable(o)).mas.map((ma) => ma.toNullable?.toNullable)
        )
    );
  });
});

describe('Result', () => {
  test('shallow', () => {
    const given = Result.ok(1);
    const to = toSerialisable(given);
    const back = fromSerialisable<typeof given>(to);

    expect(given.getOk().toNullable).toEqual(back.getOk().toNullable);
    expect(to).toEqual(toSerialisable(back));
  });

  test('array', () => {
    const given = [Result.ok(1)];
    const to = toSerialisable(given);
    const back = fromSerialisable<typeof given>(to);

    expect(given.map((g) => g.getOk().toNullable)).toEqual(back.map((b) => b.getOk().toNullable));
    expect(to).toEqual(toSerialisable(back));
  });

  test('object', () => {
    const given = Result.ok({ blah: Result.error(1) });
    const to = toSerialisable(given);
    const back = fromSerialisable<typeof given>(to);

    // TOOD: write a custom matcher for Result
    expect(given.getOk().toNullable?.blah.getError().toNullable).toEqual(
      back.getOk().toNullable?.blah.getError().toNullable
    );
    expect(to).toEqual(toSerialisable(back));
  });
});

describe('Phantom', () => {
  test('shallow', () => {
    const given = Phantom.make()('1');
    const to = toSerialisable(given);
    const back = fromSerialisable<typeof given>(to);

    expect(given).toEqual(back);
    expect(to).toEqual(Serialisable('Phantom', '1'));
  });

  test('object', () => {
    const given = Phantom.make()({ blah: Phantom.make()(1) });
    const to = toSerialisable(given);
    const back = fromSerialisable<typeof given>(to);

    expect(given).toEqual(back);
    expect(to).toEqual(Serialisable('Phantom', Serialisable('Object', { blah: Serialisable('Phantom', 1) })));
  });

  test('array', () => {
    const given = [Phantom.make()(1)];
    const to = toSerialisable(given);
    const back = fromSerialisable<typeof given>(to);

    expect(given).toEqual(back);
    expect(to).toEqual(Serialisable('Array', [Serialisable('Phantom', 1)]));
  });
});
