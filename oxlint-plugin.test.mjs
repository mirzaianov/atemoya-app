import assert from 'node:assert/strict';
import test from 'node:test';

import { paddingLineBetweenStatementsRule } from './oxlint-plugin.mjs';

const reportCount = (source, statements) => {
  const reports = [];
  const visitor = paddingLineBetweenStatementsRule.create({
    report: (report) => reports.push(report),
    sourceCode: { text: source },
  });

  visitor.Program({ body: statements });

  return reports.length;
};

const statement = (source, text, type, kind) => {
  const start = source.indexOf(text);

  return {
    kind,
    range: [start, start + text.length],
    type,
  };
};

test('enforces padding around variable declarations and before returns', () => {
  const missingAfterPadding = 'const first = 1;\nlet second = 2;\nvar third = 3;\nreturn third;';
  const missingBeforePadding = 'if (ready) {}\nconst value = 1;';
  const missingBothPadding = 'doSomething();\nconst value = 1;\nreturn value;';
  const missingBeforeReturn = 'doSomething();\nreturn value;';
  const validPadding = 'doSomething();\n\nconst first = 1;\nconst second = 2;\n\nreturn second;';
  const validReturnPadding = 'doSomething();\n\nreturn value;';
  const leadingDeclaration = 'const value = 1;\n\nreturn value;';
  const leadingReturn = 'return value;';
  const commentWithoutPadding = 'const value = 1;\n// explanation\nreturn value;';
  const blockCommentWithoutPadding = 'const value = 1;\n/* explanation\n\n */\nreturn value;';
  const terminalDeclaration = 'const value = 1;';
  const crlfPadding = 'doSomething();\r\n\r\nconst value = 1;\r\n\r\nreturn value;';

  assert.equal(
    reportCount(missingAfterPadding, [
      statement(missingAfterPadding, 'const first = 1;', 'VariableDeclaration', 'const'),
      statement(missingAfterPadding, 'let second = 2;', 'VariableDeclaration', 'let'),
      statement(missingAfterPadding, 'var third = 3;', 'VariableDeclaration', 'var'),
      statement(missingAfterPadding, 'return third;', 'ReturnStatement'),
    ]),
    1,
  );
  assert.equal(
    reportCount(missingBeforePadding, [
      statement(missingBeforePadding, 'if (ready) {}', 'IfStatement'),
      statement(missingBeforePadding, 'const value = 1;', 'VariableDeclaration', 'const'),
    ]),
    1,
  );
  assert.equal(
    reportCount(missingBothPadding, [
      statement(missingBothPadding, 'doSomething();', 'ExpressionStatement'),
      statement(missingBothPadding, 'const value = 1;', 'VariableDeclaration', 'const'),
      statement(missingBothPadding, 'return value;', 'ReturnStatement'),
    ]),
    2,
  );
  assert.equal(
    reportCount(missingBeforeReturn, [
      statement(missingBeforeReturn, 'doSomething();', 'ExpressionStatement'),
      statement(missingBeforeReturn, 'return value;', 'ReturnStatement'),
    ]),
    1,
  );
  assert.equal(
    reportCount(blockCommentWithoutPadding, [
      statement(blockCommentWithoutPadding, 'const value = 1;', 'VariableDeclaration', 'const'),
      statement(blockCommentWithoutPadding, 'return value;', 'ReturnStatement'),
    ]),
    1,
  );
  assert.equal(
    reportCount(validPadding, [
      statement(validPadding, 'doSomething();', 'ExpressionStatement'),
      statement(validPadding, 'const first = 1;', 'VariableDeclaration', 'const'),
      statement(validPadding, 'const second = 2;', 'VariableDeclaration', 'const'),
      statement(validPadding, 'return second;', 'ReturnStatement'),
    ]),
    0,
  );
  assert.equal(
    reportCount(validReturnPadding, [
      statement(validReturnPadding, 'doSomething();', 'ExpressionStatement'),
      statement(validReturnPadding, 'return value;', 'ReturnStatement'),
    ]),
    0,
  );
  assert.equal(
    reportCount(leadingDeclaration, [
      statement(leadingDeclaration, 'const value = 1;', 'VariableDeclaration', 'const'),
      statement(leadingDeclaration, 'return value;', 'ReturnStatement'),
    ]),
    0,
  );
  assert.equal(
    reportCount(leadingReturn, [statement(leadingReturn, 'return value;', 'ReturnStatement')]),
    0,
  );
  assert.equal(
    reportCount(commentWithoutPadding, [
      statement(commentWithoutPadding, 'const value = 1;', 'VariableDeclaration', 'const'),
      statement(commentWithoutPadding, 'return value;', 'ReturnStatement'),
    ]),
    1,
  );
  assert.equal(
    reportCount(terminalDeclaration, [
      statement(terminalDeclaration, 'const value = 1;', 'VariableDeclaration', 'const'),
    ]),
    0,
  );
  assert.equal(
    reportCount(crlfPadding, [
      statement(crlfPadding, 'doSomething();', 'ExpressionStatement'),
      statement(crlfPadding, 'const value = 1;', 'VariableDeclaration', 'const'),
      statement(crlfPadding, 'return value;', 'ReturnStatement'),
    ]),
    0,
  );
});

test('enforces padding around complete try statements', () => {
  const tryStatement = 'try {\n  run();\n} catch {\n  recover();\n} finally {\n  cleanUp();\n}';
  const missingBothPadding = `before();\n${tryStatement}\nafter();`;
  const validPadding = `before();\n\n${tryStatement}\n\nafter();`;
  const leadingTry = `${tryStatement}\n\nafter();`;
  const terminalTry = `before();\n\n${tryStatement}`;
  const singleTry = tryStatement;
  const commentWithoutPadding = `before();\n// explanation\n${tryStatement}`;
  const crlfTry = tryStatement.replaceAll('\n', '\r\n');
  const crlfPadding = `before();\r\n\r\n${crlfTry}\r\n\r\nafter();`;

  assert.equal(
    reportCount(missingBothPadding, [
      statement(missingBothPadding, 'before();', 'ExpressionStatement'),
      statement(missingBothPadding, tryStatement, 'TryStatement'),
      statement(missingBothPadding, 'after();', 'ExpressionStatement'),
    ]),
    2,
  );
  assert.equal(
    reportCount(validPadding, [
      statement(validPadding, 'before();', 'ExpressionStatement'),
      statement(validPadding, tryStatement, 'TryStatement'),
      statement(validPadding, 'after();', 'ExpressionStatement'),
    ]),
    0,
  );
  assert.equal(
    reportCount(leadingTry, [
      statement(leadingTry, tryStatement, 'TryStatement'),
      statement(leadingTry, 'after();', 'ExpressionStatement'),
    ]),
    0,
  );
  assert.equal(
    reportCount(terminalTry, [
      statement(terminalTry, 'before();', 'ExpressionStatement'),
      statement(terminalTry, tryStatement, 'TryStatement'),
    ]),
    0,
  );
  assert.equal(reportCount(singleTry, [statement(singleTry, tryStatement, 'TryStatement')]), 0);
  assert.equal(
    reportCount(commentWithoutPadding, [
      statement(commentWithoutPadding, 'before();', 'ExpressionStatement'),
      statement(commentWithoutPadding, tryStatement, 'TryStatement'),
    ]),
    1,
  );
  assert.equal(
    reportCount(crlfPadding, [
      statement(crlfPadding, 'before();', 'ExpressionStatement'),
      statement(crlfPadding, crlfTry, 'TryStatement'),
      statement(crlfPadding, 'after();', 'ExpressionStatement'),
    ]),
    0,
  );
});
