export type HelpStep = "start" | "hint1" | "hint2" | "approach" | "confirm" | "solution";
export type HelpAction = "next" | "keepTrying" | "showSolution";

export function helpTransition(step: HelpStep, action: HelpAction): HelpStep {
  if (action === "showSolution") return step === "confirm" ? "solution" : step;
  if (action === "keepTrying") return step === "confirm" ? "approach" : step;
  if (action === "next") {
    switch (step) {
      case "start": return "hint1";
      case "hint1": return "hint2";
      case "hint2": return "approach";
      case "approach": return "confirm";
    }
  }
  return step;
}

export function revealedHints(step: HelpStep) {
  if (step === "start") return 0;
  if (step === "hint1") return 1;
  return 2;
}
