import type { FileFailure, MeetingAnalysis } from '@meeting-distiller/shared';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { ProblemStatusBadge } from '@/components/ProblemStatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

interface ProblemPanelProps { failures: FileFailure[]; meetings: MeetingAnalysis[] }

export function ProblemPanel({ failures, meetings }: ProblemPanelProps) {
  const flags = meetings.flatMap((meeting) => meeting.flags.map((flag) => ({ ...flag, fileName: meeting.fileName })));
  if (failures.length === 0 && flags.length === 0) {
    return (
      <div data-depth="calm" data-testid="problems-static-surface">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldCheck aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No problems detected</EmptyTitle>
            <EmptyDescription>All processed meetings have clear assignments and no detected conflicts.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-depth="calm" data-testid="problems-static-surface">
      {failures.map((failure) => (
        <Alert key={`${failure.fileName}-${failure.code}`} className="problem-alert" data-problem-type="failure" variant="destructive">
          <AlertTriangle aria-hidden="true" /><AlertTitle>{failure.fileName}</AlertTitle>
          <AlertDescription>{failure.message}</AlertDescription>
          <ProblemStatusBadge type="failure" />
        </Alert>
      ))}
      {flags.map((flag, index) => (
        <Alert
          key={`${flag.fileName}-${flag.type}-${index}`}
          className="problem-alert"
          data-problem-type={flag.type}
          variant={flag.type === 'conflict' ? 'destructive' : 'warning'}
        >
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>{flag.fileName} · {flag.type.replace(/-/gu, ' ')}</AlertTitle>
          <AlertDescription>{flag.message}</AlertDescription>
          <ProblemStatusBadge type={flag.type} />
        </Alert>
      ))}
    </div>
  );
}
