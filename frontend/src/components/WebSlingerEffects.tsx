interface WebSlingerEffectProps {
  runId: number;
}

export function WebThemeBackground() {
  return (
    <div className="web-theme-background" aria-hidden="true">
      <svg className="web-corner web-corner-top" viewBox="0 0 220 180">
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 8 210 168M8 8l42 166M8 8l118 166M8 8l198 76" />
          <path d="M24 21c32 20 51 49 57 88M49 41c42 12 75 42 91 86M84 68c43 3 79 21 109 54" />
        </g>
      </svg>
      <svg className="web-corner web-corner-bottom" viewBox="0 0 220 180">
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 8 210 168M8 8l42 166M8 8l118 166M8 8l198 76" />
          <path d="M24 21c32 20 51 49 57 88M49 41c42 12 75 42 91 86M84 68c43 3 79 21 109 54" />
        </g>
      </svg>
    </div>
  );
}

export function WebSlingerEffect({ runId }: WebSlingerEffectProps) {
  if (runId === 0) return null;

  return (
    <div
      key={runId}
      data-testid="web-slinger-effect"
      data-run={runId}
      className="web-slinger-effect"
      aria-hidden="true"
    >
      <svg className="web-shot" viewBox="0 0 1000 180" preserveAspectRatio="none">
        <path d="M40 154 Q 330 4 620 92 T 980 22" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      <span className="web-sound">THWIP!</span>
      <svg className="web-acrobat" viewBox="0 0 96 112">
        <circle cx="49" cy="20" r="12" fill="currentColor" />
        <path d="M42 32 30 62l17 13 18-17-7-27Z" fill="currentColor" />
        <path d="m36 38-22 20m48-18 20-19M45 72 22 96m31-22 24 22" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        <path d="M16 57 4 37M81 22 92 6" fill="none" stroke="var(--web-line)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
