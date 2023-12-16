import {Component, computed, inject, Input} from "@angular/core";
import {DocTableOfContentsScrollSpy} from "@app/doc/services/doc-table-of-contents-scroll-spy.service";
import {DocTableOfContentsLoader} from "@app/doc/services/doc-table-of-contents-loader.service";
import {DocTableOfContentsItem, DocTableOfContentsLevel} from "@app/doc/defs/doc-table-of-contents.defs";

@Component({
  selector: 'app-doc-toc',
  templateUrl: './doc-table-of-contents.component.html',
  styleUrl: './doc-table-of-contents.component.scss'
})
export class DocTableOfContentsComponent {
  @Input({ required: true })
  contentSourceContent!: HTMLElement;

  private readonly scrollSpy = inject(DocTableOfContentsScrollSpy);
  private readonly tableOfContentsLoader = inject(DocTableOfContentsLoader);

  activeItemId = this.scrollSpy.activeItemId;
  shouldDisplayScrollOnTop = computed(() => !this.scrollSpy.scrollbarThumbOnTop());
  TableOfContentsLevel = DocTableOfContentsLevel;

  tableOfContentsItems (): DocTableOfContentsItem[] {
    return this.tableOfContentsLoader.tableOfContentsItems;
  }

  ngAfterViewInit () {
    this.tableOfContentsLoader.buildTableOfContents(this.contentSourceContent);
    this.scrollSpy.startListeningToScroll(this.contentSourceContent);
  }

  scrollToTop (): void {
    this.scrollSpy.scrollToTop();
  }
}
