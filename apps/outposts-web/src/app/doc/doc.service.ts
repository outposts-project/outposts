import {Injectable} from "@angular/core";
import {combineLatest, forkJoin, map, Observable, tap} from "rxjs";
import {AppAssetService} from "@app/core/app-asset.service";

@Injectable()
export class DocService {
  constructor(
    private assetService: AppAssetService
  ) {}

  loadMermaid (): Observable<void> {
    return this.assetService.loadScript('mermaid.js') as Observable<any>
  }

  isMermaidLoaded$ (): Observable<boolean> {
    return this.assetService.isScriptLoaded$('mermaid.js')
  }

  loadKatex (): Observable<void> {
    return forkJoin(
      [
        this.assetService.loadScript('katex.js'),
        this.assetService.loadLink('katex.css',{ rel: 'stylesheet' }),
      ]
    ) as Observable<any>
  }

  isKatexLoaded$ (): Observable<boolean> {
    return combineLatest(
      [
        this.assetService.isScriptLoaded$('katex.js'),
        this.assetService.isLinkLoaded$('katex.css')
      ]
    ).pipe(
      map(([scriptLoaded, styleLoaded]) => scriptLoaded && styleLoaded)
    )
  }
}
