import { InferMatch, TagUnion, match_, Pattern } from './match';

type Tags<ADT extends TagUnion> = ADT['tag'];

export type Member<ADT extends TagUnion, Tag extends Tags<ADT>> = InferMatch<'tag', ADT, Tag>;

export type UntaggedMember<ADT extends TagUnion, Tag extends Tags<ADT>> = Omit<Member<ADT, Tag>, 'tag'>;

type As<ADT extends TagUnion> = {
  [Tag in Tags<ADT>]: (args: UntaggedMember<ADT, Tag>) => Member<ADT, Tag>;
};

type Of<ADT extends TagUnion> = {
  [Tag in Tags<ADT>]: (args: UntaggedMember<ADT, Tag>) => ADT;
};

type Is<ADT extends TagUnion> = {
  [Tag in Tags<ADT>]: (arg: ADT) => arg is Member<ADT, Tag>;
};

type Match<ADT extends TagUnion> = <A>(pattern: Pattern<'tag', ADT, A>) => (adt: ADT) => A;

export type TaggedUnionUtils<ADT extends TagUnion> = {
  as: As<ADT>;
  of: Of<ADT>;
  is: Is<ADT>;
  match: Match<ADT>;
};

type TagTuple<U extends string, R extends string[] = []> = {
  [S in U]: Exclude<U, S> extends never ? [...R, S] : TagTuple<Exclude<U, S>, [...R, S]>;
}[U];

const makeAs = <ADT extends TagUnion>(tags: TagTuple<Tags<ADT>>): As<ADT> => {
  // @ts-ignore typescript sees TagTuple as a possible infinite type so this disables the warning
  return (tags as Array<Tags<ADT>>).reduce<As<ADT>>(
    (acc, tag) => ({
      ...acc,
      [tag]: (args: UntaggedMember<ADT, typeof tag>) => ({
        ...args,
        tag
      })
    }),
    {} as As<ADT>
  );
};

const makeIs = <ADT extends TagUnion>(tags: TagTuple<Tags<ADT>>): Is<ADT> => {
  // @ts-ignore typescript sees TagTuple as a possible infinite type so this disables the warning
  return (tags as Array<Tags<ADT>>).reduce<Is<ADT>>(
    (acc, tag) => ({ ...acc, [tag]: (arg: ADT) => arg.tag === tag }),
    {} as Is<ADT>
  );
};

const makeOf = <ADT extends TagUnion>(tags: TagTuple<Tags<ADT>>): Of<ADT> => {
  // @ts-ignore typescript sees TagTuple as a possible infinite type so this disables the warning
  return (tags as Array<Tags<ADT>>).reduce<Of<ADT>>(
    (acc, tag) => ({
      ...acc,
      [tag]: (args: UntaggedMember<ADT, typeof tag>) => ({
        ...args,
        tag
      })
    }),
    {} as Of<ADT>
  );
};

type Flatten<A> = { [K in keyof A]: A[K] } & {};

export type TaggedUnion<A extends Record<string, {}>> = {
  [Tag in keyof A]: Flatten<{ tag: Tag } & A[Tag]>;
}[keyof A];

export const TaggedUnion = <ADT extends TagUnion>(tags: TagTuple<Tags<ADT>>): TaggedUnionUtils<ADT> => ({
  // @ts-ignore typescript sees TagTuple as a possible infinite type so this disables the warning
  as: makeAs(tags),
  is: makeIs(tags),
  of: makeOf(tags),
  match: match_
});
