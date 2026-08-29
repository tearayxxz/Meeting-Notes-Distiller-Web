import type { Decision, NormalizedTranscript, TopicResult } from '@meeting-distiller/shared';
import { normalizeWhitespace, stripTerminalPunctuation } from './text-utils.js';

interface TopicDefinition {
  name: string;
  pattern: RegExp;
}

const topicDefinitions: TopicDefinition[] = [
  { name: 'Release planning', pattern: /\b(?:release|launch|go-live|deploy(?:ment)?)\b|เปิดตัว/iu },
  { name: 'Infrastructure preparation', pattern: /\b(?:server|infrastructure|database|migration|production|hosting|query latency|index|incident|postmortem|outage)\b|เซิร์ฟเวอร์|ฐานข้อมูล|เหตุขัดข้อง/iu },
  { name: 'Marketing campaign', pattern: /\b(?:marketing|campaign|announcement|promotion|advertising|press|media|news)\b|การตลาด|ประกาศ|สื่อ|สำนักข่าว/iu },
  { name: 'Schedule and timeline', pattern: /\b(?:schedule|timeline|milestone|deadline|calendar|on-call|rotation|next week)\b|กำหนดการ|นัด|สัปดาห์หน้า|วันไหน/iu },
  { name: 'Budget and costs', pattern: /\b(?:budget|cost|pricing|expense|funding|finance|load-testing tool)\b|งบ(?:ประมาณ)?|การเงิน/iu },
  { name: 'Product planning', pattern: /\b(?:feature|product|requirement|customer|feedback|design|mobile|api|churn|mockup|dashboard|logging library|developer|dev|freeze)\b|ผลิตภัณฑ์|มือถือ|ฟีเจอร์|ดีไซน์|จ้าง/iu },
];

export const classifyTopic = (text: string): string =>
  topicDefinitions.find(({ pattern }) => pattern.test(text))?.name ?? 'General discussion';

const summaryFor = (name: string, evidence: string[]): string => {
  const excerpt = stripTerminalPunctuation(normalizeWhitespace(evidence.join(' '))).slice(0, 180);
  return `${name} covered ${excerpt}${excerpt.length === 180 ? '…' : '.'}`;
};

export const extractTopics = (
  transcript: NormalizedTranscript,
  decisions: Decision[],
): TopicResult[] => {
  if (transcript.utterances.length === 0) return [];
  const grouped = new Map<string, string[]>();
  const evidenceTopic = new Map<string, string>();
  const headings = transcript.utterances.filter(({ kind }) => kind === 'heading');
  const useExplicitSections = transcript.format === 'speaker-colon' && headings.length >= 2;
  let activeTopic = 'General discussion';

  for (const { kind, text } of transcript.utterances) {
    if (kind === 'metadata') continue;
    if (kind === 'heading') {
      if (useExplicitSections) activeTopic = text;
      continue;
    }

    const classified = classifyTopic(text);
    const name = useExplicitSections
      ? activeTopic
      : classified === 'General discussion' && activeTopic !== 'General discussion'
        ? activeTopic
        : classified;
    if (!useExplicitSections && classified !== 'General discussion') activeTopic = classified;
    const evidence = grouped.get(name) ?? [];
    evidence.push(text);
    grouped.set(name, evidence);
    evidenceTopic.set(text, name);
  }

  return [...grouped.entries()].map(([name, evidence]) => ({
    name,
    summary: summaryFor(name, evidence),
    decisions: decisions.filter((decision) => (evidenceTopic.get(decision.evidence) ?? classifyTopic(decision.evidence)) === name),
  }));
};
