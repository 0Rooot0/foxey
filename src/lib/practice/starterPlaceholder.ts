type Change = { rangeOffset: number; rangeLength: number; text: string };
type Placeholder = { body: number; end: number; start: number };

export function createStarterPlaceholders(starter: string) {
  const lines = [...starter.matchAll(/[^\n]*(?:\n|$)/g)].filter(line => line[0]);
  let pending: Placeholder[] = [];
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i][0];
    if (!/^([ \t]*)(?:async )?def \w+\([^\n]*\):[ \t]*\r?\n$/.test(header)) continue;
    const indent = header.match(/^[ \t]*/)![0].length;
    const body = lines[i].index! + header.length;
    let end = starter.length;
    const statements = [];
    for (let j = i + 1; j < lines.length; j++) {
      const text = lines[j][0];
      if (!text.trim() || text.trimStart().startsWith("#")) continue;
      if (text.match(/^[ \t]*/)![0].length <= indent) {
        end = lines[j].index!;
        break;
      }
      statements.push(lines[j]);
    }
    if (statements.length === 1 && statements[0][0].trim() === "pass") {
      pending.push({ body, end, start: statements[0].index! + statements[0][0].indexOf("pass") });
    }
  }
  return {
    update(changes: readonly Change[], undoOrRedo = false) {
      if (undoOrRedo) pending = [];
      const removals: number[] = [];
      const next: Placeholder[] = [];
      const shift = (offset: number) => offset + changes.reduce((delta, change) =>
        change.rangeOffset <= offset ? delta + change.text.length - change.rangeLength : delta, 0);
      for (const placeholder of pending) {
        const touched = changes.some(change =>
          change.rangeOffset < placeholder.start + 4 &&
          change.rangeOffset + change.rangeLength > placeholder.start);
        if (touched) continue;
        const start = shift(placeholder.start);
        const editingBody = changes.some(change => change.rangeOffset >= placeholder.body &&
          (change.rangeOffset < placeholder.end || change.rangeOffset === placeholder.start + 4) && /\S/.test(change.text));
        if (editingBody) removals.push(start);
        else next.push({ body: shift(placeholder.body), end: shift(placeholder.end), start });
      }
      pending = next;
      return removals;
    },
  };
}
