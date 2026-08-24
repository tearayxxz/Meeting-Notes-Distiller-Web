import type { Decision, NormalizedTranscript } from '@meeting-distiller/shared';
import { sentenceCase } from './text-utils.js';

const englishDecision =
  /\b(?:we\s+)?(?:decided|agreed|approved|resolved|confirmed)(?:\s+(?:that|to|on))?\s+(.+)/iu;
const explicitDecision = /\b(?:final decision|decision is)\s*[:-]?\s*(.+)/iu;
const collectiveWill =
  /^we\s+will\s+(?!(?:maybe|possibly|probably|perhaps|consider|explore|evaluate|discuss|could|might|should)\b)(.+)/iu;
const thaiDecision = /(?:เรา)?ตัดสินใจ(?:ว่า|ที่จะ)?\s*(.+)/u;

export const extractDecisions = (transcript: NormalizedTranscript): Decision[] => {
  const decisions: Decision[] = [];
  const seen = new Set<string>();

  for (const { text } of transcript.utterances) {
    const match = englishDecision.exec(text) ?? explicitDecision.exec(text) ?? collectiveWill.exec(text) ?? thaiDecision.exec(text);
    const captured = match?.[1]?.trim();
    if (!captured) continue;
    const decisionText = sentenceCase(captured.replace(/^we\s+will\s+/iu, ''));
    const key = decisionText.toLocaleLowerCase();
    if (!decisionText || seen.has(key)) continue;
    seen.add(key);
    decisions.push({ text: decisionText, evidence: text });
  }

  return decisions;
};
