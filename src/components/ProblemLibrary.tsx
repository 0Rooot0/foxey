"use client";
import { useState } from "react";
import { blockedRunReason } from "@/lib/practice/contracts";
import Link from "next/link";
import {
  difficulties,
  filterProblems,
  problemTopics,
} from "@/lib/practice/problems";
import { sortCompanyProblems, type CompanyProblem } from "@/lib/companies/companies";
export default function ProblemLibrary({ problems, companyName }: {
  problems: CompanyProblem[];
  companyName?: string;
}) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [topic, setTopic] = useState("");
  const [sort, setSort] = useState("title");
  const filtered = filterProblems(problems, search, difficulty, topic);
  const visible = companyName ? sortCompanyProblems(filtered, sort) : filtered;
  return (
    <>
      <p className="practice-eyebrow">A little practice. A new possibility.</p>
      <h1>{companyName ? `${companyName} practice problems` : "Problem Library"}</h1>
      <p>
        Explore a problem and work through your ideas in Python or JavaScript.
      </p>
      {companyName && <p>Community-reported associations may be incomplete or outdated.
        These original Foxey exercises cover related algorithmic ideas; they are not verified interview questions.
        Foxey is not affiliated with or endorsed by {companyName}.</p>}
      <div className="practice-filters">
        <label>
          Search by title
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a problem"
          />
        </label>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All difficulties</option>
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {problemTopics(problems).map((tag) => (
              <option key={tag}>{tag}</option>
            ))}
          </select>
        </label>
        {companyName && <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="title">Title A–Z</option>
            <option value="difficulty-asc">Difficulty: easy first</option>
            <option value="difficulty-desc">Difficulty: hard first</option>
          </select>
        </label>}
      </div>
      <p role="status">
        {visible.length} {visible.length === 1 ? "problem" : "problems"}
      </p>
      <div className="problem-list">
        {visible.map((p) => (
          <Link
            className="problem-card"
            key={p.id}
            href={"/practice/" + p.slug}
          >
            <h2>{p.title}</h2>
            <span className={"difficulty " + p.difficulty}>{p.difficulty}</span>
            <div className="practice-tags">
              {companyName && blockedRunReason(p.slug) && (
                <span>Visible Run unavailable</span>
              )}
              {p.problem_tags.map(({ tag }) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <span>Open problem →</span>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <p>
          {problems.length
            ? "No matching problems. Try different filters."
            : "No published problems yet. Check back soon."}
        </p>
      )}
    </>
  );
}
