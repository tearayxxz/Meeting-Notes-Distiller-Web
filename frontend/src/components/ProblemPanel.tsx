import type { FileFailure, MeetingAnalysis } from '@meeting-distiller/shared';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { TiltSurface } from '@/components/TiltSurface';

interface ProblemPanelProps { failures: FileFailure[]; meetings: MeetingAnalysis[] }

export function ProblemPanel({ failures, meetings }: ProblemPanelProps) {
  const flags = meetings.flatMap((meeting) => meeting.flags.map((flag) => ({ ...flag, fileName: meeting.fileName })));
  if (failures.length === 0 && flags.length === 0) {
    return (
      <TiltSurface data-testid="problems-tilt-surface" depth="strong" glare={false}>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldCheck aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No problems detected</EmptyTitle>
            <EmptyDescription>All processed meetings have clear assignments and no detected conflicts.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TiltSurface>
    );
  }
  return (
    <TiltSurface data-testid="problems-tilt-surface" depth="strong" glare={false}>
      <div className="flex flex-col gap-3">
        {failures.map((failure) => (
          <Alert key={`${failure.fileName}-${failure.code}`} className="problem-alert" data-problem-type="failure" data-stamp="PROCESSING ERROR" variant="destructive">
            <AlertTriangle aria-hidden="true" /><AlertTitle>{failure.fileName}</AlertTitle>
            <AlertDescription>{failure.message}</AlertDescription>
          </Alert>
        ))}
        {flags.map((flag, index) => (
          <Alert
            key={`${flag.fileName}-${flag.type}-${index}`}
            className="problem-alert"
            data-problem-type={flag.type}
            data-stamp={flag.type === 'conflict' ? 'CONFLICT' : flag.type === 'no-decision' ? 'UNRESOLVED' : flag.type === 'unassigned-action' ? 'UNCLAIMED' : 'NOTICE'}
            variant={flag.type === 'conflict' ? 'destructive' : 'warning'}
          >
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>{flag.fileName} · {flag.type.replace(/-/gu, ' ')}</AlertTitle>
            <AlertDescription>{flag.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </TiltSurface>
  );
}
