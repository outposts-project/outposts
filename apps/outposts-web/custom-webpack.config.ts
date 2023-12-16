import {DefinePlugin} from 'webpack';
import dotenv from 'dotenv';
import path from "path";
import {version} from './package.json';
import {CustomWebpackBrowserSchema, TargetOptions} from "@angular-builders/custom-webpack";
import * as webpack from 'webpack';

dotenv.config();
dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

// Export a configuration object
// See [Webpack's documentation](https://webpack.js.org/configuration/) for additional ideas of how to
// customize your build beyond what Angular provides.

function debugConfig (config: webpack.Configuration) {
  console.log(JSON.stringify(config, (_, value) => value instanceof RegExp ? value.toString() : value, 2));
}

export default (
  config: webpack.Configuration,
  _options: CustomWebpackBrowserSchema,
  _targetOptions: TargetOptions
) => {
  const plugins = config.plugins ?? [];
  plugins.push(
    new DefinePlugin({
      'process.env.AUTH_TYPE': JSON.stringify(process.env['AUTH_TYPE']),
      'process.env.AUTH_ENDPOINT': JSON.stringify(process.env['AUTH_ENDPOINT']),
      'process.env.OUTPOSTS_WEB_AUTH_APPID': JSON.stringify(process.env['OUTPOSTS_WEB_AUTH_APPID']),
      'process.env.APP_VERSION': JSON.stringify(version)
    })
  );
  config.plugins = plugins;

  const rules = config.module?.rules || [];

  rules.forEach(r => {
    if (typeof r === 'object' && r && r.test instanceof RegExp) {
      const test = r.test;
      if(test.source === "\\.[cm]?[tj]sx?$" || test.source === "\\.[cm]?jsx?$" || test.source === "\\.[cm]?tsx?$") {
        r.resourceQuery = {
          not: [/asset-/]
        }
      }
    }
  });

  rules.push(
    {
      resourceQuery: /asset-source/,
      type: 'asset/source',
    },
    {
      resourceQuery: /asset-resource/,
      type: 'asset/resource'
    },
    {
      resourceQuery: /asset-inline/,
      type: 'asset/inline'
    }
  );

  config.module = {
    ...config.module,
    rules
  }

  // debugConfig(config);

  return config;
}
