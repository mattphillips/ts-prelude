export const Nominal =
  <A extends Nominal<unknown, UniqueSymbol>>() =>
  (a: ExtractType<A>): A =>
    a as A;

export type Nominal<A, B extends UniqueSymbol> = A & Brand<A, B>;

export type SimpleNominal<A> = Nominal<A, UniqueSymbol>;

type UniqueSymbol = { [key: string]: symbol };

type ExtractType<A extends Nominal<unknown, UniqueSymbol>> = A['_raw'];

type Brand<A, B extends UniqueSymbol> = {
  /**
   * **Do not use this as a value it is not initialised.** It is used for inference.
   */
  _raw: A;
  /**
   * **Do not use this as a value it is not initialised.** It is used for uniqueness.
   */
  _brand: Unique<B>;
};

type Unique<A extends { [key: string]: symbol }> = A[keyof A];
