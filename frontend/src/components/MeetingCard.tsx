import type { MeetingAnalysis } from '@meeting-distiller/shared';
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, MessageSquareText, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TiltSurface } from '@/components/TiltSurface';

interface MeetingCardProps {
  meeting: MeetingAnalysis;
  index: number;
}

export function MeetingCard({ meeting, index }: MeetingCardProps) {
  return (
    <TiltSurface data-testid="meeting-tilt-surface" depth="strong" glare={false}>
      <Card className="meeting-result-card web-theme-panel">
      <CardHeader className="border-b">
        <div className="text-xs font-medium uppercase tracking-wide text-primary">Meeting {index + 1}</div>
        <CardTitle><h2>{meeting.fileName}</h2></CardTitle>
        <CardDescription>
          {meeting.stats.utteranceCount} utterances · {meeting.stats.wordCount} words · {meeting.format}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <section aria-labelledby={`${meeting.meetingId}-participants`} className="flex flex-col gap-3">
          <h3 id={`${meeting.meetingId}-participants`} className="flex items-center gap-2 font-heading font-semibold">
            <Users aria-hidden="true" /> Participants
          </h3>
          <div className="flex flex-wrap gap-2">
            {meeting.participants.length > 0 ? meeting.participants.map((participant) => (
              <Badge key={participant} variant="secondary">{participant}</Badge>
            )) : <span className="text-sm text-muted-foreground">No named speakers identified.</span>}
          </div>
        </section>

        {meeting.flags.length > 0 ? (
          <div className="flex flex-col gap-2">
            {meeting.flags.map((flag, flagIndex) => (
              <Alert
                key={`${flag.type}-${flagIndex}`}
                className="problem-alert"
                data-problem-type={flag.type}
                data-stamp={flag.type === 'conflict' ? 'CONFLICT' : flag.type === 'no-decision' ? 'UNRESOLVED' : flag.type === 'unassigned-action' ? 'UNCLAIMED' : 'NOTICE'}
                variant={flag.type === 'conflict' ? 'destructive' : 'warning'}
              >
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>{flag.type === 'no-decision' ? 'No decision' : flag.type.replace(/-/gu, ' ')}</AlertTitle>
                <AlertDescription>
                  {flag.message}
                  {flag.evidence.length > 0 ? (
                    <span className="mt-1 block text-xs">Evidence: {flag.evidence.join(' · ')}</span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : null}

        <Separator />
        <section aria-labelledby={`${meeting.meetingId}-topics`} className="flex flex-col gap-4">
          <h3 id={`${meeting.meetingId}-topics`} className="flex items-center gap-2 font-heading font-semibold">
            <MessageSquareText aria-hidden="true" /> Topics and decisions
          </h3>
          {meeting.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topics could be extracted.</p>
          ) : meeting.topics.map((topic) => (
            <div key={topic.name} className="topic-panel flex flex-col gap-2 rounded-lg bg-muted/55 p-4">
              <h4 className="font-heading font-semibold">{topic.name}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <span className="font-medium">Decision: </span>
                  {topic.decisions.length > 0 ? (
                    <span className="flex flex-col gap-1">
                      <span>{topic.decisions.map(({ text }) => text).join('; ')}</span>
                      {topic.decisions.map((decision) => (
                        <span key={decision.evidence} className="text-xs text-muted-foreground">
                          Evidence: {decision.evidence}
                        </span>
                      ))}
                    </span>
                  ) : 'No decision'}
                </div>
              </div>
            </div>
          ))}
        </section>

        <Separator />
        <section aria-labelledby={`${meeting.meetingId}-actions`} className="flex flex-col gap-3">
          <h3 id={`${meeting.meetingId}-actions`} className="flex items-center gap-2 font-heading font-semibold">
            <ListChecks aria-hidden="true" /> Action items
          </h3>
          {meeting.actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action items identified.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {meeting.actionItems.map((action, actionIndex) => (
                <div key={`${action.task}-${actionIndex}`} className="action-mission grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{action.task}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">Evidence: {action.evidence}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Badge variant={action.owner ? 'outline' : 'destructive'}>{action.owner ?? 'Unassigned'}</Badge>
                    <Badge variant="secondary">
                      <CalendarClock data-icon="inline-start" aria-hidden="true" />
                      {action.dueDate ?? 'Not specified'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
      </Card>
    </TiltSurface>
  );
}
