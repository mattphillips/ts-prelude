export const noop = (): void => {};

export const identity = <A>(a: A): A => a;

export const andThrow = (u: unknown): void => {
  throw u;
};

export const constant =
  <A>(a: A) =>
  (): A =>
    a;

export const constantTrue = constant(true);
export const constantFalse = constant(false);

export const exists = <A>(a: A | null): a is A => a !== null;
