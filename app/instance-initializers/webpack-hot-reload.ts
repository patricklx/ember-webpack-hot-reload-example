export function initialize(applicationInstance) {
  applicationInstance.lookup('service:webpack-hot-reload');
  const resolverResolve = applicationInstance.application.Resolver.prototype.resolve;
  applicationInstance.application.Resolver.prototype.resolve = function (name) {
    name = name.replace(/--hot-version--.*$/, '');
    return resolverResolve.call(this, name);
  };
}

export default {
  initialize,
};
