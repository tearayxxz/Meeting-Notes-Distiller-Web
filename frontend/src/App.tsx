import { useMemo, useState } from 'react';
import type { AnalysisBatch } from '@meeting-distiller/shared';
import {
  AlertTriangle, CheckCircle2, Download, FileCheck2, ListChecks,
  LoaderCircle, Play, Sparkles, UsersRound,
} from 'lucide-react';
import { FileQueue, fileKey } from '@/components/FileQueue';
import { CelestialTransition } from '@/components/CelestialTransition';
import { GlobalActions } from '@/components/GlobalActions';
import { MeetingNavigator } from '@/components/MeetingNavigator';
import { ProblemPanel } from '@/components/ProblemPanel';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { TiltSurface } from '@/components/TiltSurface';
import { UploadZone } from '@/components/UploadZone';
import { WebSlingerEffect, WebThemeBackground } from '@/components/WebSlingerEffects';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { analyzeMeetings, createWordReport } from '@/lib/api';
import type { CelestialDirection } from '@/components/CelestialTransition';
import type { Theme } from '@/lib/theme';
import { useTheme } from '@/lib/theme';

const MAX_FILE_SIZE = 1024 * 1024;

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [selectedMeetingIndex, setSelectedMeetingIndex] = useState(0);
  const [webEffectRun, setWebEffectRun] = useState(0);
  const [celestial, setCelestial] = useState<{
    runId: number;
    direction: CelestialDirection | null;
  }>({ runId: 0, direction: null });
  const { theme, setTheme } = useTheme();

  const problemCount = useMemo(
    () => (analysis?.failures.length ?? 0) +
      (analysis?.meetings.reduce((total, meeting) => total + meeting.flags.length, 0) ?? 0),
    [analysis],
  );

  const addFiles = (incoming: File[]): void => {
    const valid: File[] = [];
    const messages: string[] = [];
    for (const file of incoming) {
      if (!file.name.toLocaleLowerCase().endsWith('.txt')) messages.push(`${file.name} is not a .txt file.`);
      else if (file.size > MAX_FILE_SIZE) messages.push(`${file.name} exceeds the 1 MB limit.`);
      else valid.push(file);
    }
    setFiles((current) => {
      const next = new Map(current.map((file) => [fileKey(file), file]));
      valid.forEach((file) => next.set(fileKey(file), file));
      return [...next.values()];
    });
    setError(messages.length > 0 ? messages.join(' ') : null);
  };

  const analyze = async (): Promise<void> => {
    if (files.length === 0) return;
    if (theme === 'web-slinger') setWebEffectRun((run) => run + 1);
    setProcessing(true);
    setError(null);
    try {
      setAnalysis(await analyzeMeetings(files));
      setSelectedMeetingIndex(0);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Meeting analysis failed.'); }
    finally { setProcessing(false); }
  };

  const changeTheme = (nextTheme: Theme): void => {
    const direction = theme === 'light' && nextTheme === 'dark'
      ? 'to-dark'
      : theme === 'dark' && nextTheme === 'light'
        ? 'to-light'
        : null;

    setTheme(nextTheme);
    setCelestial((current) => ({ runId: current.runId + 1, direction }));
    if (nextTheme === 'web-slinger') setWebEffectRun((run) => run + 1);
  };

  const downloadReport = async (): Promise<void> => {
    if (!analysis) return;
    setReporting(true);
    setError(null);
    try {
      const report = await createWordReport(analysis);
      const url = URL.createObjectURL(report);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Meeting_Notes_Distiller_Report.docx';
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Word report generation failed.');
    } finally { setReporting(false); }
  };

  return (
    <TooltipProvider>
      <div className={`app-shell min-h-screen bg-muted/35 text-foreground theme-${theme}`}>
        {theme === 'web-slinger' ? <WebThemeBackground /> : null}
        {theme === 'web-slinger' ? <WebSlingerEffect runId={webEffectRun} /> : null}
        <CelestialTransition runId={celestial.runId} direction={celestial.direction} />
        <header className="app-header relative z-10 border-b bg-background">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <div className="app-logo flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-[2.1rem]">Meeting Notes Distiller</h1>
                <p className="app-subtitle text-sm text-muted-foreground">Turn raw transcripts into decisions and action.</p>
              </div>
            </div>
            <ThemeSwitcher theme={theme} onChange={changeTheme} />
          </div>
        </header>

        <main className="relative z-1 mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8">
          <section aria-label="Transcript upload" className="upload-workspace grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <UploadZone disabled={processing} onFiles={addFiles} />
            <div className="flex flex-col gap-3">
              <FileQueue disabled={processing} files={files}
                onRemove={(key) => setFiles((current) => current.filter((file) => fileKey(file) !== key))} />
              <Button className="analyze-button w-full" size="lg" disabled={processing || files.length === 0} onClick={() => void analyze()}>
                {processing ? <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden="true" />
                  : <Play data-icon="inline-start" aria-hidden="true" />}
                Analyze Meetings
              </Button>
            </div>
          </section>

          {processing ? (
            <div className="web-loading flex flex-col gap-2" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Analyzing {files.length} transcript{files.length === 1 ? '' : 's'}…</span>
                <span className="text-muted-foreground">Extracting structured results</span>
              </div>
              <Progress value={68} aria-label="Meeting analysis progress" />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive"><AlertTriangle aria-hidden="true" />
              <AlertTitle>Needs attention</AlertTitle><AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {analysis ? (
            <>
              <Alert variant={analysis.failures.length > 0 ? 'warning' : 'success'}>
                {analysis.failures.length > 0 ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                <AlertTitle>{analysis.failures.length > 0 ? 'Analysis partially complete' : 'Analysis complete'}</AlertTitle>
                <AlertDescription>{analysis.meetings.length} of {analysis.meetings.length + analysis.failures.length} files processed successfully.</AlertDescription>
              </Alert>

              <Tabs defaultValue="meetings" className="analysis-workspace web-theme-panel rounded-xl border bg-background p-4 sm:p-5">
                <TabsList aria-label="Analysis result views" className="grid w-full grid-cols-1 gap-1.5 p-1.5 group-data-horizontal/tabs:h-auto sm:grid-cols-3">
                  <TabsTrigger value="meetings" className="min-h-10 min-w-0 px-3 py-2 text-xs sm:text-sm">
                    <FileCheck2 data-icon="inline-start" aria-hidden="true" />
                    <span className="sm:hidden">Meetings</span><span className="hidden sm:inline">Meeting Results</span>
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="min-h-10 min-w-0 px-3 py-2 text-xs sm:text-sm">
                    <UsersRound data-icon="inline-start" aria-hidden="true" />
                    <span className="sm:hidden">Owners</span><span className="hidden sm:inline">Action Items by Owner</span>
                  </TabsTrigger>
                  <TabsTrigger value="problems" className="min-h-10 min-w-0 px-3 py-2 text-xs sm:text-sm">
                    <AlertTriangle data-icon="inline-start" aria-hidden="true" /> Problems ({problemCount})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="meetings" className="mt-5">
                  <MeetingNavigator
                    meetings={analysis.meetings}
                    selectedIndex={selectedMeetingIndex}
                    onSelect={setSelectedMeetingIndex}
                  />
                </TabsContent>
                <TabsContent value="actions" className="mt-5"><GlobalActions groups={analysis.groupedActionItems} /></TabsContent>
                <TabsContent value="problems" className="mt-5"><ProblemPanel failures={analysis.failures} meetings={analysis.meetings} /></TabsContent>
              </Tabs>

              <TiltSurface data-testid="report-tilt-surface" depth="strong" glare={false}>
                <div className="report-panel web-theme-panel flex justify-center rounded-xl border bg-background p-4">
                  <Button className="report-button" variant="outline" size="lg" disabled={reporting} onClick={() => void downloadReport()}>
                    {reporting ? <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden="true" />
                      : <Download data-icon="inline-start" aria-hidden="true" />}
                    Download Word Report
                  </Button>
                </div>
              </TiltSurface>
            </>
          ) : (
            <section className="empty-results web-theme-panel rounded-xl border border-dashed bg-background p-7 text-center">
              <ListChecks className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold">Results will appear here</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select transcript files, then choose Analyze Meetings.</p>
            </section>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
