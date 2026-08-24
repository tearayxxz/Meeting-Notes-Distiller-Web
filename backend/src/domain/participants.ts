import type { NormalizedTranscript } from '@meeting-distiller/shared';

export const extractParticipants = (transcript: NormalizedTranscript): string[] => {
  const seen = new Set<string>();
  const participants: string[] = [];

  for (const { speaker } of transcript.utterances) {
    if (!speaker) continue;
    const key = speaker.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    participants.push(speaker);
  }

  return participants;
};
