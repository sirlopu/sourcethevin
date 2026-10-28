import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionListItem } from '../lib/desk-api';
import type { SubmissionStatus } from '../lib/submission-status';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  listSubmissions: vi.fn(),
  deleteSubmission: vi.fn(),
  startSubmission: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ authFetch: mocks.authFetch }),
}));

vi.mock('../components/RoleShell', () => ({
  RoleShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('../lib/desk-api', () => ({
  listSubmissions: mocks.listSubmissions,
}));

vi.mock('../lib/useStartSubmission', () => ({
  useStartSubmission: () => mocks.startSubmission,
}));

vi.mock('../lib/wizard-api', () => ({
  deleteSubmission: mocks.deleteSubmission,
}));

function submission(status: SubmissionStatus, make: string): SubmissionListItem {
  return {
    _id: status,
    referenceId: `STV-${status}`,
    status,
    currentStep: 2,
    vehicle: { year: 2021, make, model: 'Model' },
    condition: { cosmeticIssues: [] },
    payoff: {},
    photos: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const submissions = [
  submission('new', 'bmw'),
  submission('submitted', 'Honda'),
  submission('offer_sent', 'fiat'),
  submission('in_negotiation', 'gmc'),
  submission('accepted', 'mini'),
  submission('declined', 'ram'),
];

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listSubmissions.mockResolvedValue({ items: submissions, total: submissions.length });
  mocks.deleteSubmission.mockResolvedValue(undefined);
});

describe('Dashboard', () => {
  it('shows recent submissions, normalized makes, and status labels', async () => {
    renderDashboard();

    expect(await screen.findByText('2021 BMW Model')).toBeInTheDocument();
    expect(screen.getByText('2021 FIAT Model')).toBeInTheDocument();
    expect(screen.getByText('2021 GMC Model')).toBeInTheDocument();
    expect(screen.getByText('2021 MINI Model')).toBeInTheDocument();
    expect(screen.getByText('2021 RAM Model')).toBeInTheDocument();
    expect(screen.getByText('Offer Received')).toBeInTheDocument();
    expect(screen.getByText('In Negotiation')).toBeInTheDocument();
    expect(mocks.listSubmissions).toHaveBeenCalledWith(mocks.authFetch, { limit: 10 });
  });

  it('filters the loaded list by status and shows an empty-filter message', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const filter = await screen.findByRole('combobox', { name: 'Filter by status' });
    await user.selectOptions(filter, 'in_negotiation');

    expect(screen.getByText('2021 GMC Model')).toBeInTheDocument();
    expect(screen.queryByText('2021 BMW Model')).not.toBeInTheDocument();
    expect(mocks.listSubmissions).toHaveBeenCalledTimes(1);

    await user.selectOptions(filter, 'accepted');
    expect(screen.getByText('2021 MINI Model')).toBeInTheDocument();
    expect(screen.queryByText('2021 GMC Model')).not.toBeInTheDocument();

    await user.selectOptions(filter, 'all');
    expect(screen.getByText('2021 GMC Model')).toBeInTheDocument();
  });

  it('shows a no-match state when no recent submission has the selected status', async () => {
    const user = userEvent.setup();
    mocks.listSubmissions.mockResolvedValue({
      items: submissions.filter((item) => item.status !== 'new'),
      total: submissions.length - 1,
    });
    renderDashboard();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Filter by status' }),
      'new',
    );

    expect(await screen.findByText('No recent submissions match this status.')).toBeInTheDocument();
  });

  it('keeps the trade-in button aligned to the list width and deletes drafts only', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDashboard();

    const deleteButton = await screen.findByRole('button', { name: 'Delete draft 2021 BMW Model' });
    expect(deleteButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete draft 2021 Honda Model' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enter VIN →' }).parentElement).toHaveClass(
      'max-w-lg',
    );

    await user.click(deleteButton);
    await waitFor(() =>
      expect(mocks.deleteSubmission).toHaveBeenCalledWith(mocks.authFetch, 'new'),
    );
    expect(confirm).toHaveBeenCalledWith(
      'Delete the draft for 2021 BMW Model? This cannot be undone.',
    );
    expect(screen.queryByText('2021 BMW Model')).not.toBeInTheDocument();
  });

  it('keeps the empty dashboard free of list filters', async () => {
    mocks.listSubmissions.mockResolvedValue({ items: [], total: 0 });
    renderDashboard();

    expect(await screen.findByRole('button', { name: 'Enter VIN →' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filter by status' })).not.toBeInTheDocument();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
