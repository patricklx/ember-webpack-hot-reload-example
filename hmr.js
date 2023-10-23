const path = require('path');

module.exports = function (source) {
  const options = this.getOptions();
  const resourcePath = this.resourcePath.replace(/\\/g, '/');

  const supportedPaths = ['components', 'helpers', 'modifiers'];
  if (!supportedPaths.some((s) => resourcePath.includes(`/${s}/`))) {
    return source;
  }
  return `${source}
  if (import.meta.webpackHot && window.emberHotReloadPlugin) {
      const result = window.emberHotReloadPlugin.canAcceptNew(__webpack_module__);
      if (!result) {
        import.meta.webpackHot.invalidate();
      } else {
        import.meta.webpackHot.accept()
      }
  }
  `;
};
