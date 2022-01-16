type Union<Discriminant extends string> = { [Literal in Discriminant]: string };

export type TagUnion = Union<'tag'>;

export type InferMatch<
  Discriminant extends string,
  ADT extends Union<Discriminant>,
  Type extends ADT[Discriminant]
> = Extract<ADT, { [Literal in Discriminant]: Type }>;

type ExhaustivePattern<Discriminant extends string, ADT extends Union<Discriminant>, A> = {
  [Kind in ADT[Discriminant]]: (m: InferMatch<Discriminant, ADT, Kind>) => A;
};

type CatchAll<Discriminant extends string, ADT extends Union<Discriminant>, A> = { _: (adt: ADT) => A };

type PartialPattern<Discriminant extends string, ADT extends Union<Discriminant>, A> = Partial<
  ExhaustivePattern<Discriminant, ADT, A>
> &
  CatchAll<Discriminant, ADT, A>;

export type Pattern<Discriminant extends string, ADT extends Union<Discriminant>, A> =
  | ExhaustivePattern<Discriminant, ADT, A>
  | PartialPattern<Discriminant, ADT, A>;

export const genericMatch =
  <Discriminant extends string>(d: Discriminant) =>
  <ADT extends Union<Discriminant>, A>(adt: ADT, pattern: Pattern<Discriminant, ADT, A>): A => {
    const match = pattern[adt[d]];
    if (typeof match === 'function') {
      return match(adt as Extract<ADT, { [Literal in Discriminant]: string }>);
    }

    return (pattern as CatchAll<Discriminant, ADT, A>)._(adt);
  };

export const match = genericMatch('tag');

export const match_ =
  <ADT extends Union<'tag'>, A>(pattern: Pattern<'tag', ADT, A>) =>
  (adt: ADT): A =>
    genericMatch('tag')(adt, pattern);

export type OmitFrom<
  Discriminant extends string,
  ADT extends Union<Discriminant>,
  Type extends ADT[Discriminant],
  Key extends keyof any
> = Omit<InferMatch<Discriminant, ADT, Type>, Key>;

export type OmitFromAll<Discriminant extends string, ADT extends Union<Discriminant>, Key extends keyof any> = {
  [Tag in ADT[Discriminant]]: OmitFrom<Discriminant, ADT, Tag, Key>;
}[ADT[Discriminant]];

export type OmitFromTag<ADT extends Union<'tag'>, Tag extends ADT['tag'], Key extends keyof any> = OmitFrom<
  'tag',
  ADT,
  Tag,
  Key
>;

export type OmitFromAllTags<ADT extends Union<'tag'>, Key extends keyof any> = OmitFromAll<'tag', ADT, Key>;
