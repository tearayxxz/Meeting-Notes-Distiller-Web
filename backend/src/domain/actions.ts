import type { ActionItem, NormalizedTranscript, NormalizedUtterance } from '@meeting-distiller/shared';
import { extractDate, removeDeadline } from './text-utils.js';

const person = String.raw`[\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,2}`;
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
const thaiCommitment = new RegExp(String.raw`^(${person})จะ(.+)$`, 'u');

const toAction = (owner: string | null, taskWithDue: string, evidence: string): ActionItem | null => {
  const dueDate = extractDate(taskWithDue);
  const task = removeDeadline(taskWithDue, dueDate).replace(/\s*(?:ภายใน)\s*$/u, '').trim();
  return task ? { owner, task, dueDate, evidence } : null;
};

const extractFromUtterance = (utterance: NormalizedUtterance): ActionItem | null => {
  const { speaker, text } = utterance;
  const direct = directAssignment.exec(text);
  if (direct?.[1] && direct[2]) return toAction(direct[1].trim(), direct[2], text);

  const self = speakerCommitment.exec(text);
  if (self?.[1]) return toAction(speaker, self[1], text);

  const named = namedCommitment.exec(text);
  if (named?.[1] && named[2] && !/^(?:we|the team|someone)$/iu.test(named[1])) {
    return toAction(named[1].trim(), named[2], text);
  }

  const unassigned = unassignedRequirement.exec(text);
  if (unassigned?.[1]) return toAction(null, unassigned[1], text);

  const labelled = actionLabel.exec(text);
  if (labelled?.[1]) return toAction(null, labelled[1], text);

  const thai = thaiCommitment.exec(text);
  if (thai?.[1] && thai[2]) return toAction(thai[1].trim(), thai[2], text);

  return null;
};

export const extractActionItems = (transcript: NormalizedTranscript): ActionItem[] => {
  const items: ActionItem[] = [];
  const seen = new Set<string>();

  for (const utterance of transcript.utterances) {
    const item = extractFromUtterance(utterance);
    if (!item) continue;
    const key = `${item.owner ?? ''}|${item.task}|${item.dueDate ?? ''}`.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items;
};
