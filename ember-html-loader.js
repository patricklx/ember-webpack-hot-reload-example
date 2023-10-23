module.exports = function (source) {
  const options = this.getOptions();
  options.appName = require('./package.json').name;
  const dummyTag = `<script src="/assets/dummy.js" type="module"></script>`;
  const testTag = `<script src="/assets/test.js" type="module"></script>`;
  const appTag = `<script src="/assets/${options.appName}.js" type="module"></script>`;
  return source.replace(dummyTag, '').replace(testTag, '').replace(appTag, '');
};
