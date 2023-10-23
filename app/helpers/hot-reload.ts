import Helper from '@ember/component/helper';
import { getOwner } from '@ember/owner';
import { registerDestructor } from '@ember/destroyable';
import { getComponentTemplate, setComponentTemplate } from '@ember/component';
import Ember from 'ember';

const TemplateOnlyComponent =
  Ember.__loader.require('@glimmer/runtime').TemplateOnlyComponent;

export default class HotReload extends Helper {
  h: unknown;
  version!: number;
  current: unknown;

  constructor(...args) {
    super(...args);
    this.version = 0;
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
        this.version = newModule.version;
        const entry = Object.entries(requirejs.entries).find(([key, value]) => {
          if (
            value.module.patched?.exports.default === oldModule.exports.default
          ) {
            return true;
          }
          const klass = value.module.exports?.default;
          return (
            klass &&
            (klass === oldModule.exports.default ||
              getComponentTemplate(klass) === oldModule.exports.default)
          );
        });
        if (entry) {
          if (entry[1].module.patched === oldModule) {
            this.current = entry[1].module.exports.default;
            this.recompute();
            return;
          }
          if (
            getComponentTemplate(entry[1].module.exports.default) ===
            oldModule.exports.default
          ) {
            let klass = null;
            if (
              entry[1].module.exports.default instanceof TemplateOnlyComponent
            ) {
              klass = new TemplateOnlyComponent();
            } else {
              klass = class extends entry[1].module.exports.default {};
            }
            setComponentTemplate(newModule.exports.default, klass);
            define(entry[0], () => klass);
            requirejs.entries[entry[0]].module.patched = oldModule;
            this.current = klass;
            this.recompute();
            return;
          }
        }
        this.recompute();
      }
      return;
    }

    if (!this.current?.prototype) {
      return;
    }

    for (const [name, exp] of Object.entries(oldModule.exports)) {
      if (exp && this.current?.prototype instanceof exp) {
        this.current = newModule.exports[name];
        if (!this.current) {
          newModule.invalidate();
        }
        return;
      }
    }
  }

  compute(positional, named) {
    if (this.current) {
      return this.current;
    }
    if (typeof positional[0] === 'string') {
      const name = positional[0];
      const type = named.type;
      if (type === 'component') {
        this.current = name;
        return this.current + '__hot_version__' + this.version;
      }
      this.current = getOwner(this)!.lookup(`${type}:${name}`);
    }
    return this.current;
  }
}
