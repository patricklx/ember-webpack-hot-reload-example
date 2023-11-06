"use strict";
var __assign = (this && this.__assign) || function () {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
        t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_2 = require("@babel/core");
var glimmer = require("@glimmer/syntax");
var builtInComponents = ['LinkTo'];
var builtInHelpers = [
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
function dasherize(str) {
  return str.trim().split(/\.?(?=[A-Z])/).join('-').toLowerCase();
}
var hotAstProcessor = {
  options: {
    itsStatic: false,
  },
  counter: 0,
  usedImports: [],
  replaceInAst: function (ast, importVar, imports) {
    var _this = this;
    var usedImports = new Set();
    var hotReplaced = {
      components: new Set(),
      helpers: new Set(),
      modifiers: new Set(),
      others: new Set(),
      info: {
        components: {},
        helpers: {},
        modifiers: {},
      },
    };
    var findBlockParams = function (expression, p) {
      if (p.node &&
          p.node.type === 'BlockStatement' &&
          p.node.program.blockParams.includes(expression)) {
        return true;
      }
      var node = p.node;
      if (node && node.blockParams && node.blockParams.includes(expression)) {
        return true;
      }
      if (!p.parent)
        return false;
      return findBlockParams(expression, p.parent);
    };
    var changes = [];
    var visitor = {
      PathExpression: function (node, p) {
        var _a, _b, _c, _d, _e;
        if ((((_a = p.parentNode) === null || _a === void 0 ? void 0 : _a.type) === 'SubExpression' ||
                ((_b = p.parentNode) === null || _b === void 0 ? void 0 : _b.type) === 'MustacheStatement') &&
            p.parentNode.params.includes(node)) {
          return;
        }
        if (node.original === 'this')
          return;
        if (node.original === 'block')
          return;
        if (node.original.startsWith('this.'))
          return;
        if (findBlockParams(node.original.split('.')[0], p))
          return;
        if (importVar) {
          if (imports.includes(node.original)) {
            usedImports.add(node.original);
            node.original = "".concat(importVar, ".").concat(node.original);
          }
          return;
        }
        var params = [];
        var blockParams = [];
        var letBlock = glimmer.builders.path('let');
        if (node.original === 'helper' ||
            node.original === 'component' ||
            node.original === 'modifier') {
          if (p.parentNode.params[0].original &&
              findBlockParams(p.parentNode.params[0].original.split('.')[0], p))
            return;
          if ((_c = p.parentNode.params[0].original) === null || _c === void 0 ? void 0 : _c.includes('.'))
            return;
          var sub_1 = glimmer.builders.sexpr(node.original, __spreadArray([], p.parentNode.params, true), __assign({}, p.parentNode.hash));
          var param_1 = glimmer.builders.sexpr('webpack-hot-reload', [sub_1], glimmer.builders.hash([
            glimmer.builders.pair('type', glimmer.builders.string(node.original)),
          ]));
          params.push(param_1);
          var name_1 = node.original + '_' + _this.counter;
          blockParams.push(name_1);
          node.type = 'PathExpression';
          node.original = name_1;
          var block_1 = glimmer.builders.blockItself([__assign({}, p.parentNode)], blockParams);
          var b_1 = glimmer.builders.block(letBlock, params, null, block_1);
          if (p.parentNode.type === 'SubExpression') {
            changes.push([p.parentNode, param_1]);
            _this.counter++;
            return;
          }
          changes.push([p.parentNode, b_1]);
          _this.counter++;
          return;
        }
        if (builtInHelpers.includes(node.original)) {
          return;
        }
        if (!builtInHelpers.includes(node.original)) {
          if (((_d = p.parentNode) === null || _d === void 0 ? void 0 : _d.type) === 'ElementModifierStatement')
            return;
        }
        var firstLetter = node.original.split('.').slice(-1)[0][0];
        var type = 'helper';
        if ((_this.options.itsStatic &&
                ((_e = p.parentNode) === null || _e === void 0 ? void 0 : _e.type) === 'MustacheStatement') ||
            firstLetter === firstLetter.toUpperCase()) {
          type = 'component';
        }
        var sub = glimmer.builders.sexpr(type, [
          glimmer.builders.string(node.original),
        ]);
        var param = glimmer.builders.sexpr('webpack-hot-reload', [sub], glimmer.builders.hash([
          glimmer.builders.pair('type', glimmer.builders.string(type)),
        ]));
        params.push(param);
        var name = type + '_' + _this.counter;
        blockParams.push(name);
        node.type = 'PathExpression';
        node.original = name;
        if (!params.length)
          return;
        var block = glimmer.builders.blockItself([__assign({}, p.parentNode)], blockParams);
        var b = glimmer.builders.block(letBlock, params, null, block);
        changes.push([p.parentNode, b]);
        _this.counter++;
      },
      ElementNode: function (element, p) {
        var params = [];
        var blockParams = [];
        var letBlock = glimmer.builders.path('let');
        element.modifiers.forEach(function (modifier) {
          if (importVar) {
            return;
          }
          if (!modifier.path.original)
            return;
          if (modifier.path.original && modifier.path.original.includes('.'))
            return;
          if (builtInHelpers.includes(modifier.path.original)) {
            return;
          }
          var sub = glimmer.builders.sexpr('modifier', [
            __assign({}, ((modifier.path.original &&
                    glimmer.builders.string(modifier.path.original)) ||
                modifier.path)),
          ]);
          var param = glimmer.builders.sexpr('webpack-hot-reload', [sub], glimmer.builders.hash([
            glimmer.builders.pair('type', glimmer.builders.string('modifier')),
          ]));
          params.push(param);
          var name = 'modifier_' + _this.counter;
          blockParams.push(name);
          modifier.path.type = 'PathExpression';
          modifier.path.original = 'modifier_' + _this.counter;
          _this.counter++;
        });
        if (findBlockParams(element.tag.split('.')[0], p))
          return;
        if (importVar) {
          if (imports.includes(element.tag)) {
            usedImports.add(element.tag);
            element.tag = "".concat(importVar, ".").concat(element.tag);
          }
          return;
        }
        if (builtInComponents.includes(element.tag)) {
          return;
        }
        if (element.tag[0] === element.tag[0].toUpperCase()) {
          var sub = glimmer.builders.sexpr('component', [
            glimmer.builders.string(dasherize(element.tag)),
          ]);
          var param = glimmer.builders.sexpr('webpack-hot-reload', [sub], glimmer.builders.hash([
            glimmer.builders.pair('type', glimmer.builders.string('component')),
          ]));
          params.push(param);
          var name = 'Component_' + _this.counter;
          blockParams.push(name);
          element.tag = name;
        }
        var block = glimmer.builders.blockItself([__assign({}, element)], blockParams);
        if (!params.length)
          return;
        var b = glimmer.builders.block(letBlock, params, null, block);
        changes.push([element, b]);
        _this.counter++;
      },
      Program: {
        exit: function () {
          changes.forEach(function (_a) {
            var oldNode = _a[0], newNode = _a[1];
            for (var member in oldNode)
              delete oldNode[member];
            Object.assign(oldNode, newNode);
          });
        },
      },
    };
    glimmer.traverse(ast, visitor);
    return usedImports;
  },
  processAst: function (contents, importVar, imports) {
    var ast = glimmer.preprocess(contents);
    this.usedImports = this.replaceInAst(ast, importVar, imports);
    return glimmer.print(ast);
  },
};
function hotReplaceAst(_a) {
  var t = _a.types;
  var imports = [];
  var importMap = {};
  var tracked;
  var importVar;
  var templateImportSpecifier = '';
  return {
    name: 'hbs-imports',
    pre: function (state) {
      var _a, _b;
      var imports = state.ast.program.body.filter(function (b) { return b.type === 'ImportDeclaration'; });
      var templateCompilerImport = imports.find(function (i) { return i.source.value === '@ember/template-compiler'; });
      if (templateCompilerImport) {
        var program = core_2.NodePath.get({
          hub: state.hub,
          key: 'program',
          parent: state.ast,
          parentPath: null,
          container: state.ast,
        });
        for (var _i = 0, imports_1 = imports; _i < imports_1.length; _i++) {
          var i = imports_1[_i];
          var specifiers = i.specifiers;
          for (var _c = 0, specifiers_1 = specifiers; _c < specifiers_1.length; _c++) {
            var specifier = specifiers_1[_c];
            var local = specifier.local;
            if (!((_a = state.scope.getBinding(local.name)) === null || _a === void 0 ? void 0 : _a.referencePaths.length)) {
              (_b = state.scope.getBinding(local.name)) === null || _b === void 0 ? void 0 : _b.referencePaths.push(program);
            }
          }
        }
      }
    },
    visitor: {
      Program: {
        enter: function (path) {
          var _a, _b;
          templateImportSpecifier = '';
          importVar = null;
          tracked = null;
          importMap = {};
          imports = [];
          var filename = path.hub.file.opts.filename;
          if (!filename.endsWith('.hbs') && !filename.endsWith('.gts') && filename.endsWith('.gjs')) {
            return;
          }
          var node = path.node;
          var templateImport = node.body.find(function (i) {
            return i.type === 'ImportDeclaration' &&
                i.source.value === '@ember/template-compiler';
          });
          if (templateImport) {
            var def = templateImport.specifiers[0];
            templateImportSpecifier = def.local.name;
            tracked = path.scope.generateUidIdentifier('tracked');
            importVar = path.scope.generateUidIdentifier('__imports__');
            node.body.push(t.importDeclaration([t.importSpecifier(tracked, t.stringLiteral('tracked'))], t.stringLiteral('@glimmer/tracking')));
          }
          var usedImports = new Set();
          var addedIds = new Set();
          path.traverse({
            ImportDeclaration: function (path) {
              path.node.specifiers.forEach(function (s) {
                imports.push(s.local.name);
                importMap[s.local.name] = {
                  source: path.node.source.value,
                  specifiers: path.node.specifiers,
                };
              });
            },
            Identifier: function (path) {
              var _a;
              if (addedIds.has(path.node)) {
                (_a = path.scope.getBinding(path.node.name)) === null || _a === void 0 ? void 0 : _a.referencePaths.push(path);
              }
            },
            CallExpression: function (path) {
              var _a, _b, _c;
              var call = path.node;
              if (templateImportSpecifier &&
                  call.callee.name ===
                  templateImportSpecifier &&
                  (((_a = call.arguments[0]) === null || _a === void 0 ? void 0 : _a.type) === 'StringLiteral' ||
                      ((_b = call.arguments[0]) === null || _b === void 0 ? void 0 : _b.type) === 'TemplateLiteral')) {
                if (call.arguments[0].type === 'StringLiteral') {
                  call.arguments[0].value = hotAstProcessor.processAst(call.arguments[0].value, importVar.name, imports);
                  usedImports = new Set(__spreadArray(__spreadArray([], usedImports, true), hotAstProcessor.usedImports, true));
                }
                if (call.arguments[0].type === 'TemplateLiteral' &&
                    call.arguments[0].quasis[0]) {
                  call.arguments[0].quasis[0].value.raw =
                      hotAstProcessor.processAst(call.arguments[0].quasis[0].value.raw, importVar.name, imports);
                  usedImports = new Set(__spreadArray(__spreadArray([], usedImports, true), hotAstProcessor.usedImports, true));
                }
              }
              if (call.callee.name ===
                  'precompileTemplate' &&
                  ((_c = call.arguments[0]) === null || _c === void 0 ? void 0 : _c.type) === 'StringLiteral') {
                call.arguments[0].value = hotAstProcessor.processAst(call.arguments[0].value);
              }
            },
          });
          if (!templateImportSpecifier)
            return;
          var lastImport = __spreadArray([], node.body, true).reverse()
              .find(function (x) { return x.type === 'ImportDeclaration'; });
          var idx = node.body.indexOf(lastImport);
          var importsVar = t.variableDeclaration('let', [
            t.variableDeclarator(importVar),
          ]);
          var klass = t.classExpression(null, null, t.classBody(__spreadArray([], usedImports, true).map(function (i) {
            var x = t.identifier(i);
            addedIds.add(x);
            return t.classProperty(t.identifier(i), x, null, [
              t.decorator(tracked),
            ]);
          })));
          var assignment = t.expressionStatement(t.assignmentExpression('=', importVar, t.newExpression(klass, [])));
          var hotAccepts = [];
          var ast = (0, core_2.default.parse)("window.emberHotReloadPlugin.clear(__webpack_module__)");
          hotAccepts.push(ast.program.body[0]);
          var _loop_1 = function (imp) {
            var _d = importMap[imp], source = _d.source, specifiers = _d.specifiers;
            var specifier = specifiers.find(function (s) { return s.local.name === imp; });
            var specifierName = ((_a = specifier.imported) === null || _a === void 0 ? void 0 : _a.name) || ((_b = specifier.imported) === null || _b === void 0 ? void 0 : _b.value) || 'default';
            var ast_1 = (0, core_2.parse)("window.emberHotReloadPlugin.register(__webpack_module__, '".concat(source, "', (module) => (").concat(importVar.name, ".").concat(imp, "=module.exports['").concat(specifierName, "']))"));
            var impHot = ast_1 === null || ast_1 === void 0 ? void 0 : ast_1.program.body[0];
            hotAccepts.push(impHot);
          };
          for (var _i = 0, _c = __spreadArray([], usedImports, true); _i < _c.length; _i++) {
            var imp = _c[_i];
            _loop_1(imp);
          }
          var ifHot = t.ifStatement(t.memberExpression(t.metaProperty(t.identifier('import'), t.identifier('meta')), t.identifier('webpackHot')), t.blockStatement(__spreadArray([assignment], hotAccepts, true)));
          node.body.splice(idx, 0, importsVar, ifHot);
        },
      },
    },
  };
}
exports.default = hotReplaceAst;
