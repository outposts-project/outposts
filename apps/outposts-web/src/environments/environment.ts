export const environment = {
  APP_ORIGIN: process.env['OUTPOSTS_WEB_ORIGIN'] as string,
  AUTH_APPID: process.env['OUTPOSTS_WEB_AUTH_APPID'] as string,
  AUTH_ENDPOINT: process.env['AUTH_ENDPOINT'] as string,
  AUTH_TYPE: process.env['AUTH_TYPE'] as string,
  APP_VERSION: process.env['APP_VERSION'] as string,
  CONFLUENCE_API_ENDPOINT: process.env['CONFLUENCE_API_ENDPOINT'] as string,
  production: true,
  ssr: false,
};