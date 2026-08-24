import { extname } from 'node:path';
import type {
  AnalysisBatch,
  FileFailure,
  GroupedActionItem,
  MeetingAnalysis,
} from '@meeting-distiller/shared';
import { extractMeeting } from '../domain/extractor.js';
import { normalizeTranscript } from '../domain/normalizer.js';

type UploadedFile = Pick<Express.Multer.File, 'buffer' | 'originalname' | 'size'>;
const MAX_TRANSCRIPT_BYTES = 1024 * 1024;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export const groupActionItems = (
  meetings: MeetingAnalysis[],
): Record<string, GroupedActionItem[]> => {
  const grouped = new Map<string, GroupedActionItem[]>();
  for (const meeting of meetings) {
    for (const action of meeting.actionItems) {
      const owner = action.owner ?? 'Unassigned';
      const items = grouped.get(owner) ?? [];
      items.push({ ...action, meetingId: meeting.meetingId, fileName: meeting.fileName });
      grouped.set(owner, items);
    }
  }
  return Object.fromEntries(
    [...grouped.entries()].sort(([left], [right]) => {
      if (left === 'Unassigned') return 1;
      if (right === 'Unassigned') return -1;
      return left.localeCompare(right);
    }),
  );
};

const failure = (
  fileName: string,
  code: FileFailure['code'],
  message: string,
): FileFailure => ({ fileName, code, message });

export const analyzeUploadedFiles = (files: UploadedFile[]): AnalysisBatch => {
  const meetings: MeetingAnalysis[] = [];
  const failures: FileFailure[] = [];

  for (const file of files) {
    const fileName = file.originalname || 'unnamed-file';
    if (extname(fileName).toLocaleLowerCase() !== '.txt') {
      failures.push(failure(fileName, 'unsupported-type', 'Only .txt transcript files are supported.'));
      continue;
    }
    if (file.size > MAX_TRANSCRIPT_BYTES) {
      failures.push(failure(fileName, 'file-too-large', 'The transcript exceeds the 1 MB file limit.'));
      continue;
    }

    let text: string;
    try {
      text = utf8Decoder.decode(file.buffer);
    } catch {
      failures.push(failure(fileName, 'invalid-upload', 'The transcript is not valid UTF-8 text.'));
      continue;
    }
    if (file.size === 0 || text.trim().length === 0) {
      failures.push(failure(fileName, 'empty-file', 'The transcript is empty. Add meeting text and retry.'));
      continue;
    }

    try {
      meetings.push(extractMeeting(fileName, normalizeTranscript(text)));
    } catch {
      failures.push(
        failure(fileName, 'processing-failed', 'This transcript could not be processed safely.'),
      );
    }
  }

  return {
    meetings,
    failures,
    groupedActionItems: groupActionItems(meetings),
    processedAt: new Date().toISOString(),
  };
};
