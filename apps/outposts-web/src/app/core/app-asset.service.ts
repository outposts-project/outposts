/**
 * source partial from [ngx-script-loader](https://github.com/muratcorlu/ngx-script-loader)
 */
import {Injectable, Inject} from '@angular/core';
import {
  BehaviorSubject, catchError,
  distinctUntilChanged,
  filter,
  iif,
  map,
  mapTo,
  Observable,
  of,
  startWith,
  switchMap, tap
} from 'rxjs';
import {take, shareReplay} from 'rxjs/operators';
import {DOCUMENT} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AppAssetService {
  private loaders: { [url: string]: Observable<Event> } = {};
  private loaded$: { [url: string]: BehaviorSubject<Event | undefined> } = {}

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  private _loadScript(url: string, attributes?: {
    [s: string]: string
  }, targetEl: HTMLElement | string = 'head'): Observable<Event> {
    return new Observable<Event>((observer) => {
      const script: HTMLScriptElement = this.document.createElement('script');

      if (attributes) {
        for (const key in attributes) {
          if (attributes.hasOwnProperty(key)) {
            script.setAttribute(key, attributes[key]);
          }
        }
      }

      script.onload = (event: Event) => {
        observer.next(event);
        observer.complete();
      };

      script.onerror = err => {
        observer.error(err);
      };

      script.src = url;

      const targetElement = typeof targetEl === 'string' ? this.document.querySelector(targetEl) : targetEl;
      if (targetElement) {
        targetElement.appendChild(script);
      } else {
        observer.error(`${this.constructor.name} loadScript error, target ${targetElement} not found`);
      }
    });
  }

  private _loadLink(
    url: string, attributes: { [attr: string]: string, rel: string }, targetEl: HTMLElement | string = 'head'
  ) {
    return new Observable<Event>((observer) => {
      const script: HTMLLinkElement = this.document.createElement('link');

      if (attributes) {
        for (const key in attributes) {
          if (attributes.hasOwnProperty(key)) {
            script.setAttribute(key, attributes[key]);
          }
        }
      }

      script.onload = (event: Event) => {
        observer.next(event);
        observer.complete();
      };

      script.onerror = err => {
        observer.error(err);
      };

      script.href = url;

      const targetElement = typeof targetEl === 'string' ? this.document.querySelector(targetEl) : targetEl;
      if (targetElement) {
        targetElement.appendChild(script);
      } else {
        observer.error(`${this.constructor.name} loadLink error, target ${targetElement} not found`);
      }
    });
  }

  private _getLoaded$ (url: string): BehaviorSubject<Event | undefined> {
    return this.loaded$[url] = this.loaded$[url] || new BehaviorSubject<Event | undefined>(undefined);
  }

  loadScript(url: string, attributes?: Record<string, string>, targetEl: HTMLElement | string = 'head'): Observable<Event> {
    return this.loaders[url] = this.loaders[url] || this._loadScript(url, attributes, targetEl).pipe(
      take(1),
      shareReplay(1),
      tap(value => this._getLoaded$(url).next(value)),
      catchError(e => {
        this._getLoaded$(url).error(e);
        return of(e);
      })
    );
  }

  loadLink(url: string, attributes: { [attr: string]: string, rel: string }, targetEl: HTMLElement | string = 'head'): Observable<Event> {
    return this.loaders[url] = this.loaders[url] || this._loadLink(url, attributes, targetEl).pipe(
      take(1),
      shareReplay(1),
      tap(value => this._getLoaded$(url).next(value)),
      catchError(e => {
        this._getLoaded$(url).error(e);
        return of(e);
      })
    );
  }

  isAssetLoaded$(url: string): Observable<boolean> {
    return this._getLoaded$(url)
      .pipe(
        map(loaded => !!loaded),
      )
  }

  isLinkLoaded$(url: string): Observable<boolean> {
    return this.isAssetLoaded$(url);
  }

  isScriptLoaded$(url: string): Observable<boolean> {
    return this.isAssetLoaded$(url);
  }
}
