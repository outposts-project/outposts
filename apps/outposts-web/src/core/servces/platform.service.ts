import { WINDOW } from '@/core/providers/window';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlatformService {
    private platformId = inject(PLATFORM_ID);
    private document = inject(DOCUMENT);
    private window = inject(WINDOW);


    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId) && this.window !== null && this.window !== undefined;
    }
}
