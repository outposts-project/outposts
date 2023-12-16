declare global {
  const process: {
    env: {
      AUTH_TYPE: 'JWT' | 'DEV_NO_AUTH',
      OUTPOSTS_WEB_AUTH_APPID: string,
      AUTH_ENDPOINT: string,
      APP_VERSION: string
    }
  }
}

export {};
