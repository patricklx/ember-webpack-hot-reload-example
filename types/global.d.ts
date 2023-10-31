import '@glint/environment-ember-loose';

declare module '*.hbs';

type Module = {
    id: string;
    exports: any;
}

declare global {
    interface Window {
        emberHotReloadPlugin: {
            versionMap: Record<string, number>;
            subscribe(cb: (newModule: Module, oldModule: Module) => void): void;
            unsubscribe(cb: (newModule: Module, oldModule: Module) => void): void;
        }
    }
    interface ImportMeta {
        webpackHot: {
            accept(): void;
            addStatusHandler(cb: (status: string) => void): void;
        }
    }
}
