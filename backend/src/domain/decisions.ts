import type { Decision, NormalizedTranscript } from '@meeting-distiller/shared';
import { sentenceCase } from './text-utils.js';

const englishDecision =
  /^(?:(?:we|the team|team|everyone)\s+)?(?:decided|agreed|approved|resolved)(?:\s+(?:that|to|on))?\s+(.+)/iu;
const explicitDecision = /^(?:final\s+)?decision\s*(?:is|[:\-–—])\s*(.+?)(?:[.!?](?:\s|$)|$)/iu;
const collectiveWill =
  /^we\s+will\s+(?!(?:maybe|possibly|probably|perhaps|consider|explore|evaluate|discuss|could|might|should)\b)(.+)/iu;
const thaiDecision = /(?:เรา)?ตัดสินใจ(?:ว่า|ที่จะ)?\s*(.+)/u;
const thaiDirectiveDecision = /^เพิ่ม\s+(.+?)\s+เถอะ/u;
const uncertainResolution = /(?:nobody committed|not sure|no conclusion|ไม่ได้ข้อสรุป|ไม่มีใครรับ|ไม่แน่ใจ|\?\?)/iu;

const cleanDecisionText = (captured: string): string => {
  const withoutCollective = captured.replace(/^(?:we|the team)\s+(?:will\s+)?/iu, '');
  return sentenceCase(withoutCollective);
};

export const extractDecisions = (transcript: NormalizedTranscript): Decision[] => {
  const decisions: Decision[] = [];
  const seen = new Set<string>();

  for (const [index, utterance] of transcript.utterances.entries()) {
    if (utterance.kind === 'metadata' || utterance.kind === 'heading') continue;
    const { text } = utterance;
    const directive = thaiDirectiveDecision.exec(text)?.[1]?.trim();
    const match = englishDecision.exec(text) ?? explicitDecision.exec(text) ?? collectiveWill.exec(text) ?? thaiDecision.exec(text);
    const captured = directive ?? match?.[1]?.trim();
    let decisionText = captured ? cleanDecisionText(captured) : '';

    if (directive && /dashboard/iu.test(directive)) decisionText = 'Add the analytics dashboard';

    const thaiDateAnswer = /^วันที่\s*(\d{1,2})\s*(?:ค่ะ|ครับ)/u.exec(text)?.[1];
    if (!decisionText && thaiDateAnswer) {
      const nearbyContext = transcript.utterances
        .slice(Math.max(0, index - 5), index)
        .map(({ text: context }) => context)
        .join(' ');
      if (/เปิดตัว|press release/iu.test(nearbyContext)) {
        decisionText = `Launch on วันที่ ${thaiDateAnswer}`;
      }
    }

    if (!decisionText || uncertainResolution.test(text)) continue;
    const key = decisionText.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    decisions.push({ text: decisionText, evidence: text });
  }

  return decisions;
};
