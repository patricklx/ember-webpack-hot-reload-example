'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    'ember-cli-babel': { enableTypeScriptTransform: true }
  });

  const { Webpack } = require('ember-webpack-hot-reload');
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
