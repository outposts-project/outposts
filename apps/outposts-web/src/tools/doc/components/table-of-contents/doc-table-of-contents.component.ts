import { AfterViewInit, Component, computed, ElementRef, inject, Input, PLATFORM_ID } from "@angular/core";
import { DocTableOfContentsSpy } from '@/tools/doc/services/doc-table-of-contents-spy.service';
import { DocTableOfContentsLoader } from '@/tools/doc/services/doc-table-of-contents-loader.service';
import { DocTableOfContentsItem, DocTableOfContentsLevel } from '@/tools/doc/defs/doc-table-of-contents.defs';

@Component({
  standalone: false,
  selector: 'app-doc-toc',
  templateUrl: './doc-table-of-contents.component.html'
})
export class DocTableOfContentsComponent implements AfterViewInit {
  @Input({ required: true })
  contentSourceContent!: HTMLElement;

  private readonly scrollSpy = inject(DocTableOfContentsSpy);
  private readonly tableOfContentsLoader = inject(DocTableOfContentsLoader);
  private readonly tocEl: ElementRef<HTMLElement> = inject(ElementRef);

  activeItemId = this.scrollSpy.activeItemId;
  shouldDisplayScrollOnTop = computed(() => !this.scrollSpy.scrollbarThumbOnTop());
  TableOfContentsLevel = DocTableOfContentsLevel;

  tableOfContentsItems(): DocTableOfContentsItem[] {
    return this.tableOfContentsLoader.tableOfContentsItems;
  }

  ngAfterViewInit() {
    const toc = this.tocEl.nativeElement;
    const el = this.contentSourceContent;
    this.tableOfContentsLoader.buildTableOfContents(el);
    this.scrollSpy.startListeningChange(el, toc);
  }

  scrollToTop(): void {
    this.scrollSpy.scrollToTop();
  }
}
