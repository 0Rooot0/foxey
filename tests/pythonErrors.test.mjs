import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import ts from "typescript";
import { briefPythonError, pythonRunError } from "../src/lib/diagnostics/pythonErrors.ts";

const workerSource = await readFile(new URL('../src/lib/runners/pythonWorker.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(workerSource.replace(/^import .*pythonErrors";$/m, ''), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
async function diagnose(code) {
  const messages = [];
  const globals = {};
  const runtime = {
    globals: { set: (key, value) => { globals[key] = value; } },
    async runPythonAsync(script) {
      const program = `import ast, json
_foxey_source = json.loads(${JSON.stringify(JSON.stringify(code))})
module = ast.parse(json.loads(${JSON.stringify(JSON.stringify(script))}))
module.body[-1] = ast.Expr(value=ast.Call(func=ast.Name(id="print", ctx=ast.Load()), args=[module.body[-1].value], keywords=[]))
exec(compile(ast.fix_missing_locations(module), "check.py", "exec"))`;
      assert.equal(globals._foxey_source, code);
      const result = spawnSync(process.env.FOXEY_TEST_PYTHON || 'python', ['-c', program], { encoding: 'utf8', timeout: 3000 });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    },
  };
  const self = { loadPyodide: async () => runtime, postMessage: (value) => messages.push(value) };
  vm.runInNewContext(compiled, { self, briefPythonError, pythonRunError });
  await self.onmessage({ data: { type: 'diagnostics', id: 7, code } });
  assert.equal(messages[0].id, 7);
  assert.notEqual(messages[0].failed, true);
  return messages[0].error;
}
for (const [name, source] of Object.entries({
  'four spaces': 'def solve():\n    return 1\n',
  'two spaces': 'def solve():\n  return 1\n',
  'tabs': 'def solve():\n\treturn 1\n',
  'valid mixed whitespace': 'def solve():\n \treturn 1\n',
  'multiline strings and continued expressions': 'text = """first\n\tsecond\n third"""\nvalues = [1,\n  2]\n',
  'CRLF': 'if True:\r\n    pass\r\n',
  'top-level await': 'await work()\n',
})) test(`valid Python ${name} has no indentation diagnostic`, async () => assert.equal(await diagnose(source), null));

test('missing block, mismatched indentation, and real TabError remain actionable', async () => {
  const missing = await diagnose('def solve():\nreturn 1');
  assert.equal(missing.lineno, 2);
  assert.equal(missing.message, 'Expected an indented block after line 1.');
  const mismatch = await diagnose('if True:\n    pass\n  pass');
  assert.equal(mismatch.lineno, 3);
  assert.equal(mismatch.message, 'Indentation does not match an outer block.');
  const mixed = await diagnose('if True:\n\tpass\n        pass');
  assert.equal(mixed.lineno, 3);
  assert.equal(mixed.message, 'Mixed tabs and spaces. Use consistent indentation.');
});
test('short syntax hints preserve useful details', () => {
  assert.equal(briefPythonError("SyntaxError: expected ':'"), "Expected ':'.");
  assert.equal(briefPythonError("SyntaxError: '(' was never closed"), "Unclosed '('.");
  assert.equal(briefPythonError('SyntaxError: unterminated string literal (detected at line 3)'), 'Unterminated string literal.');
  assert.equal(briefPythonError("NameError: name 'total' is not defined"), "NameError: name 'total' is not defined");
});
test('Run reports the student syntax line rather than a Pyodide internal frame', () => {
  const traceback = 'PythonError: Traceback (most recent call last):\n  File "/lib/python3.13/site-packages/_pyodide/_base.py", line 597\nIndentationError: unexpected indent (<exec>, line 4)';
  assert.equal(pythonRunError(traceback), 'Line 4: Unexpected indentation.');
  assert.equal(pythonRunError('SyntaxError: invalid syntax (solution.py, line 2)'), 'Line 2: Invalid syntax.');
});
test('Run uses the innermost student frame and excludes internal traceback text', () => {
  const traceback = 'PythonError: Traceback (most recent call last):\n  File "/lib/python3.13/site-packages/_pyodide/_base.py", line 597\n  File "<exec>", line 8, in <module>\n  File "<exec>", line 3, in solve\nZeroDivisionError: division by zero';
  assert.equal(pythonRunError(traceback), 'Line 3: ZeroDivisionError: division by zero');
});
