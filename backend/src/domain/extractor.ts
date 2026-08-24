import { createHash } from 'node:crypto';
import type { MeetingAnalysis, NormalizedTranscript } from '@meeting-distiller/shared';
import { extractActionItems } from './actions.js';
import { extractDecisions } from './decisions.js';
import { detectProblemFlags } from './flags.js';
import { extractParticipants } from './participants.js';
import { countWords } from './text-utils.js';
import { extractTopics } from './topics.js';

const makeMeetingId = (fileName: string, transcript: NormalizedTranscript): string =>
  `meeting-${createHash('sha256')
    .update(fileName)
    .update('\0')
    .update(transcript.utterances.map(({ text }) => text).join('\n'))
    .digest('hex')
    .slice(0, 12)}`;

export const extractMeeting = (
  fileName: string,
  transcript: NormalizedTranscript,
  meetingId = makeMeetingId(fileName, transcript),
): MeetingAnalysis => {
  const decisions = extractDecisions(transcript);
  const actionItems = extractActionItems(transcript);
  const flags = detectProblemFlags(transcript, decisions, actionItems);

  if (transcript.utterances.length === 0) {
    flags.unshift({
      type: 'empty-transcript',
      message: 'The transcript was empty and no meeting information could be extracted.',
      evidence: [],
    });
  }

  const combinedText = transcript.utterances.map(({ text }) => text).join(' ');
  return {
    meetingId,
    fileName,
    format: transcript.format,
    participants: extractParticipants(transcript),
    topics: extractTopics(transcript, decisions),
    actionItems,
    flags,
    stats: {
      utteranceCount: transcript.utterances.length,
      wordCount: countWords(combinedText),
    },
  };
};
