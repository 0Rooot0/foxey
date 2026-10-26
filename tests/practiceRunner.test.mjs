import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import { readFile } from "node:fs/promises";
import { contracts, practiceContract } from "../src/lib/practice/contracts.ts";
import { javascriptHarness, pythonHarness } from "../src/lib/practice/harness.ts";

const solutions = {
  "reverse-a-string": ["def reverse_string(text): return text[::-1]", "function reverseString(text) { return [...text].reverse().join(''); }"],
  "find-the-largest-number": ["def largest_number(numbers): return max(numbers)", "function largestNumber(numbers) { return Math.max(...numbers); }"],
  "count-frequencies": ["def count_frequencies(words): return {word: words.count(word) for word in words}", "function countFrequencies(words) { const result = {}; for (const word of words) result[word] = (result[word] || 0) + 1; return result; }"],
  "valid-brackets": ["def valid_brackets(text):\n    stack = []\n    for char in text:\n        if char in '([{': stack.append(char)\n        elif not stack or stack.pop() != {')':'(',']':'[','}':'{'}[char]: return False\n    return not stack", "function validBrackets(text) { const stack = []; for (const char of text) { if ('([{'.includes(char)) stack.push(char); else if (stack.pop() !== {')':'(',']':'[','}':'{'}[char]) return false; } return !stack.length; }"]
};
function js(code, name, testCase) {
  let result;
  vm.runInNewContext(javascriptHarness(code, name, testCase), { self: { postMessage: value => { result = JSON.parse(JSON.stringify(value)); } }, console: {} }, { timeout: 1000 });
  return result;
}
function py(code, name, testCase) {
  const program = pythonHarness(code, name, testCase).replace(/_foxey_case\(\)\s*$/, 'print(_foxey_case())');
  const run = spawnSync(process.env.FOXEY_TEST_PYTHON || 'python', ['-c', program], { encoding: 'utf8', timeout: 3000 });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}
test("four reviewed contracts match baseline content; unsupported or changed problems stay disabled", () => {
  assert.equal(Object.keys(contracts).length, 4);
  for (const [slug, contract] of Object.entries(contracts)) {
    assert.equal(practiceContract({ slug, ...contract.baseline }).contract, contract);
    for (const field of Object.keys(contract.baseline)) assert.match(practiceContract({ slug, ...contract.baseline, [field]: 'changed' }).reason, /changed/);
  }
  assert.match(practiceContract({ slug: 'two-number-sum' }).reason, /two valid pairs/);
  assert.match(practiceContract({ slug: 'merge-sorted-lists' }).reason, /adapters/);
  assert.match(practiceContract({ slug: 'future-problem' }).reason, /no reviewed/);
});
for (const [slug, contract] of Object.entries(contracts)) {
  for (const [language, evaluate, solution] of [['python', py, solutions[slug][0]], ['javascript', js, solutions[slug][1]]]) {
    test(`${language}: ${slug} passes all visible cases`, () => {
      for (const testCase of contract.cases) assert.equal(evaluate(solution, contract.functions[language], testCase).status, 'passed');
    });
  }
}
test("structured failures, errors, logs, strict booleans and unsupported returns in both languages", () => {
  const testCase = { args: [], expected: true };
  for (const [evaluate, code] of [[js, 'function solve() { console.log("hello"); return 1; }'], [py, 'def solve():\n    print("hello")\n    return 1']]) {
    const result = evaluate(code, 'solve', testCase);
    assert.equal(result.status, 'failed');
    assert.equal(result.actual, 1);
    assert.match(result.stdout, /hello/);
  }
  assert.equal(js('function solve() {}', 'solve', testCase).status, 'error');
  assert.equal(py('def solve(): return (1, 2)', 'solve', testCase).status, 'error');
  assert.equal(js('async function solve() { return true; }', 'solve', testCase).status, 'error');
  assert.equal(py('def solve(): return 1.0', 'solve', { args: [], expected: 1 }).status, 'passed');
  assert.match(js('function solve() { console.log("before"); throw Error("bad"); }', 'solve', testCase).stdout, /before/);
  assert.match(py('def solve():\n    print("before")\n    raise ValueError("bad")', 'solve', testCase).stdout, /before/);
  assert.equal(js('???', 'solve', testCase).status, 'error');
  assert.equal(py('def ???', 'solve', testCase).status, 'error');
  assert.equal(js('function other() {}', 'solve', testCase).status, 'error');
  assert.equal(py('def other(): pass', 'solve', testCase).status, 'error');
});
test("object keys are unordered and array positions are significant", () => {
  for (const [evaluate, object, array] of [[js, 'function solve() { return {b: 2, a: 1}; }', 'function solve() { return [2, 1]; }'], [py, "def solve(): return {'b': 2, 'a': 1}", 'def solve(): return [2, 1]']]) {
    assert.equal(evaluate(object, 'solve', { args: [], expected: { a: 1, b: 2 } }).status, 'passed');
    assert.equal(evaluate(array, 'solve', { args: [], expected: [1, 2] }).status, 'failed');
  }
});
async function setup(t) {
  const workers = [];
  const previous = globalThis.Worker;
  t.after(() => { if (previous === undefined) delete globalThis.Worker; else globalThis.Worker = previous; });
  globalThis.Worker = class {
    constructor() { workers.push(this); }
    postMessage(message) { this.message = message; }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage({ data }); }
  };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let source = (await readFile(new URL('../src/lib/practice/runner.ts', import.meta.url), 'utf8')).replace('"./harness"', JSON.stringify(new URL('../src/lib/practice/harness.ts', import.meta.url).href));
  source = source.replace('new URL("../runners/pythonWorker.ts", import.meta.url)', JSON.stringify(new URL('../src/lib/runners/pythonWorker.ts', import.meta.url).href));
  const { createPracticeRunner } = await import('data:text/javascript,' + encodeURIComponent(stripTypeScriptTypes(source)));
  return { workers, runner: createPracticeRunner() };
}
test("case workers stop on timeout, retain earlier results, and run subsequent cases", async t => {
  const { runner, workers } = await setup(t);
  const results = [];
  const contract = contracts['find-the-largest-number'];
  const run = runner.run('javascript', '', contract, result => results.push(result));
  workers[0].emit({ status: 'passed', actual: -2, stdout: '' });
  await Promise.resolve();
  assert.equal(workers[0].terminated, true);
  t.mock.timers.tick(2000);
  await run;
  assert.deepEqual(results.map(result => result.status), ['passed', 'timeout']);
  assert.deepEqual(results[1].expected, 6);
});
test("Python startup and execution budgets are separate; cancellation suppresses stale messages", async t => {
  const { runner, workers } = await setup(t);
  const results = [];
  const contract = { ...contracts['reverse-a-string'], cases: [{ args: ['a'], expected: 'a' }] };
  const run = runner.run('python', '', contract, result => results.push(result));
  t.mock.timers.tick(10000);
  assert.equal(workers[0].terminated, undefined);
  workers[0].emit({ type: 'ready' });
  t.mock.timers.tick(5000);
  await run;
  assert.equal(results[0].status, 'timeout');
  const cancelled = runner.run('python', '', contract, result => results.push(result));
  runner.cancel();
  workers[1].emit({ status: 'passed', actual: 'stale', stdout: '' });
  await cancelled;
  assert.equal(results.length, 1);
  assert.equal(workers[1].terminated, true);
  const startup = runner.run('python', '', contract, result => results.push(result));
  t.mock.timers.tick(30000);
  await startup;
  assert.match(results[1].error, /load in time/);
});
test("replacing a run and worker errors cannot leak old results", async t => {
  const { runner, workers } = await setup(t);
  const results = [];
  const contract = { ...contracts['reverse-a-string'], cases: [{ args: ['a'], expected: 'a' }] };
  const old = runner.run('javascript', '', contract, result => results.push(result));
  const next = runner.run('javascript', '', contract, result => results.push(result));
  workers[0].emit({ status: 'passed', actual: 'old', stdout: '' });
  workers[1].onerror();
  await Promise.all([old, next]);
  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'error');
});

test("practice runners own independent cancellation and cap captured logs", async t => {
  const { runner, workers } = await setup(t);
  const source = (await readFile(new URL('../src/lib/practice/runner.ts', import.meta.url), 'utf8')).replace('"./harness"', JSON.stringify(new URL('../src/lib/practice/harness.ts', import.meta.url).href));
  const { createPracticeRunner } = await import('data:text/javascript,' + encodeURIComponent(stripTypeScriptTypes(source)));
  const other = createPracticeRunner();
  const contract = { ...contracts['reverse-a-string'], cases: [{ args: ['a'], expected: 'a' }] };
  const results = [];
  const first = runner.run('javascript', '', contract, result => results.push(result));
  const second = other.run('javascript', '', contract, result => results.push(result));
  runner.cancel();
  assert.equal(workers[0].terminated, true);
  assert.equal(workers[1].terminated, undefined);
  workers[1].emit({ status: 'passed', actual: 'a', stdout: '' });
  await Promise.all([first, second]);
  assert.equal(results.length, 1);
  assert.equal(js('function solve() { console.log("a".repeat(20000)); return true; }', 'solve', { args: [], expected: true }).stdout.length, 8000);
  assert.equal(py('def solve():\n    print("a" * 20000)\n    return True', 'solve', { args: [], expected: true }).stdout.length, 8000);
});
