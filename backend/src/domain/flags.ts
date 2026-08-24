import type {
  ActionItem,
  Decision,
  NormalizedTranscript,
  ProblemFlag,
} from '@meeting-distiller/shared';
import { extractAllDates } from './text-utils.js';
import { classifyTopic } from './topics.js';

const optionLanguage = /\b(?:could|might|maybe|possible|consider|option|or|should)\b|(?:อาจ|หรือ)/iu;
const dateLedAlternative =
  /^(?:(?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\d{4}-\d{2}-\d{2}|tomorrow|วัน(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์))\s+(?:(?:could|would|might|may|should)\s+(?:(?:be\s+)?(?:safer|better|possible)|work)|is\s+(?:also\s+)?(?:possible|safer|better)|(?:is\s+)?(?:also\s+)?an?\s+option|instead)(?:\s+instead)?[.!?]*$/iu;
const preparationContinuation =
  /^let['’]?s\s+prepare\s+for\s+(?:(?:next\s+|this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\d{4}-\d{2}-\d{2}|tomorrow|วัน(?:จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์|อาทิตย์))[.!?]*$/iu;
const subjectPatterns = [
  { label: 'go-live', pattern: /\bgo-live\b/iu },
  { label: 'launch', pattern: /\blaunch\b|เปิดตัว/iu },
  { label: 'release', pattern: /\brelease\b/iu },
  { label: 'deployment', pattern: /\bdeploy(?:ment)?\b/iu },
];

const groupEvidenceByTopic = (items: string[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  let activeTopic = 'General discussion';

  for (const text of items) {
    const classified = classifyTopic(text);
    if (classified !== 'General discussion') activeTopic = classified;
    const inheritsTopic =
      classified === 'General discussion' &&
      activeTopic !== 'General discussion' &&
      (preparationContinuation.test(text) || dateLedAlternative.test(text));
    const topic = inheritsTopic ? activeTopic : classified;
    const evidence = grouped.get(topic) ?? [];
    evidence.push(text);
    grouped.set(topic, evidence);
  }

  return grouped;
};

export const detectProblemFlags = (
  transcript: NormalizedTranscript,
  decisions: Decision[],
  actions: ActionItem[],
): ProblemFlag[] => {
  const flags: ProblemFlag[] = [];
  const optionEvidence = transcript.utterances
    .map(({ text }) => text)
    .filter((text) => optionLanguage.test(text));
  const allEvidence = transcript.utterances.map(({ text }) => text);
  const actionEvidence = new Set(actions.map(({ evidence }) => evidence));
  const conflictEvidence = allEvidence.filter(
    (text) => extractAllDates(text).length > 0 && !actionEvidence.has(text),
  );
  const conflictDates = [
    ...new Set(
      extractAllDates(conflictEvidence.join(' ')).map((date) => date.toLocaleLowerCase()),
    ),
  ];

  const unresolvedOptions = [...groupEvidenceByTopic(optionEvidence).values()].find(
    (evidence) => evidence.length >= 2,
  );
  if (decisions.length === 0 && unresolvedOptions) {
    flags.push({
      type: 'no-decision',
      message: 'No decision detected: multiple options were discussed without a final resolution.',
      evidence: unresolvedOptions,
    });
  }

  if (decisions.length === 0 && conflictDates.length >= 2) {
    const evidenceByTopic = groupEvidenceByTopic(conflictEvidence);

    for (const evidence of evidenceByTopic.values()) {
      const topicDates = [
        ...new Set(extractAllDates(evidence.join(' ')).map((date) => date.toLocaleLowerCase())),
      ];
      if (topicDates.length < 2) continue;
      const sharedSubject = subjectPatterns.find(({ pattern }) => evidence.some((text) => pattern.test(text)));
      if (!sharedSubject) continue;
      flags.push({
        type: 'conflict',
        message: `Multiple ${sharedSubject.label} dates were mentioned with no final decision.`,
        evidence,
      });
    }
  }

  for (const action of actions.filter(({ owner }) => owner === null)) {
    flags.push({
      type: 'unassigned-action',
      message: `Action item has no assigned owner: ${action.task}.`,
      evidence: [action.evidence],
    });
  }

  for (const warning of transcript.warnings) {
    flags.push({ type: 'parse-warning', message: warning, evidence: [] });
  }

  return flags;
};
