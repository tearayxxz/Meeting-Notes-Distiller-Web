import type { MeetingAnalysis } from '@meeting-distiller/shared';
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, ListChecks, UsersRound } from 'lucide-react';
import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { MeetingCard } from '@/components/MeetingCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MeetingNavigatorProps {
  meetings: MeetingAnalysis[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function MeetingNavigator({ meetings, selectedIndex, onSelect }: MeetingNavigatorProps) {
  const reduceMotion = useReducedMotion();
  const selectedMeeting = meetings[selectedIndex];
  const progress = meetings.length > 0 ? (selectedIndex + 1) / meetings.length : 0;

  if (!selectedMeeting) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No meeting results are available.
      </div>
    );
  }

  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30 };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col gap-5">
        <section aria-label="Meeting navigator" className="meeting-navigator-panel flex flex-col gap-4 rounded-xl border bg-muted/25 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-heading text-lg font-semibold">Meeting {selectedIndex + 1} of {meetings.length}</p>
              <p className="truncate text-sm text-muted-foreground">{selectedMeeting.fileName}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={selectedIndex === 0}
                aria-label="Previous meeting"
                onClick={() => onSelect(selectedIndex - 1)}
              >
                <ChevronLeft data-icon="inline-start" aria-hidden="true" /> Previous
              </Button>
              <Button
                variant="outline"
                disabled={selectedIndex === meetings.length - 1}
                aria-label="Next meeting"
                onClick={() => onSelect(selectedIndex + 1)}
              >
                Next <ChevronRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div
            role="progressbar"
            aria-label="Meeting navigation progress"
            aria-valuemin={1}
            aria-valuemax={meetings.length}
            aria-valuenow={selectedIndex + 1}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <m.div
              className="h-full origin-left rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: progress }}
              transition={spring}
            />
          </div>

          <nav aria-label="Select a meeting" className="flex gap-3 overflow-x-auto pb-1">
          {meetings.map((meeting, index) => {
            const selected = index === selectedIndex;
            return (
              <m.button
                key={meeting.meetingId}
                type="button"
                aria-label={`Open meeting ${index + 1}: ${meeting.fileName}`}
                aria-current={selected ? 'step' : undefined}
                className={cn(
                  'meeting-selector relative min-w-56 flex-1 overflow-hidden rounded-xl border bg-background p-4 text-left shadow-xs outline-none transition-colors',
                  'focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected ? 'border-primary/50' : 'hover:border-primary/30 hover:bg-primary/[0.025]',
                )}
                {...(reduceMotion ? {} : { whileHover: { y: -2 }, whileTap: { scale: 0.99 } })}
                transition={spring}
                onClick={(event) => {
                  onSelect(index);
                  event.currentTarget.scrollIntoView?.({
                    behavior: reduceMotion ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'center',
                  });
                }}
              >
                {selected ? (
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ring-primary" />
                ) : null}
                <span className="relative flex flex-col gap-3">
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 font-heading font-semibold">
                      <FileText className="shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{meeting.fileName}</span>
                    </span>
                    <Badge variant={selected ? 'default' : 'secondary'}>{index + 1}</Badge>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><UsersRound aria-hidden="true" /> {meeting.participants.length} participants</span>
                    <span className="flex items-center gap-1"><ListChecks aria-hidden="true" /> {meeting.actionItems.length} actions</span>
                    {meeting.flags.length > 0 ? (
                      <span className="flex items-center gap-1 text-warning-foreground">
                        <AlertTriangle aria-hidden="true" /> {meeting.flags.length} warnings
                      </span>
                    ) : null}
                  </span>
                </span>
              </m.button>
            );
          })}
          </nav>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={selectedMeeting.meetingId}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
          >
            <MeetingCard meeting={selectedMeeting} index={selectedIndex} />
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
