import { UIO, IO } from './IO/fluent';

export interface Ref<A> {
  read: UIO<A>;
  write: (a: A) => UIO<void>;
  modify: <B>(f: (a: A) => [B, A]) => UIO<B>;
  update: (f: (a: A) => A) => UIO<A>;
  update_: (f: (a: A) => A) => UIO<void>;
}

export class IORef<A> implements Ref<A> {
  static make = <A>(a: A): UIO<IORef<A>> => IO.succeed(new IORef(a));

  private constructor(private value: A) {}

  read: UIO<A> = IO.sync(() => this.value);

  write: (a: A) => UIO<void> = (a) => {
    this.value = a;
    return IO.unit;
  };

  modify: <B>(f: (a: A) => [B, A]) => UIO<B> = (f) => {
    const [b, a] = f(this.value);
    this.value = a;
    return IO.succeed(b);
  };

  update: (f: (a: A) => A) => UIO<A> = (f) => {
    this.value = f(this.value);
    return IO.succeed(this.value);
  };

  update_: (f: (a: A) => A) => UIO<void> = (f) => {
    this.value = f(this.value);
    return IO.unit;
  };
}
