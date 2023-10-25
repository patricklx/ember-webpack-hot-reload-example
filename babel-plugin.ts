import type * as BabelCoreNamespace from '@babel/core';
import { PluginObj } from '@babel/core';
import type * as BabelTypesNamespace from '@babel/types';
import { V8IntrinsicIdentifier } from '@babel/types';
import * as glimmer from '@glimmer/syntax';
import { ASTv1, NodeVisitor, WalkerPath } from '@glimmer/syntax';

export type Babel = typeof BabelCoreNamespace;
export type BabelTypes = typeof BabelTypesNamespace;

const builtInComponents = ['LinkTo'];
const builtInHelpers = [
  '-get-dynamic-var',
  '-element',
  '-lf-get-outlet-state',
  '-in-element',
  'in-element',
  '-with-dynamic-vars',
  'action',
  'array',
  'component',
  'concat',
  'debugger',
  'each',
  'each-in',
  'fn',
  'get',
  'has-block',
  'has-block-params',
  'hasBlock',
  'hasBlockParams',
  'hash',
  'if',
  'input',
  'let',
  'link-to',
  'loc',
  'log',
  'mount',
  'mut',
  'on',
  'outlet',
  'partial',
  'query-params',
  'readonly',
  'textarea',
  'unbound',
  'unless',
  'with',
  'yield',
  'modifier',
  'helper',
];

const hotAstProcessor = {
  options: {
    itsStatic: false
  },
  replaceInAst(ast: glimmer.ASTv1.Template) {
    const hotReplaced = {
      components: new Set<string>(),
      helpers: new Set<string>(),
      modifiers: new Set<string>(),
      others: new Set<string>(),
      info: {
        components: {} as {[x:string]: { resolvedPath?: string }},
        helpers: {} as {[x:string]: {nodes: ASTv1.PathExpression[], resolvedPath: string }},
        modifiers: {} as {[x:string]: {nodes: ASTv1.PathExpression[], resolvedPath: string }}
      }
    }

    const components = hotReplaced.info.components;
    const helpers = hotReplaced.info.helpers;
    const modifiers = hotReplaced.info.modifiers;

    const findBlockParams = function(expression: string, p: WalkerPath<ASTv1.BlockStatement|ASTv1.Block|ASTv1.ElementNode|ASTv1.PathExpression>): boolean {
      if (p.node && p.node.type === 'BlockStatement' && p.node.program.blockParams.includes(expression)) {
        return true;
      }
      const node = p.node as any;
      if (node && node.blockParams && node.blockParams.includes(expression)) {
        return true;
      }
      if (!p.parent) return false;
      return findBlockParams(expression, p.parent as any);
    };

    const visitor: NodeVisitor = {
      Program: {
        exit(ast: ASTv1.Program, path: WalkerPath<ASTv1.Program>) {
          const createComponentLetBlockExpr = comp => {
            let lookup = `${comp[1].resolvedPath}`
            lookup = `webpack-hot-reload (component ${lookup}) type='component'`
            return glimmer.preprocess(`{{#let (${lookup}) as |${comp[0]}|}}{{/let}}`)
                .body[0]
          }
          const handleHelper = helper => {
            let lookup = `${helper.resolvedPath}`
            lookup = `webpack-hot-reload (helper ${lookup}) type='helper'`
            return glimmer.preprocess(
                `{{#let (${lookup}) as |${helper.nodes[0].original}|}}{{/let}}`
            ).body[0]
          }
          const handleModifier = modifier => {
            let lookup = `${modifier.resolvedPath}`
            lookup = `(webpack-hot-reload (helper ${lookup}))`
            return glimmer.preprocess(
                `{{#let ${lookup} as |${modifier.nodes[0].original}|}}{{/let}}`
            ).body[0]
          }

          let body = []
          const root = body
          Object.entries(components).forEach(c => {
            const letComponent = createComponentLetBlockExpr(c)
            body.push(letComponent)
            body = letComponent.program.body
          })
          Object.values(helpers).forEach(c => {
            const letHelper = handleHelper(c)
            if (!letHelper) return
            body.push(letHelper)
            body = letHelper.program.body
          })
          Object.values(modifiers).forEach(c => {
            const letModifier = handleModifier(c)
            if (!letModifier) return
            body.push(letModifier)
            body = letModifier.program.body
          })
          body.push(...ast.body)
          ast.body = root
        }
      },
      PathExpression: (node, p) => {
        if ((p.parentNode?.type === 'SubExpression' || p.parentNode?.type === 'MustacheStatement') && p.parentNode.params.includes(node)) {
          return;
        }
        if (node.original === 'this') return;
        if (node.original === 'block') return;
        if (node.original === 'helper' || node.original === 'modifier' || node.original === 'component') {
          if (p.parentNode?.type === 'SubExpression' || p.parentNode?.type === 'MustacheStatement') {
            const originalPath = p.parentNode.params[0];
            let original = '';

            if (originalPath?.type === 'PathExpression' || originalPath?.type === 'StringLiteral') {
              original = originalPath.original;
            }

            if (originalPath?.type === 'SubExpression' && originalPath.path.type === 'PathExpression' && originalPath.path.original === 'ensure-safe-component') {
              const sub = originalPath.params[0];
              if (sub?.type === 'PathExpression' || sub?.type === 'StringLiteral') {
                original = sub.original;
              }
            }

            const choice = { components, modifiers, helpers };
            const c = choice[`${node.original}s`];
            c[node.original] = c[node.original] || {} as any;
            c[node.original]!.resolvedPath = original;
            c[node.original]!.resolvedPath = original;
            hotReplaced[`${node.original}s`].add(original);
          }
        }
        if (findBlockParams(node.original.split('.')[0]!, p)) return;
        if (!builtInHelpers.includes(node.original)) {
          if (p.parentNode?.type === 'ElementModifierStatement') return;
        }
        const originalPath = node.original;
          if (node.original.includes('.')) {
            node.original = node.original.replace(/\./g, '_sep_');
          }
          const firstLetter = node.original.replace('hot_', '').split('_sep_').slice(-1)[0]![0]!;
          if (!node.original.startsWith('hot_')) {
            node.original = 'hot_' + node.original;
          }
          if (this.options.itsStatic && p.parentNode?.type === 'MustacheStatement' || firstLetter === firstLetter.toUpperCase()) {
            if (!node.original.startsWith('Hot_')) {
              node.original = 'Hot_' + node.original;
            }
            if (node.parts) {
              node.parts.length = 0;
              node.parts[0] = node.original;
            }
            hotReplaced.components.add(originalPath);
            components[node.original] = {
              resolvedPath: originalPath,
            };
            return;
          }
          if (modifiers[node.original]) {
            return;
          }
          // its a helper
          if (!node.original.startsWith('hot_')) {
            node.original = 'hot_' + node.original;
          }
          node.original = node.original.replace(/-/g, '_');
          if (node.parts) {
            node.parts.length = 0;
            node.parts[0] = node.original;
          }
          helpers[node.original] = helpers[node.original] || { nodes: [], resolvedPath: originalPath };
          helpers[node.original]!.nodes.push(node);
      },
      ElementNode: (element: ASTv1.ElementNode, p: WalkerPath<ASTv1.ElementNode>) => {
        element.modifiers.forEach((modifier) => {
          const p = modifier.path;
          let original = '';
          if (p.type === 'PathExpression' || p.type === 'StringLiteral') {
            original = p.original;
          }
          if (builtInHelpers.includes(original)) return;

          const originalPath = original;
          if (original.includes('.')) {
            original = original.replace(/\./g, '_sep_');
          }
         original = original.replace(/-/g, '_');
          if (!original.startsWith('hot_')) {
            p.type = 'PathExpression';
            p.original = 'hot_' + original;
            if (p.parts) {
              p.parts[0] = p.original;
            }
          }
          modifiers[p.original] = modifiers[p.original] || { resolvedPath: originalPath, nodes: [] };
          modifiers[p.original]!.nodes.push(p);
          delete helpers[p.original];
        });
        if (builtInComponents.includes(element.tag))
          return;
        const resolvedPath = element.tag;
        if (element.tag.includes('.')) {
          element.tag = element.tag.replace(/\./g, '_sep_');
        }
        if (!element.tag.startsWith('Hot_')) {
          element.tag = 'Hot_' + element.tag;
        }
        hotReplaced.components.add(resolvedPath);
        components[element.tag] = {
          resolvedPath: resolvedPath
        };
      }
    };
    glimmer.traverse(ast, visitor);

    const createComponentLetBlockExpr = (comp: [key: string, info: {resolvedPath?: string}]) => {
      let lookup = `${comp[1].resolvedPath}`;
      lookup = `webpack-hot-reload (component ${lookup}) type='component'`;
      return glimmer.preprocess(`{{#let (${lookup}) as |${comp[0]}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
    };
    const handleHelper = (helper: { nodes: ASTv1.PathExpression[], resolvedPath: string }) => {
      let lookup = `${helper.resolvedPath}`;
      lookup = `webpack-hot-reload (helper ${lookup}) type='helper'`;
      return glimmer.preprocess(`{{#let (${lookup}) as |${helper.nodes[0]!.original}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
    };
    const handleModifier = (modifier: { nodes: ASTv1.PathExpression[], resolvedPath: string }) => {
      let lookup =  `${modifier.resolvedPath}`;
      lookup = `(webpack-hot-reload (helper ${lookup}))`;
      return glimmer.preprocess(`{{#let ${lookup} as |${modifier.nodes[0]!.original}|}}{{/let}}`).body[0] as glimmer.AST.BlockStatement;
    };

    let body: glimmer.AST.Statement[] = [];
    const root = body;
    Object.entries(components).forEach((c) => {
      const letComponent = createComponentLetBlockExpr(c);
      body.push(letComponent);
      body = letComponent.program.body;
    });
    Object.values(helpers).forEach((c) => {
      const letHelper = handleHelper(c);
      if (!letHelper) return;
      body.push(letHelper);
      body = letHelper.program.body;
    });
    Object.values(modifiers).forEach((c) => {
      const letModifier = handleModifier(c);
      if (!letModifier) return;
      body.push(letModifier);
      body = letModifier.program.body;
    });
    body.push(...ast.body);
    ast.body = root;
    return hotReplaced;
  },

  processAst(contents: string) {
    const ast = glimmer.preprocess(contents);
    this.replaceInAst(ast);
    return glimmer.print(ast);
  }
};

export default function hotReplaceAst({ types: t }: { types: BabelTypes}) {
  return {
    name: 'hbs-imports',
    visitor: {
      CallExpression(path) {
        const call = path.node;
        if ((call.callee as V8IntrinsicIdentifier).name === 'precompileTemplate' && call.arguments[0]?.type === 'StringLiteral') {
          call.arguments[0].value = hotAstProcessor.processAst(call.arguments[0].value);
        }
      }
    }
  } as PluginObj;
}
