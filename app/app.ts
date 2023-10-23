import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import EmberComponent from '@ember/component';
import GlimmerComponent from '@glimmer/component';
import Helper from '@ember/component/helper';
import config from 'hot-reload/config/environment';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

if (import.meta.webpackHot) {
  const resolverResolve = Resolver.prototype.resolve;
  Resolver.prototype.resolve = function (name) {
    name = name.replace(/--hot-version--.*$/, '');
    return resolverResolve.call(this, name);
  };

  const ModuleMap = new Map();

  window.emberHotReloadPlugin = {
    changed: {},
    subscribers: [],
    canAcceptNew(module) {
      console.log('module', module);
      let ok =
        module.id.includes('/helpers/') ||
        module.id.includes('/modifiers/') ||
        module.id.includes('/components/');
      ok =
        ok ||
        Object.values(module.exports).every((exp) => {
          return (
            exp &&
            exp.prototype &&
            (exp.prototype instanceof EmberComponent ||
              exp.prototype instanceof GlimmerComponent ||
              exp.prototype instanceof Helper)
          );
        });

      if (!ok) {
        return false;
      }

      if (ModuleMap.get(module.id)) {
        this.changed[module.id] = {
          old: ModuleMap.get(module.id),
          new: module,
        };
      }
      module.version = ModuleMap.get(module.id)?.version || 0;
      module.version += 1;
      ModuleMap.set(module.id, module);
      return true;
    },

    notifyNew() {
      Object.values(this.changed).forEach((change) => {
        this.subscribers.forEach((fn) => fn(change.old, change.new));
      });
      this.changed = {};
    },

    subscribe(fn) {
      this.subscribers.push(fn);
    },

    unsubscribe(fn) {
      const idx = this.subscribers.indexOf(fn);
      if (idx >= 0) {
        this.subscribers.splice(idx, 1);
      }
    },
  };

  import.meta.webpackHot.addStatusHandler((status) => {
    if (status === 'idle') {
      window.emberHotReloadPlugin.notifyNew();
    }
    if (status === 'fail') {
      window.location.reload();
    }
  });
}

loadInitializers(App, config.modulePrefix);
