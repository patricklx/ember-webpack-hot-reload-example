import Helper from '@ember/component/helper';
import { getOwner } from '@ember/owner';
import { registerDestructor } from '@ember/destroyable';
import { service } from '@ember/service';
import { getComponentTemplate } from '@ember/component';
import Ember from 'ember';

const CurriedValue = Ember.__loader.require('@glimmer/runtime').CurriedValue;

const versionMap: Record<string, string> = {};

export default class WebpackHotReload extends Helper {
  h: unknown;
  current: unknown;
  @service('webpack-hot-reload') webpackHotReload;
  originalCurried: unknown;

  constructor(...args) {
    super(...args);
    const bound = this.checkAndRecompute.bind(this);
    window.emberHotReloadPlugin.subscribe(bound);
    registerDestructor(this, () => {
      window.emberHotReloadPlugin.unsubscribe(bound);
    });
  }

  checkAndRecompute(oldModule, newModule) {
    if (typeof this.current === 'string') {
      const id = oldModule.id
        .replace(/\/template.hbs$/, '')
        .replace(/\.hbs$/, '')
        .replace(/\.(js|ts|gjs|gts)$/, '')
        .replace(/\/component.(js|ts)$/, '')
        .replace(/\/component.(gjs|gts)$/, '')
        .replace(/\/index.(js|ts)$/, '')
        .replace(/\/index.(gjs|gts)$/, '');
      if (id.endsWith(this.current)) {
        versionMap[this.current] = newModule.version;
        this.current = null;
        this.recompute();
      }
      return;
    }

    if (!this.current) {
      return;
    }

    if (this.current === oldModule.exports.default) {
      this.current = newModule.exports.default;
      this.recompute();
      return;
    }

    if (
      oldModule.exports.default?.__meta &&
      oldModule.exports.default?.__id &&
      getComponentTemplate(this.current) === oldModule.exports.default
    ) {
      this.current = this.webpackHotReload.getLatestChange(this.current);
      this.recompute();
      return;
    }

    for (const [name, exp] of Object.entries(oldModule.exports)) {
      if (exp && this.current === exp) {
        this.current = newModule.exports[name];
        if (!this.current) {
          newModule.invalidate();
        }
        this.recompute();
        return;
      }
    }
  }

  compute(positional, named) {
    if (this.current) {
      return this.current;
    }
    const type = named.type;
    if (typeof positional[0] === 'string') {
      const name = positional[0];
      versionMap[name] = versionMap[name] || 0;
      if (type === 'component') {
        this.current = name;
        return `${this.current}__hot_version__${versionMap[name]}`;
      }
      if (type === 'modifier') {
        this.current = getOwner(this)!.factoryFor(
          `modifier:${name}__hot_version__${versionMap[name]}`,
        )?.class;
        return this.current;
      }
      this.current = getOwner(this)!.lookup(
        `helper:${name}__hot_version__${versionMap[name]}`,
      );
    } else {
      // if we are here, its a curried value
      const symb = Object.getOwnPropertySymbols(positional[0]).find(
        (s) => s.description === 'INNER',
      )!;
      this.current = this.originalCurried || positional[0][symb];
      if (!this.originalCurried) {
        this.originalCurried = this.current;
      }
      if (typeof this.originalCurried === 'string') {
        versionMap[this.originalCurried] = versionMap[this.originalCurried] || 0;
        const inner = `${this.originalCurried}__hot_version__${
          versionMap[this.originalCurried]
        }`;
        return new CurriedValue(
          0,
          inner,
          getOwner(this),
          { named: {}, positional: [] },
          false,
        );
      }
    }
    return this.current;
  }
}
