"use client";

import { useEffect, useReducer, useRef } from "react";
import type { HelpContent } from "@/lib/practice/help";
import { helpTransition, revealedHints, type HelpAction, type HelpStep } from "@/lib/practice/helpFlow";

const nextLabel = {
  start: "Reveal Hint 1",
  hint1: "Reveal Hint 2",
  hint2: "Reveal Approach",
  approach: "See solution options",
};

export function HelpWalkthrough({ content }: { content: HelpContent }) {
  return <div className="practice-walkthrough">
    {([
      ["Simple explanation", content.explanation],
      ["Brute-force approach", content.bruteForce],
      ["Better approach", content.better],
      ["Optimal approach", content.optimal],
      ["Why it works", content.why],
      ["Time complexity", content.time],
      ["Space complexity", content.space],
    ] as const).map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
    <section><h3>Python solution</h3><pre tabIndex={0} aria-label="Python solution code"><code>{content.python}</code></pre></section>
    <section><h3>JavaScript solution</h3><pre tabIndex={0} aria-label="JavaScript solution code"><code>{content.javascript}</code></pre></section>
    <section><h3>Common mistakes</h3><p>{content.mistakes}</p></section>
  </div>;
}

export function HelpBody({ content, step, dispatch }: {
  content: HelpContent; step: HelpStep; dispatch: (action: HelpAction) => void;
}) {
  const nextButton = useRef<HTMLButtonElement>(null);
  const solutionHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === "confirm" && step === "approach") nextButton.current?.focus();
    if (step === "solution") solutionHeading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const approachVisible = step === "approach" || step === "confirm" || step === "solution";
  return <>
    <p>Take one nudge at a time. The full walkthrough opens only after you choose Show Solution.</p>
    <div aria-live="polite">
      {content.hints.slice(0, revealedHints(step)).map((hint, index) => <section key={index}>
        <h3>Hint {index + 1}</h3><p>{hint}</p>
      </section>)}
      {approachVisible && <section><h3>Approach</h3><p>{content.approach}</p></section>}
    </div>
    {step !== "confirm" && step !== "solution" && <button ref={nextButton} type="button" onClick={() => dispatch("next")}>{nextLabel[step]}</button>}
    {step === "confirm" && <div className="practice-help-confirm" role="group" aria-label="Ready to see the solution?">
      <h3>Ready to see the solution?</h3>
      <p>You can keep working with the hints or open the complete walkthrough.</p>
      <div className="practice-help-actions">
        <button type="button" autoFocus onClick={() => dispatch("keepTrying")}>Keep Trying</button>
        <button type="button" onClick={() => dispatch("showSolution")}>Show Solution</button>
      </div>
    </div>}
    {step === "solution" && <>
      <h3 ref={solutionHeading} tabIndex={-1}>Solution walkthrough</h3>
      <HelpWalkthrough content={content} />
    </>}
  </>;
}

export default function PracticeHelp({ content }: { content?: HelpContent }) {
  const [step, dispatch] = useReducer(helpTransition, "start");
  return <section className="practice-help" aria-label="Guided help">
    <h2>Guided help</h2>
    {content
      ? <HelpBody content={content} step={step} dispatch={dispatch} />
      : <p>Guided help is not available for this problem yet.</p>}
  </section>;
}
