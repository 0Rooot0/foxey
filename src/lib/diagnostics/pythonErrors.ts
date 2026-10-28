export function briefPythonError(message: string) {
  const clean = message.replace(/^PythonError:\s*/, "").replace(/\s*\((?:<exec>|main\.py|solution\.py), line \d+\)$/, "");
  const match = clean.match(/^(\w*Error):\s*(.*)$/);
  const kind = match?.[1];
  const detail = match?.[2] ?? clean;
  if (kind === "TabError") return "Mixed tabs and spaces. Use consistent indentation.";
  if (detail.startsWith("expected an indented block")) {
    const line = detail.match(/on line (\d+)/)?.[1];
    return line ? `Expected an indented block after line ${line}.` : "Expected an indented block.";
  }
  if (detail === "unexpected indent") return "Unexpected indentation.";
  if (detail === "unindent does not match any outer indentation level") return "Indentation does not match an outer block.";
  if (detail.startsWith("unterminated string literal")) return "Unterminated string literal.";
  const unclosed = detail.match(/^(.+) was never closed$/);
  if (unclosed) return `Unclosed ${unclosed[1]}.`;
  if (kind === "SyntaxError" || kind === "IndentationError") {
    return detail.charAt(0).toUpperCase() + detail.slice(1) + (/[.!?]$/.test(detail) ? "" : ".");
  }
  return clean;
}

export function pythonRunError(message: string) {
  const lines = message.split("\n").map(line => line.trim()).filter(Boolean);
  const error = lines.at(-1) ?? message;
  const syntaxLine = error.match(/\((?:<exec>|main\.py|solution\.py), line (\d+)\)$/)?.[1];
  const frame = [...lines].reverse().find(line => /File "(?:<exec>|main\.py|solution\.py)", line \d+/.test(line));
  const line = syntaxLine ?? frame?.match(/, line (\d+)/)?.[1];
  return `${line ? `Line ${line}: ` : ""}${briefPythonError(error)}`;
}
