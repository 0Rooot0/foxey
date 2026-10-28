import type { editor } from "monaco-editor";
import * as Y from "yjs";

function normalizeLineEndings(text: Y.Text) {
  const source = text.toString();
  for (let index = source.length - 2; index >= 0; index--) {
    if (source[index] === "\r" && source[index + 1] === "\n") text.delete(index, 1);
  }
}

export function applyRoomUpdate(doc: Y.Doc, update: Uint8Array, origin: unknown) {
  // Normalize before Monaco observes the update, including late cloud hydration.
  doc.transact(() => {
    Y.applyUpdate(doc, update);
    normalizeLineEndings(doc.getText("code:python"));
    normalizeLineEndings(doc.getText("code:javascript"));
  }, origin);
}

export function prepareSharedModel(model: editor.ITextModel, text: Y.Text) {
  // Yjs and Monaco must count every Windows line break as one character.
  text.doc?.transact(() => normalizeLineEndings(text));
  model.setEOL(0); // Monaco EndOfLineSequence.LF
}
