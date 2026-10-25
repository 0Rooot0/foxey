import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterProblems,
  isDifficulty,
  problemTopics,
  starterCode,
} from "../src/lib/practice/problems.ts";
const problems = [
  {
    title: "Two Number Sum",
    difficulty: "easy",
    problem_tags: [{ tag: "Arrays" }, { tag: "Hash Maps" }],
  },
  {
    title: "Valid Brackets",
    difficulty: "medium",
    problem_tags: [{ tag: "Stacks" }],
  },
  {
    title: "Largest Number",
    difficulty: "easy",
    problem_tags: [{ tag: "Arrays" }],
  },
];
test("title search trims whitespace and ignores case", () => {
  assert.equal(filterProblems(problems, " NUMBER ", "", "").length, 2);
});
test("difficulty and topic filters combine with title search", () => {
  assert.equal(filterProblems(problems, "", "easy", "Arrays").length, 2);
  assert.equal(filterProblems(problems, "Sum", "medium", "Arrays").length, 0);
  assert.equal(filterProblems(problems, "", "", "Stacks").length, 1);
  assert.equal(filterProblems(problems, "", "", "").length, 3);
});
test("empty libraries and no matches return empty results", () => {
  assert.deepEqual(filterProblems([], "", "", ""), []);
  assert.deepEqual(filterProblems(problems, "unknown", "", ""), []);
});
test("difficulty allows only database values", () => {
  for (const value of ["easy", "medium", "hard"])
    assert.equal(isDifficulty(value), true);
  for (const value of ["", "Easy", "expert", " easy"])
    assert.equal(isDifficulty(value), false);
});
test("starter code selects each language including empty code", () => {
  const p = { starter_code_python: "pass", starter_code_javascript: "" };
  assert.equal(starterCode(p, "python"), "pass");
  assert.equal(starterCode(p, "javascript"), "");
});
test("topics are deduplicated and sorted", () => {
  assert.deepEqual(problemTopics(problems), ["Arrays", "Hash Maps", "Stacks"]);
  assert.deepEqual(problemTopics([]), []);
});
