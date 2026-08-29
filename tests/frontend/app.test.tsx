// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../frontend/src/App.js';

const batch = {
  meetings: [
    {
      meetingId: 'meeting-1',
      fileName: 'launch.txt',
      format: 'speaker-colon',
      participants: ['Alice', 'Bob'],
      topics: [
        {
          name: 'Release planning',
          summary: 'Release planning covered the Friday launch and production preparation.',
          decisions: [{ text: 'Launch Friday', evidence: 'We decided to launch Friday.' }],
        },
      ],
      actionItems: [
        {
          owner: 'Bob',
          task: 'prepare the production server',
          dueDate: 'Thursday',
          evidence: 'Bob, please prepare the production server by Thursday.',
        },
      ],
      flags: [
        {
          type: 'conflict',
          message: 'Multiple go-live dates were mentioned with no final decision.',
          evidence: ['October 2', 'October 5'],
        },
      ],
      stats: { utteranceCount: 3, wordCount: 24 },
    },
  ],
  failures: [],
  groupedActionItems: {
    Bob: [
      {
        meetingId: 'meeting-1',
        fileName: 'launch.txt',
        owner: 'Bob',
        task: 'prepare the production server',
        dueDate: 'Thursday',
        evidence: 'Bob, please prepare the production server by Thursday.',
      },
    ],
  },
  processedAt: '2026-08-24T10:00:00.000Z',
};

const multiMeetingBatch = {
  ...batch,
  meetings: [
    batch.meetings[0],
    {
      meetingId: 'meeting-2',
      fileName: 'tasks.txt',
      format: 'unstructured',
      participants: [],
      topics: [
        {
          name: 'Infrastructure preparation',
          summary: 'Infrastructure preparation covered the required server update.',
          decisions: [],
        },
      ],
      actionItems: [
        {
          owner: null,
          task: 'update the server',
          dueDate: 'Friday',
          evidence: 'We need to update the server before Friday.',
        },
      ],
      flags: [
        {
          type: 'unassigned-action',
          message: 'Action item has no assigned owner: update the server.',
          evidence: ['We need to update the server before Friday.'],
        },
      ],
      stats: { utteranceCount: 1, wordCount: 8 },
    },
  ],
};

const storedValues = new Map<string, string>();
const localStorageDouble: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => { storedValues.delete(key); },
  setItem: (key, value) => { storedValues.set(key, value); },
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageDouble });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('data-theme');
  vi.unstubAllGlobals();
});

describe('Meeting Notes Distiller dashboard', () => {
  it('starts with an accessible empty upload state and disabled analysis action', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Meeting Notes Distiller' })).toBeInTheDocument();
    expect(screen.getByText('Drop meeting transcripts here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze Meetings' })).toBeDisabled();
    expect(screen.getByText('No transcripts selected')).toBeInTheDocument();
  });

  it('switches named themes, persists the choice, and launches the Web-Slinger effect', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('meeting-distiller-theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Web-Slinger theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'web-slinger');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem('meeting-distiller-theme')).toBe('web-slinger');
    expect(screen.getByTestId('web-slinger-effect')).toBeInTheDocument();
  });

  it('restores a valid saved theme and ignores an invalid saved value', () => {
    window.localStorage.setItem('meeting-distiller-theme', 'web-slinger');
    const { unmount } = render(<App />);

    expect(screen.getByRole('button', { name: 'Web-Slinger theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'web-slinger');

    unmount();
    window.localStorage.setItem('meeting-distiller-theme', 'unknown-theme');
    render(<App />);

    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('starts analysis immediately while replaying the Web-Slinger effect', async () => {
    const user = userEvent.setup();
    const pendingRequest = new Promise<Response>(() => undefined);
    const fetchStub = vi.fn(() => pendingRequest);
    vi.stubGlobal('fetch', fetchStub);
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Web-Slinger theme' }));
    const firstRun = screen.getByTestId('web-slinger-effect').getAttribute('data-run');
    await user.upload(
      screen.getByLabelText('Choose transcript files'),
      new File(['Alice: We decided to launch Friday.'], 'launch.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: 'Analyze Meetings' }));

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('web-slinger-effect')).not.toHaveAttribute('data-run', firstRun);
  });

  it('rejects unsupported files before upload and shows useful feedback', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);

    const input = screen.getByLabelText('Choose transcript files');
    await user.upload(input, new File(['pdf'], 'notes.pdf', { type: 'application/pdf' }));

    expect(screen.getByRole('alert')).toHaveTextContent('notes.pdf is not a .txt file');
    expect(screen.getByText('No transcripts selected')).toBeInTheDocument();
  });

  it('adds files across selection rounds, avoids duplicates, and analyzes explicitly', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => batch,
      }),
    );
    render(<App />);

    const input = screen.getByLabelText('Choose transcript files');
    const launch = new File(['Alice: We decided to launch Friday.'], 'launch.txt', {
      type: 'text/plain',
    });
    const tasks = new File(['We need to update the server.'], 'tasks.txt', { type: 'text/plain' });
    await user.upload(input, launch);
    await user.upload(input, [launch, tasks]);

    const queue = screen.getByRole('region', { name: 'Uploaded files' });
    expect(within(queue).getAllByText('launch.txt')).toHaveLength(1);
    expect(within(queue).getByText('tasks.txt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Analyze Meetings' }));

    expect(await screen.findByRole('heading', { name: 'launch.txt' })).toBeInTheDocument();
    expect(screen.getByText('Release planning')).toBeInTheDocument();
    expect(screen.getAllByText('prepare the production server').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Multiple go-live dates/).length).toBeGreaterThan(0);
    expect(screen.getByText('Evidence: We decided to launch Friday.')).toBeInTheDocument();
    expect(screen.getByText('Evidence: October 2 · October 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Word Report' })).toBeEnabled();
  });

  it('shows one meeting card at a time and navigates between uploaded files', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => multiMeetingBatch,
      }),
    );
    render(<App />);

    await user.upload(
      screen.getByLabelText('Choose transcript files'),
      new File(['meeting'], 'launch.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: 'Analyze Meetings' }));

    expect(await screen.findByText('Meeting 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Meeting navigation progress' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('heading', { name: 'launch.txt' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'tasks.txt' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous meeting' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Open meeting 2: tasks.txt' }));

    expect(screen.getByText('Meeting 2 of 2')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'tasks.txt' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'launch.txt' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Next meeting' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous meeting' }));
    expect(screen.getByText('Meeting 1 of 2')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'launch.txt' })).toBeInTheDocument();
  });
});
