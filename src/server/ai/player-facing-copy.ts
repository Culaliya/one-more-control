const LATIN_SCRIPT_LETTER = /\p{Script=Latin}/u;
const LETTER = /\p{L}/u;
const SENTENCE_END = /[.!?](?:["')\]])*$/u;

export const MAX_AI_NARRATIVE_CHARACTERS = 160;

export function usesOnlyLatinScriptLetters(value: string): boolean {
  return [...value].every(
    (character) =>
      !LETTER.test(character) || LATIN_SCRIPT_LETTER.test(character),
  );
}

export function isSafePlayerFacingLabel(value: string): boolean {
  const normalized = value.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= MAX_AI_NARRATIVE_CHARACTERS &&
    usesOnlyLatinScriptLetters(normalized)
  );
}

export function isCompletePlayerFacingSentence(value: string): boolean {
  const normalized = value.trim();
  return isSafePlayerFacingLabel(normalized) && SENTENCE_END.test(normalized);
}
