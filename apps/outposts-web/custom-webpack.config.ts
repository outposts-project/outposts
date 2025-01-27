import { EnvironmentPlugin } from 'webpack';
import dotenv from 'dotenv';
import path from 'node:path';
import { version } from './package.json';
import type {
  CustomWebpackBrowserSchema,
  TargetOptions,
} from '@angular-builders/custom-webpack';
import type * as webpack from 'webpack';
import fs from 'node:fs';

dotenv.config();
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

// Export a configuration object
// See [Webpack's documentation](https://webpack.js.org/configuration/) for additional ideas of how to
// customize your build beyond what Angular provides.

function debugConfig(config: webpack.Configuration) {
  console.log(
    JSON.stringify(
      config,
      (_, value) => (value instanceof RegExp ? value.toString() : value),
      2
    )
  );
}

console.log(
  'check env file exists',
  fs.existsSync(path.resolve(__dirname, '../../.env'))
);

if (
  !process.env.AUTH_TYPE ||
  !process.env.OUTPOSTS_WEB_ORIGIN ||
  !process.env.CONFLUENCE_API_ENDPOINT ||
  !process.env.AUTH_ENDPOINT
) {
  console.error('missing required envs');
  process.exit(1);
}

export default (
  config: webpack.Configuration,
  _options: CustomWebpackBrowserSchema,
  _targetOptions: TargetOptions
) => {
  const plugins = config.plugins ?? [];
  plugins.push(
    new EnvironmentPlugin({
      APP_VERSION: version,
      AUTH_TYPE: process.env.AUTH_TYPE,
      AUTH_ENDPOINT: process.env.AUTH_ENDPOINT,
      OUTPOSTS_WEB_ORIGIN: process.env.OUTPOSTS_WEB_ORIGIN,
      OUTPOSTS_WEB_AUTH_APPID: process.env.OUTPOSTS_WEB_AUTH_APPID,
      CONFLUENCE_API_ENDPOINT: process.env.CONFLUENCE_API_ENDPOINT,
    })
  );
  config.plugins = plugins;

  const rules = config.module?.rules || [];

  for (const r of rules) {
    if (typeof r === 'object' && r && r.test instanceof RegExp) {
      const test = r.test;
      if (
        test.source === '\\.[cm]?[tj]sx?$' ||
        test.source === '\\.[cm]?jsx?$' ||
        test.source === '\\.[cm]?tsx?$'
      ) {
        r.resourceQuery = {
          not: [/asset-/],
        };
      }
    }
  }

  rules.push({
    test: /\.md$/,
    type: 'asset/source',
  });

  rules.push(
    {
      resourceQuery: /asset-source/,
      type: 'asset/source',
    },
    {
      resourceQuery: /asset-resource/,
      type: 'asset/resource',
    },
    {
      resourceQuery: /asset-inline/,
      type: 'asset/inline',
    }
  );

  config.module = {
    ...config.module,
    rules,
  };

  // debugConfig(config);

  return config;
};
