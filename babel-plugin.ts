import type * as BabelCoreNamespace from '@babel/core';
import { NodePath, PluginObj, parse } from '@babel/core';
import type * as BabelTypesNamespace from '@babel/types';
import {
  ExpressionStatement,
  Identifier,
  ImportDeclaration, ImportSpecifier,
  Program,
  V8IntrinsicIdentifier,
} from '@babel/types';
import * as glimmer from '@glimmer/syntax';
import { ASTv1, NodeVisitor, Path, WalkerPath } from '@glimmer/syntax';

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
  replaceInAst(
    ast: glimmer.ASTv1.Template,
    importVar?: string,
    imports?: string[],
  ) {
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
    const changes: [ASTv1.Node, ASTv1.Node][] = [];
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
        if (node.original.startsWith('this.')) return;
        if (findBlockParams(node.original.split('.')[0], p)) return;
        if (importVar) {
          if (imports.includes(node.original)) {
            node.original = `${importVar}.${node.original}`;
          }
          return;
        }
        const params = [];
        const blockParams = [];
        const letBlock = glimmer.builders.path('let');
        if (
          node.original === 'helper' ||
          node.original === 'component' ||
          node.original === 'modifier'
        ) {
          if (
            p.parentNode.params[0].original &&
            findBlockParams(p.parentNode.params[0].original.split('.')[0], p)
          )
            return;
          if (p.parentNode.params[0].original?.includes('.')) return;
          const sub = glimmer.builders.sexpr(
            node.original,
            [...p.parentNode.params],
            { ...p.parentNode.hash },
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
          const block = glimmer.builders.blockItself(
            [{ ...p.parentNode }],
            blockParams,
          );
          const b = glimmer.builders.block(letBlock, params, null, block);
          if (p.parentNode.type === 'SubExpression') {
            changes.push([p.parentNode, param]);
            this.counter++;
            return;
          }
          changes.push([p.parentNode, b]);
          this.counter++;
          return;
        }
        if (builtInHelpers.includes(node.original)) {
          return;
        }
        if (!builtInHelpers.includes(node.original)) {
          if (p.parentNode?.type === 'ElementModifierStatement') return;
        }
        const firstLetter = node.original.split('.').slice(-1)[0]![0]!;
        let type = 'helper';
        if (
          (this.options.itsStatic &&
            p.parentNode?.type === 'MustacheStatement') ||
          firstLetter === firstLetter.toUpperCase()
        ) {
          type = 'component';
        }
        const sub = glimmer.builders.sexpr(type, [
          glimmer.builders.string(node.original),
        ]);
        const param = glimmer.builders.sexpr(
          'webpack-hot-reload',
          [sub],
          glimmer.builders.hash([
            glimmer.builders.pair('type', glimmer.builders.string(type)),
          ]),
        );
        params.push(param);
        const name = type + '_' + this.counter;
        blockParams.push(name);
        node.type = 'PathExpression';
        node.original = name;
        if (!params.length) return;
        const block = glimmer.builders.blockItself(
          [{ ...p.parentNode }],
          blockParams,
        );
        const b = glimmer.builders.block(letBlock, params, null, block);
        changes.push([p.parentNode!, b]);
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
          if (importVar) {
            return;
          }
          if (!modifier.path.original) return;
          if (modifier.path.original && modifier.path.original.includes('.'))
            return;
          const sub = glimmer.builders.sexpr('modifier', [
            {
              ...((modifier.path.original &&
                glimmer.builders.string(modifier.path.original)) ||
                modifier.path),
            },
          ]);
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

        if (findBlockParams(element.tag.split('.')[0], p)) return;
        if (importVar) {
          if (imports.includes(element.tag)) {
            element.tag = `${importVar}.${element.tag}`;
          }
          return;
        }
        if (builtInComponents.includes(element.tag)) {
          return;
        }
        if (element.tag[0] === element.tag[0].toUpperCase()) {
          const sub = glimmer.builders.sexpr('component', [
            glimmer.builders.string(element.tag),
          ]);
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
        }
        const block = glimmer.builders.blockItself(
          [{ ...element }],
          blockParams,
        );
        if (!params.length) return;
        const b = glimmer.builders.block(letBlock, params, null, block);
        changes.push([element, b]);
        this.counter++;
      },
      Program: {
        exit() {
          changes.forEach(([oldNode, newNode]) => {
            for (const member in oldNode) delete oldNode[member];
            Object.assign(oldNode, newNode);
          });
        },
      },
    };

    glimmer.traverse(ast, visitor);
  },

  processAst(contents: string, importVar?: string, imports?: string[]) {
    const ast = glimmer.preprocess(contents);
    this.replaceInAst(ast, importVar, imports);
    return glimmer.print(ast);
  },
};

export default function hotReplaceAst({ types: t }: { types: BabelTypes }) {
  const imports: string[] = [];
  const importMap: Record<string, string> = {};
  let tracked: Identifier;
  let importVar: Identifier;
  let templateImportSpecifier = '';
  return {
    name: 'hbs-imports',
    visitor: {
      Program: {
        enter(path: NodePath<Program>) {
          const node = path.node;
          const templateImport = node.body.find(
            (i) =>
              i.type === 'ImportDeclaration' &&
              i.source.value === '@ember/template-compiler',
          );
          const def = (templateImport as ImportDeclaration).specifiers[0];
          templateImportSpecifier = (def as any).local.name;
          tracked = path.scope.generateUidIdentifier('tracked');
          importVar = path.scope.generateUidIdentifier('__imports__');
          node.body.push(
            t.importDeclaration(
              [t.importSpecifier(tracked, t.stringLiteral('tracked'))],
              t.stringLiteral('@glimmer/tracking'),
            ),
          );
          path.traverse({
            Program: {
              exit(path: NodePath<Program>) {
                const node = path.node;
                const lastImport = [...node.body]
                  .reverse()
                  .find((x) => x.type === 'ImportDeclaration')!;
                const idx = node.body.indexOf(lastImport);
                const importsVar = t.variableDeclaration('let', [
                  t.variableDeclarator(importVar),
                ]);
                const klass = t.classExpression(
                  null,
                  null,
                  t.classBody(
                    imports.map((i) => {
                        const x = t.identifier(i);
                        return t.classProperty(t.identifier(i), t.identifier(i), null, [
                          t.decorator(tracked),
                        ])
                     }
                    ),
                  ),
                );
                const assignment = t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    importVar,
                    t.newExpression(klass, []),
                  ),
                );
                const hotAccepts: ExpressionStatement[] = [];
                for (const imp of imports) {
                  const source = importMap[imp];
                  const ast = parse(
                    `import.meta.webpackHot.accept('${source}', (${imp}) => ${importVar.name}.${imp} = ${imp});`,
                  );
                  const impHot = ast?.program.body[0] as ExpressionStatement;
                  hotAccepts.push(impHot);
                }
                const ifHot = t.ifStatement(
                  t.memberExpression(
                    t.metaProperty(
                      t.identifier('import'),
                      t.identifier('meta'),
                    ),
                    t.identifier('webpackHot'),
                  ),
                  t.blockStatement([assignment, ...hotAccepts]),
                );

                node.body.splice(idx, 0, importsVar, ifHot);
              },
            },
            Identifier(path: NodePath<Identifier>) {
              if (path.scope.getBinding(path.node.name) && importMap[path.node.name] && !path.scope.getBinding(path.node.name)?.referencePaths.includes(path)) {
                path.scope.getBinding(path.node.name)?.referencePaths.push(path);
              }
            },
            ImportDeclaration(path: NodePath<ImportDeclaration>) {
              path.node.specifiers.forEach((s) => {
                imports.push(s.local.name);
                importMap[s.local.name] = path.node.source.value;
              });
            },
            CallExpression(path) {
              const call = path.node;
              if (
                templateImportSpecifier &&
                (call.callee as V8IntrinsicIdentifier).name ===
                  templateImportSpecifier &&
                (call.arguments[0]?.type === 'StringLiteral' ||
                  call.arguments[0]?.type === 'TemplateLiteral')
              ) {
                if (call.arguments[0].type === 'StringLiteral') {
                  call.arguments[0].value = hotAstProcessor.processAst(
                    call.arguments[0].value,
                    importVar.name,
                    imports,
                  );
                }
                if (
                  call.arguments[0].type === 'TemplateLiteral' &&
                  call.arguments[0].quasis[0]
                ) {
                  call.arguments[0].quasis[0].value.raw =
                    hotAstProcessor.processAst(
                      call.arguments[0].quasis[0].value.raw,
                      importVar.name,
                      imports,
                    );
                }
              }
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
          });
        },
      },
    },
  } as PluginObj;
}
