import type {
  ActionItem,
  Decision,
  NormalizedTranscript,
  ProblemFlag,
} from '@meeting-distiller/shared';
import { extractAllDates } from './text-utils.js';
import { classifyTopic } from './topics.js';

const optionLanguage = /\b(?:could|might|maybe|possible|consider|option|or|should|whether|no conclusion)\b|(?:อาจ|หรือ|ควร|ได้ไหม|ไม่ได้ข้อสรุป|ยังไม่ได้ข้อสรุป|ตกลงว่ายังไง)/iu;
const explicitlyUnresolved = /\b(?:no conclusion|not decided|not sure|unresolved)\b|(?:ไม่ได้ข้อสรุป|ยังไม่ได้ข้อสรุป|ค่อยกลับมาคุย|ตกลงว่ายังไง|ไม่แน่ใจ)/iu;
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
  const semanticUtterances = transcript.utterances.filter(
    ({ kind }) => kind !== 'metadata' && kind !== 'heading',
  );
  const optionEvidence = semanticUtterances
    .map(({ text }) => text)
    .filter((text) => optionLanguage.test(text));
  const allEvidence = semanticUtterances.map(({ text }) => text);
  const actionEvidence = new Set(actions.map(({ evidence }) => evidence));
  const conflictEvidence = allEvidence.filter(
    (text) => extractAllDates(text).length > 0 && !actionEvidence.has(text),
  );
  const conflictDates = [
    ...new Set(
      extractAllDates(conflictEvidence.join(' ')).map((date) => date.toLocaleLowerCase()),
    ),
  ];

  const unresolvedOptions = [...groupEvidenceByTopic(optionEvidence).entries()].find(
    ([topic, evidence]) => {
      if (evidence.length < 2) return false;
      const topicHasDecision = decisions.some(({ evidence: decisionEvidence }) => classifyTopic(decisionEvidence) === topic);
      return !topicHasDecision || evidence.some((text) => explicitlyUnresolved.test(text));
    },
  )?.[1];
  const parkingLotIndex = transcript.utterances.findIndex(
    ({ kind, text }) => kind === 'heading' && /^parking lot$/iu.test(text),
  );
  const parkingLotEvidence = parkingLotIndex >= 0
    ? transcript.utterances
        .slice(parkingLotIndex + 1)
        .filter(({ kind }) => kind === 'note' || kind === 'speech')
        .map(({ text }) => text)
    : [];
  const explicitUnresolvedEvidence = allEvidence.filter((text) => explicitlyUnresolved.test(text));
  const noDecisionEvidence = explicitUnresolvedEvidence.length > 0
    ? explicitUnresolvedEvidence
    : unresolvedOptions ?? (parkingLotEvidence.length > 0 ? parkingLotEvidence : null);
  if (noDecisionEvidence) {
    flags.push({
      type: 'no-decision',
      message: 'No decision detected: multiple options were discussed without a final resolution.',
      evidence: noDecisionEvidence,
    });
  }

  const launchDecision = decisions.find(({ text, evidence }) => /\blaunch\b|เปิดตัว/iu.test(`${text} ${evidence}`));
  const finalLaunchDate = launchDecision
    ? extractAllDates(`${launchDecision.text} ${launchDecision.evidence}`)[0]
    : undefined;
  const publishedLaunchEvidence = allEvidence.filter(
    (text) => /press release|บอกสื่อ|สำนักข่าว|เผยแพร่/iu.test(text) && extractAllDates(text).length > 0,
  );
  const hasPublishedLaunchConflict = Boolean(
    finalLaunchDate &&
      publishedLaunchEvidence.some((text) =>
        extractAllDates(text).some(
          (date) => date.toLocaleLowerCase() !== finalLaunchDate.toLocaleLowerCase(),
        ),
      ),
  );
  if (hasPublishedLaunchConflict && finalLaunchDate) {
    flags.push({
      type: 'conflict',
      message: `Published launch dates conflict with the final meeting date (${finalLaunchDate}); a correction is still required.`,
      evidence: [...new Set([launchDecision?.evidence ?? '', ...publishedLaunchEvidence])].filter(Boolean),
    });
  }

  if (conflictDates.length >= 2) {
    const evidenceByTopic = groupEvidenceByTopic(conflictEvidence);

    for (const [topic, evidence] of evidenceByTopic.entries()) {
      const topicDates = [
        ...new Set(extractAllDates(evidence.join(' ')).map((date) => date.toLocaleLowerCase())),
      ];
      if (topicDates.length < 2) continue;
      const sharedSubject = subjectPatterns.find(({ pattern }) => evidence.some((text) => pattern.test(text)));
      if (!sharedSubject) continue;
      if (hasPublishedLaunchConflict && sharedSubject.label === 'launch') continue;
      const resolved = decisions.some(({ evidence: decisionEvidence }) => classifyTopic(decisionEvidence) === topic);
      if (resolved && !evidence.some((text) => explicitlyUnresolved.test(text))) continue;
      flags.push({
        type: 'conflict',
        message: `Multiple ${sharedSubject.label} dates were mentioned with no final decision.`,
        evidence,
      });
    }
  }

  const freezeEvidence = allEvidence.filter((text) => /\bfreeze\b/iu.test(text) && extractAllDates(text).length > 0);
  const dashboardEvidence = allEvidence.filter((text) => /\bdashboard\b/iu.test(text) && extractAllDates(text).length > 0);
  const freezeConflictEvidence = [...new Set([...freezeEvidence, ...dashboardEvidence])];
  const freezeConflictDates = [...new Set(extractAllDates(freezeConflictEvidence.join(' ')))];
  if (
    freezeConflictDates.length >= 2 &&
    freezeConflictEvidence.some((text) => /ขัดกับ|พร้อมกันไม่ได้|ไม่มี freeze|ตกลงว่ายังไง|\bconflict\b|\bcannot\b/iu.test(text))
  ) {
    flags.push({
      type: 'conflict',
      message: 'Feature-freeze timing conflicts with work scheduled after the freeze.',
      evidence: freezeConflictEvidence,
    });
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
