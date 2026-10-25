export type PythonSyntaxError = {
  message: string;
  lineno: number | null;
  offset: number | null;
  end_lineno: number | null;
  end_offset: number | null;
};

// Python offsets count Unicode code points; Monaco columns count UTF-16 units.
export function pythonMarker(source: string, error: PythonSyntaxError) {
  const lines = source.split(/\r\n|\r|\n/);
  const line = (value: number | null) => Math.max(1, Math.min(lines.length, value || 1));
  const column = (row: number, offset: number | null) =>
    Array.from(lines[row - 1]).slice(0, Math.max(0, (offset || 1) - 1)).join("").length + 1;
  const startLineNumber = line(error.lineno);
  const startColumn = column(startLineNumber, error.offset);
  const endLineNumber = Math.max(startLineNumber, line(error.end_lineno || error.lineno));
  const endColumn = Math.max(endLineNumber === startLineNumber ? startColumn : 1, column(endLineNumber, error.end_offset));
  return {
    message: error.message, severity: 8, source: "Python",
    startLineNumber, startColumn, endLineNumber,
    endColumn: endLineNumber === startLineNumber && endColumn === startColumn
      ? Math.min(lines[startLineNumber - 1].length + 1, startColumn + 1) : endColumn,
  };
}
