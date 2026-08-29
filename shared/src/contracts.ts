import { z } from 'zod';

export const transcriptFormatSchema = z.enum([
  'speaker-colon',
  'timestamp-dash',
  'timestamp-block',
  'unstructured',
]);

export type TranscriptFormat = z.infer<typeof transcriptFormatSchema>;

export const utteranceKindSchema = z.enum(['speech', 'note', 'heading', 'metadata']);
export type UtteranceKind = z.infer<typeof utteranceKindSchema>;

export const normalizedUtteranceSchema = z.object({
  speaker: z.string().min(1).nullable(),
  timestamp: z.string().min(1).nullable(),
  text: z.string().min(1),
  lineNumber: z.number().int().positive(),
  kind: utteranceKindSchema,
});

export type NormalizedUtterance = z.infer<typeof normalizedUtteranceSchema>;

export const normalizedTranscriptSchema = z.object({
  format: transcriptFormatSchema,
  utterances: z.array(normalizedUtteranceSchema),
  warnings: z.array(z.string()),
});

export type NormalizedTranscript = z.infer<typeof normalizedTranscriptSchema>;

export const decisionSchema = z.object({
  text: z.string().min(1),
  evidence: z.string().min(1),
});

export type Decision = z.infer<typeof decisionSchema>;

export const topicResultSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  decisions: z.array(decisionSchema),
});

export type TopicResult = z.infer<typeof topicResultSchema>;

export const actionItemSchema = z.object({
  owner: z.string().min(1).nullable(),
  task: z.string().min(1),
  dueDate: z.string().min(1).nullable(),
  evidence: z.string().min(1),
});

export type ActionItem = z.infer<typeof actionItemSchema>;

export const groupedActionItemSchema = actionItemSchema.extend({
  meetingId: z.string().min(1),
  fileName: z.string().min(1),
});

export type GroupedActionItem = z.infer<typeof groupedActionItemSchema>;

export const problemFlagSchema = z.object({
  type: z.enum([
    'no-decision',
    'conflict',
    'unassigned-action',
    'empty-transcript',
    'parse-warning',
  ]),
  message: z.string().min(1),
  evidence: z.array(z.string().min(1)).default([]),
});

export type ProblemFlag = z.infer<typeof problemFlagSchema>;

export const meetingAnalysisSchema = z.object({
  meetingId: z.string().min(1),
  fileName: z.string().min(1),
  format: transcriptFormatSchema,
  participants: z.array(z.string().min(1)),
  topics: z.array(topicResultSchema),
  actionItems: z.array(actionItemSchema),
  flags: z.array(problemFlagSchema),
  stats: z.object({
    utteranceCount: z.number().int().nonnegative(),
    wordCount: z.number().int().nonnegative(),
  }),
});

export type MeetingAnalysis = z.infer<typeof meetingAnalysisSchema>;

export const fileFailureSchema = z.object({
  fileName: z.string().min(1),
  code: z.enum([
    'unsupported-type',
    'empty-file',
    'file-too-large',
    'invalid-upload',
    'processing-failed',
  ]),
  message: z.string().min(1),
});

export type FileFailure = z.infer<typeof fileFailureSchema>;

export const analysisBatchSchema = z.object({
  meetings: z.array(meetingAnalysisSchema),
  failures: z.array(fileFailureSchema),
  groupedActionItems: z.record(z.string(), z.array(groupedActionItemSchema)),
  processedAt: z.string().datetime(),
});

export type AnalysisBatch = z.infer<typeof analysisBatchSchema>;

export const reportRequestSchema = z.object({
  analysis: analysisBatchSchema,
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
