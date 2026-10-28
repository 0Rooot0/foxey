import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { contracts } from "../src/lib/practice/contracts.ts";
import { javascriptHarness, pythonHarness } from "../src/lib/practice/harness.ts";

const require = createRequire(import.meta.url);
async function compile(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiled, exports: compiled.exports,
    require: name => dependencies[name] ?? require(name),
  });
  return compiled.exports;
}
const { helpContent, problemHelp } = await compile("../src/lib/practice/help.ts", {
  "./contracts": require("../src/lib/practice/contracts.ts"),
});
const flow = await compile("../src/lib/practice/helpFlow.ts");
const { default: PracticeHelp, HelpBody } = await compile("../src/components/PracticeHelp.tsx", {
  "@/lib/practice/helpFlow": flow,
});
const content = helpContent["valid-brackets"];
const render = step => renderToStaticMarkup(createElement(HelpBody, { content, step, dispatch() {} }));

test("help lookup requires the reviewed contract and exact baseline, including normalized line endings", () => {
  assert.deepEqual(Object.keys(helpContent).sort(), Object.keys(contracts).sort());
  for (const [slug, contract] of Object.entries(contracts)) {
    const problem = { slug, ...contract.baseline };
    assert.equal(problemHelp(problem), helpContent[slug]);
    assert.equal(problemHelp({ ...problem, description: problem.description.replaceAll("\n", "\r\n") }), helpContent[slug]);
    for (const key of Object.keys(contract.baseline)) {
      assert.equal(problemHelp({ ...problem, [key]: "changed" }), undefined);
    }
    const version = contract.version;
    try {
      contract.version++;
      assert.equal(problemHelp(problem), undefined, "a newer callable contract needs help review too");
    } finally { contract.version = version; }
  }
  for (const slug of ["two-number-sum", "merge-sorted-lists", "unknown", "constructor", "__proto__"]) {
    assert.equal(problemHelp({ slug }), undefined);
  }
});

test("progressive steps, cancellation, and repeated clicks require explicit confirmation", () => {
  let step = "start";
  for (const expected of ["hint1", "hint2", "approach", "confirm"]) {
    step = flow.helpTransition(step, "next");
    assert.equal(step, expected);
  }
  assert.equal(flow.helpTransition(step, "next"), "confirm");
  step = flow.helpTransition(step, "keepTrying");
  assert.equal(step, "approach");
  assert.equal(flow.helpTransition(step, "showSolution"), "approach");
  step = flow.helpTransition(step, "next");
  step = flow.helpTransition(step, "showSolution");
  assert.equal(step, "solution");
  for (const state of ["start", "hint1", "hint2", "approach", "confirm", "solution"]) {
    for (const action of ["next", "keepTrying", "showSolution"]) {
      const next = flow.helpTransition(state, action);
      if (next === "solution" && state !== "solution") {
        assert.equal(state, "confirm");
        assert.equal(action, "showSolution");
      }
    }
  }
});

test("rendered hints are sequential and walkthrough prose and code never render before confirmation", () => {
  for (const [index, step] of ["start", "hint1", "hint2", "approach", "confirm"].entries()) {
    const html = render(step);
    assert.equal(html.includes("<h3>Hint 1</h3>"), index >= 1);
    assert.equal(html.includes("<h3>Hint 2</h3>"), index >= 2);
    assert.equal(html.includes("<h3>Approach</h3>"), index >= 3);
    assert.equal(html.includes("Ready to see the solution?"), step === "confirm");
    assert.ok(!html.includes("<pre"));
    for (const title of ["Simple explanation", "Brute-force approach", "Optimal approach", "Common mistakes", "Python solution"]) {
      assert.ok(!html.includes(`<h3>${title}</h3>`));
    }
    assert.ok(!html.includes(content.explanation));
  }
  const cancelled = render(flow.helpTransition("confirm", "keepTrying"));
  assert.ok(!cancelled.includes("<pre"));
  assert.ok(cancelled.includes("See solution options"));
  const solution = render("solution");
  for (const title of ["Simple explanation", "Brute-force approach", "Better approach", "Optimal approach", "Why it works", "Time complexity", "Space complexity", "Python solution", "JavaScript solution", "Common mistakes"]) {
    assert.ok(solution.includes(`<h3>${title}</h3>`), title);
  }
  assert.equal((solution.match(/<pre/g) ?? []).length, 2);
});

test("unavailable help has no reveal controls or solution and fresh instances begin concealed", () => {
  const unavailable = renderToStaticMarkup(createElement(PracticeHelp));
  assert.ok(unavailable.includes("Guided help is not available for this problem yet."));
  assert.ok(!unavailable.includes("<button"));
  assert.ok(!unavailable.includes("<pre"));
  const fresh = renderToStaticMarkup(createElement(PracticeHelp, { content }));
  assert.ok(fresh.includes("Reveal Hint 1"));
  assert.ok(!fresh.includes("<h3>Hint 1</h3>"));
  assert.ok(!fresh.includes("<pre"));
});

const extraCases = {
  "reverse-a-string": [{ args: ["  A!?  "], expected: "  ?!A  " }],
  "find-the-largest-number": [{ args: [[-1000000]], expected: -1000000 }, { args: [[3, -1, 1000000, 3]], expected: 1000000 }],
  "count-frequencies": [{ args: [["constructor", "fox", "constructor", "tostring", "hasownproperty"]], expected: { constructor: 2, fox: 1, tostring: 1, hasownproperty: 1 } }],
  "valid-brackets": [
    { args: [")("], expected: false }, { args: ["(("], expected: false },
    { args: ["[({})]()"], expected: true }, { args: ["[(])"], expected: false },
  ],
};
for (const [slug, contract] of Object.entries(contracts)) {
  test(`walkthrough solutions match ${slug} callable contract in Python and JavaScript`, () => {
    for (const testCase of [...contract.cases, ...extraCases[slug]]) {
      let result;
      vm.runInNewContext(javascriptHarness(helpContent[slug].javascript, contract.functions.javascript, testCase), {
        self: { postMessage: value => { result = value; } }, console: {},
      }, { timeout: 1000 });
      assert.equal(result.status, "passed", JSON.stringify(result));
      const program = pythonHarness(helpContent[slug].python, contract.functions.python, testCase)
        .replace(/_foxey_case\(\)\s*$/, "print(_foxey_case())");
      const run = spawnSync(process.env.FOXEY_TEST_PYTHON || "python", ["-c", program], { encoding: "utf8", timeout: 3000 });
      assert.equal(run.status, 0, run.stderr);
      const pythonResult = JSON.parse(run.stdout);
      assert.equal(pythonResult.status, "passed", JSON.stringify(pythonResult));
    }
  });
}
