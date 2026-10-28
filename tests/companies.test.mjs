import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { blockedRunReason, contracts, practiceContract } from "../src/lib/practice/contracts.ts";
import { companyHref, isCompanySlug, mapCompanies, sortCompanyProblems } from "../src/lib/companies/companies.ts";
import { filterProblems } from "../src/lib/practice/problems.ts";

const sum = { id: "p1", slug: "two-number-sum", title: "Two Number Sum", difficulty: "easy", problem_tags: [{ tag: "Arrays" }] };
const brackets = { id: "p2", slug: "valid-brackets", title: "Valid Brackets", difficulty: "medium", problem_tags: [{ tag: "Stacks" }] };
const merge = { id: "p3", slug: "merge-sorted-lists", title: "Merge Sorted Lists", difficulty: "medium", problem_tags: [{ tag: "Linked Lists" }] };
const row = (slug, problems) => ({ id: slug, slug, name: slug[0].toUpperCase() + slug.slice(1), problem_companies: problems.map(problems => ({ problems })) });

test("company paths accept canonical slugs and reject unsafe route values", () => {
  for (const slug of ["amazon", "capital-one", "3m"]) {
    assert.equal(isCompanySlug(slug), true);
    assert.equal(companyHref(slug), `/companies/${slug}`);
  }
  for (const slug of ["", "Amazon", "../practice", "a/b", "a?b", "a%2fb", "a--b", "-a", "a-"]) {
    assert.equal(isCompanySlug(slug), false);
    assert.throws(() => companyHref(slug));
  }
});
test("one existing problem can belong to multiple companies without duplicating cards", () => {
  const result = mapCompanies([row("microsoft", [sum]), row("amazon", [sum, merge, sum])]);
  assert.deepEqual(result.map(c => c.slug), ["amazon", "microsoft"]);
  assert.deepEqual(result[0].problems.map(p => p.id), ["p3", "p1"]);
  assert.equal(result[0].problems[1].id, result[1].problems[0].id);
});
test("empty companies remain available while RLS-hidden problem joins are omitted", () => {
  assert.deepEqual(mapCompanies([]), []);
  assert.deepEqual(mapCompanies([row("amazon", [null])])[0].problems, []);
});
test("malformed catalog rows fail closed", () => {
  for (const data of [null, {}, [null], [row("bad/slug", [])], [{ ...row("amazon", []), problem_companies: null }], [row("amazon", [{}])], [row("amazon", [{ ...sum, difficulty: "expert" }])], [row("amazon", [{ ...sum, problem_tags: [null] }])], [{ ...row("amazon", []), problem_companies: [{}] }]]) {
    assert.throws(() => mapCompanies(data), /unavailable/);
  }
});
test("company title, difficulty and topic filters combine and do not mutate the catalog", () => {
  const problems = [brackets, sum, merge];
  assert.deepEqual(filterProblems(problems, " NUMBER ", "easy", "Arrays"), [sum]);
  assert.deepEqual(filterProblems(problems, "", "easy", "Stacks"), []);
  assert.deepEqual(filterProblems([], "", "", ""), []);
  assert.deepEqual(problems, [brackets, sum, merge]);
});
test("difficulty sorting has deterministic title ties and a safe default", () => {
  const problems = [brackets, sum, merge];
  assert.deepEqual(sortCompanyProblems(problems, "difficulty-asc"), [sum, merge, brackets]);
  assert.deepEqual(sortCompanyProblems(problems, "difficulty-desc"), [merge, brackets, sum]);
  assert.deepEqual(sortCompanyProblems(problems, "title"), [merge, sum, brackets]);
  assert.deepEqual(sortCompanyProblems(problems, "unknown"), [merge, sum, brackets]);
  assert.deepEqual(problems, [brackets, sum, merge]);
});

test("company cards share intentional Run blocks with the editor", () => {
  for (const problem of [sum, merge]) {
    assert.ok(blockedRunReason(problem.slug));
    assert.equal(blockedRunReason(problem.slug), practiceContract(problem).reason);
    assert.equal(practiceContract(problem).contract, undefined);
  }
  for (const slug of Object.keys(contracts)) assert.equal(blockedRunReason(slug), undefined);
  assert.equal(blockedRunReason("future-problem"), undefined);
});

test("company cards label blocked runners and keep every Practice link usable", async () => {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const source = await readFile(new URL("../src/components/ProblemLibrary.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiled = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiled, exports: compiled.exports,
    require: name => require(name.startsWith("@/") ? `../src/${name.slice(2)}.ts` : name),
  });
  const ProblemLibrary = compiled.exports.default;
  const { createElement } = require("react");
  const problems = [sum, merge, brackets];
  const html = renderToStaticMarkup(createElement(ProblemLibrary, { problems, companyName: "Amazon" }));
  for (const problem of problems) {
    const card = html.match(new RegExp(`<a[^>]*href="/practice/${problem.slug}"[^>]*>([\\s\\S]*?)</a>`));
    assert.ok(card, `${problem.slug} keeps its Practice link`);
    assert.equal(card[1].includes("Visible Run unavailable"), !!blockedRunReason(problem.slug));
  }
  const library = renderToStaticMarkup(createElement(ProblemLibrary, { problems }));
  assert.ok(!library.includes("Visible Run unavailable"), "badge is limited to company pages");
});
