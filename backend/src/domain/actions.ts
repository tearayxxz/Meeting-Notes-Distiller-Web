import type { ActionItem, NormalizedTranscript, NormalizedUtterance } from '@meeting-distiller/shared';
import { extractDate, removeDeadline } from './text-utils.js';

const person = String.raw`[\p{L}][\p{L}\p{M}'’-]*(?:\s+[\p{L}][\p{L}\p{M}'’-]*){0,2}`;
const directAssignment = new RegExp(
  String.raw`^(${person}),\s*(?:please|can you|could you|would you)\s+(.+)$`,
  'iu',
);
const namedCommitment = new RegExp(
  String.raw`^(${person})\s+(?:will|needs to|must|is responsible for)\s+(.+)$`,
  'iu',
);
const speakerCommitment = /^(?:I\s+will|I'll|I\s+need\s+to|I\s+must)\s+(.+)$/iu;
const unassignedRequirement = /^(?:We|The team|Someone)?\s*(?:need|needs)\s+to\s+(.+)$/iu;
const actionLabel = /^(?:Action item|Task)\s*:\s*(.+)$/iu;
const thaiCommitment = /^([\p{L}\p{M}]{1,40})จะ(.+)$/u;
const imperativeAssignment = new RegExp(
  String.raw`^(${person}),\s*((?:write|prepare|create|draft|send|review|update|configure|verify|confirm|research|document|schedule|complete|finish|investigate)\b.+)$`,
  'iu',
);
const decisionOwnership = new RegExp(
  String.raw`^Decision\s*[-–—:]\s*(.+?)\.\s*(${person})\s+owns\s+it,\s*due\s+(.+?)[.!?]*$`,
  'iu',
);
const researchFollowUp = new RegExp(
  String.raw`^Whether\s+(.+?)\s+[-–—]\s+(${person})\s+to\s+(.+?)(?:,\s*no deadline.*)?[.!?]*$`,
  'iu',
);
const thaiNamedCommitment = /คุณ([\p{L}\p{M}]+)จะ(.+)/u;
const thaiDashboardAssignment = /คุณ([\p{L}\p{M}]+)ทำให้เสร็จภายใน(วันที่\s*\d{1,2})/u;
const englishDataFollowUp = /don['’]?t actually have data on ([^,]+),\s*should pull that first/iu;
const thaiDataFollowUp = /ยังไม่มีข้อมูล\s*(.+?)เลย\s*ควรดึงมาดูก่อน/u;

const toAction = (owner: string | null, taskWithDue: string, evidence: string): ActionItem | null => {
  const dueDate = extractDate(taskWithDue);
  const task = removeDeadline(taskWithDue, dueDate).replace(/\s*(?:ภายใน)\s*$/u, '').trim();
  return task ? { owner, task, dueDate, evidence } : null;
};

const extractFromUtterance = (utterance: NormalizedUtterance): ActionItem[] => {
  const { speaker, text } = utterance;
  if (utterance.kind === 'metadata' || utterance.kind === 'heading') return [];
  const items: ActionItem[] = [];
  const add = (item: ActionItem | null): void => {
    if (item) items.push(item);
  };

  const ownedDecision = decisionOwnership.exec(text);
  if (ownedDecision?.[1] && ownedDecision[2] && ownedDecision[3]) {
    add(toAction(ownedDecision[2].trim(), `${ownedDecision[1]} by ${ownedDecision[3]}`, text));
  }

  const research = researchFollowUp.exec(text);
  if (research?.[1] && research[2] && research[3]) {
    add(toAction(research[2].trim(), `${research[3]} whether ${research[1]}`, text));
  }

  const englishData = englishDataFollowUp.exec(text)?.[1]?.trim();
  if (englishData) add(toAction(null, `pull data on ${englishData}`, text));

  const thaiData = thaiDataFollowUp.exec(text)?.[1]?.trim();
  if (thaiData) add(toAction(null, `ดึงข้อมูล ${thaiData}มาดู`, text));

  const thaiDashboard = thaiDashboardAssignment.exec(text);
  if (thaiDashboard?.[1] && thaiDashboard[2]) {
    add(toAction(thaiDashboard[1], `ทำ dashboard ให้เสร็จภายใน${thaiDashboard[2]}`, text));
  }

  const thaiNamed = thaiNamedCommitment.exec(text);
  if (thaiNamed?.[1] && thaiNamed[2]) add(toAction(thaiNamed[1], thaiNamed[2], text));

  const segments = text.split(/(?<=[.!?])\s+/u);
  for (const segment of segments) {
    const direct = directAssignment.exec(segment);
    if (direct?.[1] && direct[2]) {
      add(toAction(direct[1].trim(), direct[2], text));
      continue;
    }

    const self = speakerCommitment.exec(segment);
    if (self?.[1]) {
      add(toAction(speaker, self[1], text));
      continue;
    }

    const named = namedCommitment.exec(segment);
    if (named?.[1] && named[2] && !/^(?:we|the team|someone)$/iu.test(named[1])) {
      add(toAction(named[1].trim(), named[2], text));
      continue;
    }

    const unassigned = unassignedRequirement.exec(segment);
    if (unassigned?.[1]) {
      add(toAction(null, unassigned[1], text));
      continue;
    }

    const labelled = actionLabel.exec(segment);
    if (labelled?.[1]) {
      add(toAction(null, labelled[1], text));
      continue;
    }

    const imperative = imperativeAssignment.exec(segment);
    if (imperative?.[1] && imperative[2]) {
      add(toAction(imperative[1].trim(), imperative[2], text));
      continue;
    }

    const thai = thaiCommitment.exec(segment);
    if (
      thai?.[1] &&
      thai[2] &&
      !/^(?:แล้ว)?(?:ผม|ฉัน|เรา|หนู)$/u.test(thai[1].trim()) &&
      !/หรือ|ตกลงว่ายังไง/u.test(thai[2])
    ) {
      add(toAction(thai[1].trim(), thai[2], text));
    }
  }

  return items;
};

export const extractActionItems = (transcript: NormalizedTranscript): ActionItem[] => {
  const items: ActionItem[] = [];
  const seen = new Set<string>();

  for (const utterance of transcript.utterances) {
    for (const item of extractFromUtterance(utterance)) {
      const key = `${item.owner ?? ''}|${item.task}|${item.dueDate ?? ''}`.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }

  return items;
};
