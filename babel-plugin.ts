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
    itsStatic: false,
  },
  counter: 0,
  replaceInAst(ast: glimmer.ASTv1.Template) {
    const hotReplaced = {
      components: new Set<string>(),
      helpers: new Set<string>(),
      modifiers: new Set<string>(),
      others: new Set<string>(),
      info: {
        components: {} as { [x: string]: { resolvedPath?: string } },
        helpers: {} as {
          [x: string]: { nodes: ASTv1.PathExpression[]; resolvedPath: string };
        },
        modifiers: {} as {
          [x: string]: { nodes: ASTv1.PathExpression[]; resolvedPath: string };
        },
      },
    };

    const components = hotReplaced.info.components;
    const helpers = hotReplaced.info.helpers;
    const modifiers = hotReplaced.info.modifiers;

    const findBlockParams = function (
      expression: string,
      p: WalkerPath<
        | ASTv1.BlockStatement
        | ASTv1.Block
        | ASTv1.ElementNode
        | ASTv1.PathExpression
      >,
    ): boolean {
      if (
        p.node &&
        p.node.type === 'BlockStatement' &&
        p.node.program.blockParams.includes(expression)
      ) {
        return true;
      }
      const node = p.node as any;
      if (node && node.blockParams && node.blockParams.includes(expression)) {
        return true;
      }
      if (!p.parent) return false;
      return findBlockParams(expression, p.parent as any);
    };
    const changes = [];
    const visitor: NodeVisitor = {
      PathExpression: (node, p) => {
        if (
          (p.parentNode?.type === 'SubExpression' ||
            p.parentNode?.type === 'MustacheStatement') &&
          p.parentNode.params.includes(node)
        ) {
          return;
        }
        if (node.original === 'this') return;
        if (node.original === 'block') return;
        const params = [];
        const blockParams = [];
        const letBlock = glimmer.builders.path('let');
        if (
          node.original === 'helper' ||
          node.original === 'component'
        ) {
          const sub = glimmer.builders.sexpr(
            node.original,
            [ { ...node } ]
          );
          const param = glimmer.builders.sexpr(
            'webpack-hot-reload',
            [sub],
            glimmer.builders.hash([
              glimmer.builders.pair(
                'type',
                glimmer.builders.string(node.original),
              ),
            ]),
          );
          params.push(param);
          const name = node.original + '_' + this.counter;
          blockParams.push(name);
          node.type = 'PathExpression';
          node.original = name;
          const block = glimmer.builders.blockItself([{...node}], blockParams);
          const b = glimmer.builders.block(letBlock, params, null, block);
          changes.push([node, b]);
          this.counter++;
          return;
        }
        if (!builtInHelpers.includes(node.original)) {
          if (p.parentNode?.type === 'ElementModifierStatement') return;
        }
        if (node.original.includes('.')) {
          node.original = node.original.replace(/\./g, '_sep_');
        }
        const firstLetter = node.original
          .split('.')
          .slice(-1)[0]![0]!;
        let type = 'helper';
        if (
          (this.options.itsStatic &&
            p.parentNode?.type === 'MustacheStatement') ||
          firstLetter === firstLetter.toUpperCase()
        ) {
          type = 'component';
        }
        const sub = glimmer.builders.sexpr(
          type,
          [ { ...node } ]
        );
        const param = glimmer.builders.sexpr(
          'webpack-hot-reload',
          [sub],
          glimmer.builders.hash([
            glimmer.builders.pair(
              'type',
              glimmer.builders.string(type),
            ),
          ]),
        );
        params.push(param);
        const name = type + '_' + this.counter;
        blockParams.push(name);
        node.type = 'PathExpression';
        node.original = name;
        const block = glimmer.builders.blockItself([{...node}], blockParams);
        const b = glimmer.builders.block(letBlock, params, null, block);
        changes.push([node, b]);
        this.counter++;
      },
      ElementNode: (
        element: ASTv1.ElementNode,
        p: WalkerPath<ASTv1.ElementNode>,
      ) => {
        const params = [];
        const blockParams = [];
        const letBlock = glimmer.builders.path('let');
        element.modifiers.forEach((modifier) => {
          const sub = glimmer.builders.sexpr(
            'modifier',
            [ { ...modifier.path } ]
          );
          const param = glimmer.builders.sexpr(
            'webpack-hot-reload',
            [sub],
            glimmer.builders.hash([
              glimmer.builders.pair(
                'type',
                glimmer.builders.string('modifier'),
              ),
            ]),
          );
          params.push(param);
          const name = 'modifier_' + this.counter;
          blockParams.push(name);
          modifier.path.type = 'PathExpression';
          modifier.path.original = 'modifier_' + this.counter;
          this.counter++;
        });


        if (builtInComponents.includes(element.tag)) {
          const block = glimmer.builders.blockItself([{...element}], blockParams);
          const b = glimmer.builders.block(letBlock, params, null, block);
          changes.push([element, b]);
          return;
        }
        const sub = glimmer.builders.sexpr(
          'component',
          [ glimmer.builders.string(element.tag) ]
        );
        const param = glimmer.builders.sexpr(
          'webpack-hot-reload',
          [sub],
          glimmer.builders.hash([
            glimmer.builders.pair(
              'type',
              glimmer.builders.string('component'),
            ),
          ]),
        );
        params.push(param);
        const name = 'Component_' + this.counter;
        blockParams.push(name);
        element.tag = name;
        const block = glimmer.builders.blockItself([{...element}], blockParams);
        const b = glimmer.builders.block(letBlock, params, null, block);
        changes.push([element, b]);
        this.counter++;
      },
      Program: {
        exit() {
          changes.forEach(([oldNode, newNode]) => {
            Object.assign(oldNode, newNode);
          })
        }
      }
    };
    glimmer.traverse(ast, visitor);

    const createComponentLetBlockExpr = (
      comp: [key: string, info: { resolvedPath?: string }],
    ) => {
      let lookup = `${comp[1].resolvedPath}`;
      lookup = `webpack-hot-reload (component ${lookup}) type='component'`;
      return glimmer.preprocess(`{{#let (${lookup}) as |${comp[0]}|}}{{/let}}`)
        .body[0] as glimmer.AST.BlockStatement;
    };
    const handleHelper = (helper: {
      nodes: ASTv1.PathExpression[];
      resolvedPath: string;
    }) => {
      let lookup = `${helper.resolvedPath}`;
      lookup = `webpack-hot-reload (helper ${lookup}) type='helper'`;
      return glimmer.preprocess(
        `{{#let (${lookup}) as |${helper.nodes[0]!.original}|}}{{/let}}`,
      ).body[0] as glimmer.AST.BlockStatement;
    };
    const handleModifier = (modifier: {
      nodes: ASTv1.PathExpression[];
      resolvedPath: string;
    }) => {
      let lookup = `${modifier.resolvedPath}`;
      lookup = `(webpack-hot-reload (helper ${lookup}))`;
      return glimmer.preprocess(
        `{{#let ${lookup} as |${modifier.nodes[0]!.original}|}}{{/let}}`,
      ).body[0] as glimmer.AST.BlockStatement;
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
  },
};

export default function hotReplaceAst({ types: t }: { types: BabelTypes }) {
  return {
    name: 'hbs-imports',
    visitor: {
      CallExpression(path) {
        const call = path.node;
        if (
          (call.callee as V8IntrinsicIdentifier).name ===
            'precompileTemplate' &&
          call.arguments[0]?.type === 'StringLiteral'
        ) {
          call.arguments[0].value = hotAstProcessor.processAst(
            call.arguments[0].value,
          );
        }
      },
    },
  } as PluginObj;
}
