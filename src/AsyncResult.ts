import { Result } from './Result';
import { constantFalse } from './Function';
import { Maybe } from './Maybe';
import { AsyncData } from './AsyncData';

export class AsyncResult<E, A> {
  static init = <E, A>(): AsyncResult<E, A> => new AsyncResult(AsyncData.init());

  static loading = <E, A>(): AsyncResult<E, A> => new AsyncResult(AsyncData.loading());

  static reloadingOk = <E, A>(a: A): AsyncResult<E, A> => new AsyncResult<E, A>(AsyncData.reloading(Result.ok(a)));

  static reloadingError = <E, A>(e: E): AsyncResult<E, A> =>
    new AsyncResult<E, A>(AsyncData.reloading(Result.error(e)));

  static completeOk = <E, A>(a: A): AsyncResult<E, A> => new AsyncResult(AsyncData.complete(Result.ok(a)));

  static completeError = <E, A>(e: E): AsyncResult<E, A> => new AsyncResult(AsyncData.complete(Result.error(e)));

  private constructor(private readonly value: AsyncData<Result<E, A>>) {}

  fold = <B>(
    onInit: () => B,
    onLoading: () => B,
    onReloading: (r: Result<E, A>) => B,
    onComplete: (r: Result<E, A>) => B
  ): B => this.value.fold(onInit, onLoading, onReloading, onComplete);

  foldByValue = <B>(onEmpty: () => B, onError: (e: E) => B, onComplete: (a: A) => B): B =>
    this.fold(
      onEmpty,
      onEmpty,
      (res) => res.fold(onError, onComplete),
      (res) => res.fold(onError, onComplete)
    );

  isComplete: boolean = this.value.isComplete;

  isCompleteOk: boolean = this.fold(constantFalse, constantFalse, constantFalse, (r) => r.isOk);

  isCompleteError: boolean = this.fold(constantFalse, constantFalse, constantFalse, (r) => r.isError);

  isInit: boolean = this.value.isInit;

  isLoading: boolean = this.value.isLoading;

  isReloading: boolean = this.value.isReloading;

  isReloadingOk: boolean = this.fold(constantFalse, constantFalse, (r) => r.isOk, constantFalse);

  isReloadingError: boolean = this.fold(constantFalse, constantFalse, (r) => r.isError, constantFalse);

  isBusy: boolean = this.value.isBusy;

  isIdle: boolean = this.value.isIdle;

  toBusy = (): AsyncResult<E, A> => new AsyncResult(this.value.toBusy());

  getComplete = (): Maybe<Result<E, A>> => this.value.getComplete();

  getCompleteOk = (): Maybe<A> => this.getComplete().flatMap((res) => res.getOk());

  getCompleteError = (): Maybe<E> => this.getComplete().flatMap((res) => res.getError());

  getOk = (): Maybe<A> =>
    this.foldByValue(
      () => Maybe.nothing,
      () => Maybe.nothing,
      (a) => Maybe.just(a)
    );

  map = <B>(f: (a: A) => B): AsyncResult<E, B> => new AsyncResult(this.value.map((res) => res.map(f)));
}
