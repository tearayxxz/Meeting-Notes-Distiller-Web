import type { NormalizedTranscript } from '@meeting-distiller/shared';

const participantMetadata = /^(?:Facilitator|Attendees?|Participants?|ผู้เข้าร่วม)\s*:\s*(.+)$/iu;
const englishNarrativeSpeaker = /^([A-Z][\p{L}'’-]+)\s+(?:thinks|says|said|pushed back|suggested|argued|reported|noted)\b/u;
const thaiNarrativeSpeaker = /^พี่([\p{L}\p{M}]+?)(?:ว่า|แย้ง|บอก|เสนอ|คิด)/u;

const cleanParticipant = (value: string): string =>
  value.trim().replace(/^คุณ/u, '').replace(/\s*\([^)]*\)\s*$/u, '').trim();

export const extractParticipants = (transcript: NormalizedTranscript): string[] => {
  const seen = new Set<string>();
  const participants: string[] = [];

  const add = (candidate: string): void => {
    const participant = cleanParticipant(candidate);
    if (!participant) return;
    const key = participant.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    participants.push(participant);
  };

  for (const { kind, speaker, text } of transcript.utterances) {
    if (kind === 'metadata') {
      const metadata = participantMetadata.exec(text);
      const label = text.slice(0, text.indexOf(':')).trim();
      const value = metadata?.[1]?.trim();
      if (value && (/^Facilitator$/iu.test(label) || value.includes(','))) {
        value.split(',').forEach(add);
      }
      continue;
    }

    if (speaker) {
      add(speaker);
      continue;
    }

    const narrative = englishNarrativeSpeaker.exec(text)?.[1] ?? thaiNarrativeSpeaker.exec(text)?.[1];
    if (narrative) add(narrative);
  }

  return participants;
};
