'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    'ember-cli-babel': { enableTypeScriptTransform: true },
    babel: {
      plugins: [[require.resolve('./babel-plugin3.js'), {v: 14}]]
    }
  });

  const { Webpack } = require('@embroider/webpack');
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
    packagerOptions: {
      entry: {
        head: path.join(
          __dirname,
          'node_modules',
          '.embroider',
          'rewritten-app',
          'assets',
          'vendor.js',
        ),
      },
      webpackConfig: {
        devServer: {
          historyApiFallback: true,
          static: {
            directory: path.join(
              __dirname,
              'node_modules',
              '.embroider',
              'rewritten-app',
            ),
            watch: false,
          },
          hot: true,
        },
        plugins: [
          new HtmlWebpackPlugin({
            chunks: [`assets/${require('./package.json').name}.js`],
            template:
              '!!' +
              require.resolve('html-webpack-plugin/lib/loader') +
              '?force=true!' +
              require.resolve('./ember-html-loader') +
              '!' +
              path.resolve(
                __dirname,
                'node_modules',
                '.embroider',
                'rewritten-app',
                'index.html',
              ),
          }),
          new HtmlWebpackPlugin({
            filename: 'test.html',
            chunks: ['assets/test.js'],
            template:
              '!!' +
              require.resolve('html-webpack-plugin/lib/loader') +
              '?force=true!' +
              require.resolve('./ember-html-loader') +
              '!' +
              path.resolve(
                __dirname,
                'node_modules',
                '.embroider',
                'rewritten-app',
                'index.html',
              ),
          }),
          // new HtmlWebpackTagsPlugin({ tags: ['assets/vendor.js'], append: false }),
        ],
        devServer: {
          historyApiFallback: true,
          static: {
            directory: path.join(
              __dirname,
              'node_modules',
              '.embroider',
              'rewritten-app',
            ),
            watch: false,
          },
          hot: 'only',
        },
        module: {
          rules: [
            {
              test: /\.(js|ts|gts|gjs|hbs)$/,
              enforce: 'post',
              use: [
                {
                  loader: require.resolve('./hmr.js'),
                },
              ],
            },
          ],
        },
      },
    },
  });
};
