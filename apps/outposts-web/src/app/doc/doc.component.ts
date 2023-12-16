import {Component, Input, OnInit} from "@angular/core";
import {DocService} from "./doc.service";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {
  combineLatest,
  distinctUntilChanged, EMPTY,
  filter,
  map,
  Observable,
  of,
  shareReplay, startWith,
  switchMap, tap, throwError
} from "rxjs";
import {Observe} from "@app/core/rx";
import {isNil} from "lodash-es";
import {HttpClient} from "@angular/common/http";
import {KatexOptions} from "ngx-markdown";
import {DocClipboardButtonComponent} from "@app/doc/doc-clipboard-button.component";

@UntilDestroy()
@Component({
  selector: 'app-doc',
  templateUrl: './doc.component.html',
  styles: `.doc-skeleton {
    max-height: 100%;
  }`,
  styleUrls: [
    // only works on direct child
    './markdown-themes/github-markdown-light.css'
  ],
  host: {
    '[class.doc-loading]': "isDataReady",
  }
})
export class DocComponent implements OnInit {
  readonly ClipboardButtonComponent = DocClipboardButtonComponent

  @Input('data')
  propData?: string;

  @Input('src')
  propSrc?: string;

  @Input()
  skeleton: boolean = true;

  @Input()
  lineNumbers: boolean = false;

  @Observe('propData')
  propData$!: Observable<string | undefined>;

  @Observe('propSrc')
  propSrc$!: Observable<string | undefined>;

  data$!: Observable<string>;

  isMermaidRequired$: Observable<boolean>;
  isMermaidLoaded$: Observable<boolean>;

  isKatexRequired$: Observable<boolean>;
  isKatexLoaded$: Observable<boolean>;

  isDataReady$: Observable<boolean>;
  isDataReady: boolean = false;
  isResourceReady$: Observable<boolean>;

  katexOptions: KatexOptions = {
    displayMode: true
  }

  constructor(
    private mdService: DocService,
    private httpClient: HttpClient,
  ) {
    const propSrcData$ =
      this.propSrc$.pipe(
        distinctUntilChanged(),
        switchMap(src => {
          if (src) {
            return httpClient.get(src, {responseType: 'text'})
              .pipe(
                map(response => response.toString()),
                startWith(undefined)
              )
          } else {
            return of('')
          }
        }),
        shareReplay(1)
      );
    this.data$ = combineLatest([
      this.propData$,
      propSrcData$.pipe(filter(data => !isNil(data))) as Observable<string>
    ]).pipe(
      map(([data, srcData]) => data ?? srcData),
      shareReplay(1)
    );
    this.isDataReady$ = combineLatest(
      [
        this.propData$.pipe(map(() => true)),
        this.propSrc$.pipe(map((data) => !isNil(data)))
      ]
    ).pipe(
      map(([dataReady, srcReady]) => dataReady || srcReady),
      tap((value) => this.isDataReady = value),
    );
    this.isMermaidRequired$ = this.data$.pipe(map(this.detectMermaid.bind(this)));
    this.isMermaidLoaded$ = this.mdService.isMermaidLoaded$();

    this.isKatexRequired$ = this.data$.pipe(map(this.detectKatex.bind(this)));
    this.isKatexLoaded$ = this.mdService.isKatexLoaded$();

    this.isResourceReady$ = combineLatest(
      [
        this.isMermaidRequired$,
        this.isMermaidLoaded$,
        this.isKatexRequired$,
        this.isKatexLoaded$,
        this.data$
      ]
    ).pipe(
      map(
        ([
           mermaidRequired,
           mermaidLoaded,
           katexRequired,
           katexLoaded,
         ]) => (
          !mermaidRequired || mermaidLoaded
        ) && (
          !katexRequired || katexLoaded
        )
      )
    );
  }

  detectMermaid(data: string) {
    return /```mermaid/.test(data)
  }

  detectKatex(data: string) {
    return /\$\$|katex/.test(data)
  }

  ngOnInit(): void {
    this.isMermaidRequired$.pipe(
      filter((hasMermaid) => hasMermaid),
      switchMap(() => this.mdService.loadMermaid()),
      untilDestroyed(this)
    ).subscribe();
    this.isKatexRequired$.pipe(
      filter((hasKatex) => hasKatex),
      switchMap(() => this.mdService.loadKatex()),
      untilDestroyed(this)
    ).subscribe();
    combineLatest(
      [
        this.propData$,
        this.propSrc$,
      ]
    ).pipe(
      switchMap(([data, src]) => {
        if (isNil(data) && isNil(src)) {
          return throwError(() => new Error('DocComponent Error: can not set both src and data'))
        }
        return EMPTY;
      }),
      untilDestroyed(this)
    ).subscribe();
  }
}
