import type { Decision, NormalizedTranscript, TopicResult } from '@meeting-distiller/shared';
import { normalizeWhitespace, stripTerminalPunctuation } from './text-utils.js';

interface TopicDefinition {
  name: string;
  pattern: RegExp;
}

const topicDefinitions: TopicDefinition[] = [
  { name: 'Release planning', pattern: /\b(?:release|launch|go-live|deploy(?:ment)?)\b|เปิดตัว/iu },
  { name: 'Infrastructure preparation', pattern: /\b(?:server|infrastructure|database|migration|production|hosting)\b|เซิร์ฟเวอร์/iu },
  { name: 'Marketing campaign', pattern: /\b(?:marketing|campaign|announcement|promotion|advertising)\b|การตลาด/iu },
  { name: 'Schedule and timeline', pattern: /\b(?:schedule|timeline|milestone|deadline|calendar)\b|กำหนดการ/iu },
  { name: 'Budget and costs', pattern: /\b(?:budget|cost|pricing|expense|funding)\b|งบประมาณ/iu },
  { name: 'Product planning', pattern: /\b(?:feature|product|requirement|customer|feedback|design)\b|ผลิตภัณฑ์/iu },
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

  for (const { text } of transcript.utterances) {
    const name = classifyTopic(text);
    const evidence = grouped.get(name) ?? [];
    evidence.push(text);
    grouped.set(name, evidence);
  }

  return [...grouped.entries()].map(([name, evidence]) => ({
    name,
    summary: summaryFor(name, evidence),
    decisions: decisions.filter((decision) => classifyTopic(decision.evidence) === name),
  }));
};
