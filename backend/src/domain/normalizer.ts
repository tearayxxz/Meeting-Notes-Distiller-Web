import type {
  NormalizedTranscript,
  NormalizedUtterance,
  TranscriptFormat,
} from '@meeting-distiller/shared';

const timestamp = String.raw`\d{1,2}:\d{2}(?::\d{2})?`;
const dashPattern = new RegExp(
  String.raw`^\[(${timestamp})\]\s*([^-–—:]{1,60}?)\s*[-–—]\s*(.+)$`,
);
const blockHeaderPattern = new RegExp(String.raw`^(${timestamp})\s+(.{1,60})$`);
const colonPattern = /^([^:[\]\r\n]{1,60}):\s*(.+)$/u;

const cleanLines = (text: string): string[] =>
  text
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.trim());

const appendContinuation = (utterance: NormalizedUtterance, text: string): void => {
  utterance.text = `${utterance.text} ${text}`.replace(/\s+/gu, ' ').trim();
};

const parseSingleLineFormat = (
  lines: string[],
  format: Extract<TranscriptFormat, 'speaker-colon' | 'timestamp-dash'>,
): NormalizedTranscript => {
  const utterances: NormalizedUtterance[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    if (!line) return;

    const match = format === 'timestamp-dash' ? dashPattern.exec(line) : colonPattern.exec(line);
    if (match) {
      const [, first, second, third] = match;
      const speaker = format === 'timestamp-dash' ? second : first;
      const utteranceText = format === 'timestamp-dash' ? third : second;
      if (speaker && utteranceText && !/^\d+$/u.test(speaker.trim())) {
        utterances.push({
          speaker: speaker.trim(),
          timestamp: format === 'timestamp-dash' && first ? first : null,
          text: utteranceText.trim(),
          lineNumber: index + 1,
        });
        return;
      }
    }

    const last = utterances.at(-1);
    if (last) appendContinuation(last, line);
    else warnings.push(`Line ${index + 1} did not include a recognized speaker label.`);
  });

  return { format, utterances, warnings };
};

const parseBlockFormat = (lines: string[]): NormalizedTranscript => {
  const utterances: NormalizedUtterance[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    if (!line) return;
    const header = blockHeaderPattern.exec(line);
    if (header) {
      const [, time, speaker] = header;
      if (time && speaker) {
        utterances.push({
          speaker: speaker.trim(),
          timestamp: time,
          text: '',
          lineNumber: index + 1,
        });
      }
      return;
    }

    const last = utterances.at(-1);
    if (last) appendContinuation(last, line);
    else warnings.push(`Line ${index + 1} appeared before the first timestamp and speaker.`);
  });

  return {
    format: 'timestamp-block',
    utterances: utterances.filter(({ text }) => text.length > 0),
    warnings,
  };
};

export const normalizeTranscript = (text: string): NormalizedTranscript => {
  const lines = cleanLines(text);
  const nonEmpty = lines.filter(Boolean);
  if (nonEmpty.length === 0) return { format: 'unstructured', utterances: [], warnings: [] };

  if (nonEmpty.some((line) => dashPattern.test(line))) {
    return parseSingleLineFormat(lines, 'timestamp-dash');
  }

  if (nonEmpty.some((line) => blockHeaderPattern.test(line))) {
    return parseBlockFormat(lines);
  }

  if (nonEmpty.some((line) => {
    const match = colonPattern.exec(line);
    return Boolean(match?.[1] && !/^\d+$/u.test(match[1].trim()));
  })) {
    return parseSingleLineFormat(lines, 'speaker-colon');
  }

  return {
    format: 'unstructured',
    utterances: [
      {
        speaker: null,
        timestamp: null,
        text: nonEmpty.join(' ').replace(/\s+/gu, ' ').trim(),
        lineNumber: lines.findIndex(Boolean) + 1,
      },
    ],
    warnings: ['No supported speaker format was detected; content was analyzed without participants.'],
  };
};
