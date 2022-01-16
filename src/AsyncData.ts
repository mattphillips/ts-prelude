import { Maybe } from './Maybe';
import { TaggedUnion } from './TaggedUnion';

export type t<A> = TaggedUnion<{
  Init: {};
  Loading: {};
  Reloading: { value: A };
  Complete: { value: A };
}>;

export class AsyncData<A> {
  static init = <A>(): AsyncData<A> => new AsyncData({ tag: 'Init' });

  static loading = <A>(): AsyncData<A> => new AsyncData({ tag: 'Loading' });

  static reloading = <A>(value: A): AsyncData<A> => new AsyncData<A>({ tag: 'Reloading', value });

  static complete = <A>(value: A): AsyncData<A> => new AsyncData({ tag: 'Complete', value });

  private readonly t = TaggedUnion<t<A>>(['Init', 'Loading', 'Reloading', 'Complete']);

  private constructor(private readonly value: t<A>) {}

  isComplete: boolean = this.t.is.Complete(this.value);

  isInit: boolean = this.t.is.Init(this.value);

  isLoading: boolean = this.t.is.Loading(this.value);

  isReloading: boolean = this.t.is.Reloading(this.value);

  isBusy: boolean = this.isLoading || this.isReloading;

  isIdle: boolean = !this.isBusy;

  toBusy = (): AsyncData<A> => this.foldByValue<AsyncData<A>>(AsyncData.loading, AsyncData.reloading);

  getComplete = (): Maybe<A> => (this.t.is.Complete(this.value) ? Maybe.just(this.value.value) : Maybe.nothing);

  fold = <B>(onInit: () => B, onLoading: () => B, onReloading: (r: A) => B, onComplete: (r: A) => B): B =>
    this.t.match({
      Init: onInit,
      Loading: onLoading,
      Reloading: ({ value }) => onReloading(value),
      Complete: ({ value }) => onComplete(value)
    })(this.value);

  foldByValue = <B>(onEmpty: () => B, onValue: (r: A) => B): B => this.fold(onEmpty, onEmpty, onValue, onValue);

  map = <B>(f: (a: A) => B): AsyncData<B> =>
    this.fold<AsyncData<B>>(
      AsyncData.init,
      AsyncData.loading,
      (value) => AsyncData.reloading(f(value)),
      (value) => AsyncData.complete(f(value))
    );
}
