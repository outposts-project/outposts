import { environment } from "@/environments/environment";
import { TranslocoHttpLoader } from '@/app/transloco-loader';

export const TranslocoConfig = {
  config: {
    availableLangs: ['en', 'zh_CN', 'zh_TW'],
    defaultLang: 'en',
    // Remove this option if your application doesn't support changing language in runtime.
    reRenderOnLangChange: true,
    prodMode: environment.production,
  },
  loader: TranslocoHttpLoader
}
