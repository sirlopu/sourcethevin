import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import type { OfferRecord } from '../lib/offers-api';
import type { SubmissionRecord } from '../lib/wizard-api';
import SubmissionView from './SubmissionView';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  getSubmission: vi.fn(),
  getLatestOffer: vi.fn(),
  getAuditTrail: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ authFetch: mocks.authFetch }),
}));

vi.mock('../components/MessageThread', () => ({ default: () => null }));

vi.mock('../lib/offers-api', () => ({
  acceptOffer: vi.fn(),
  counterOffer: vi.fn(),
  declineOffer: vi.fn(),
  getAuditTrail: mocks.getAuditTrail,
  getLatestOffer: mocks.getLatestOffer,
}));

vi.mock('../lib/wizard-api', () => ({
  getSubmission: mocks.getSubmission,
}));

const submission: SubmissionRecord = {
  _id: 'submission-1',
  referenceId: 'STV-2026-00001',
  status: 'offer_sent',
  currentStep: 6,
  vehicle: { year: 2017, make: 'Ford', model: 'Mustang', trim: 'GT Coupe' },
  condition: { cosmeticIssues: [] },
  payoff: {},
  photos: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function offer(expiresAt: string): OfferRecord {
  return {
    _id: 'offer-1',
    submissionId: submission._id,
    version: 1,
    amount: 1000,
    expiresAt,
    terms: '',
    notes: '',
    status: 'pending',
    createdByRole: 'trade_desk',
    createdBy: 'desk-user-1',
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/submissions/submission-1']}>
      <Routes>
        <Route path="/submissions/:id" element={<SubmissionView />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSubmission.mockResolvedValue(submission);
  mocks.getAuditTrail.mockResolvedValue([]);
});

describe('SubmissionView offer expiry', () => {
  it('redirects to the dashboard when the submission is not viewable', async () => {
    mocks.getSubmission.mockRejectedValue(new ApiError(404, 'Submission not found'));
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Submission not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an expired state without response controls for an expired offer', async () => {
    mocks.getLatestOffer.mockResolvedValue(offer('2000-01-01T00:00:00.000Z'));
    renderPage();

    const expiredStatus = await screen.findByRole('status');
    expect(expiredStatus).toHaveTextContent('Offer expired');
    expect(expiredStatus).toHaveClass('bg-red-200', 'text-red-950');
    expect(
      screen.getByText('This offer has expired. Message the Trade Desk to ask for a new offer.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Counter' }),
    ).not.toBeInTheDocument();
  });

  it('keeps response controls available before the offer expires', async () => {
    mocks.getLatestOffer.mockResolvedValue(offer(new Date(Date.now() + 60_000).toISOString()));
    renderPage();

    expect(await screen.findByText(/Awaiting your response/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept offer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Counter' })).toBeInTheDocument();
    const actions = screen.getAllByRole('button');
    expect(actions.slice(0, 3).map((button) => button.textContent)).toEqual([
      'Accept offer',
      'Counter',
      'Decline',
    ]);
  });

  it('opens the counter form from the Counter button', async () => {
    mocks.getLatestOffer.mockResolvedValue(offer(new Date(Date.now() + 60_000).toISOString()));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Counter' }));

    expect(screen.getByLabelText('Your counter amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Note (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel counter' })).toBeInTheDocument();
  });

  it('removes response controls when an offer expires while the page is open', async () => {
    mocks.getLatestOffer.mockResolvedValue(offer(new Date(Date.now() + 250).toISOString()));
    renderPage();

    expect(await screen.findByText(/Awaiting your response/)).toBeInTheDocument();
    expect(await screen.findByText(/Offer expired/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Counter' }),
    ).not.toBeInTheDocument();
  });

  it('allows a new counter after the desk declines a seller counter, even after expiry', async () => {
    mocks.getSubmission.mockResolvedValue({ ...submission, status: 'submitted' });
    mocks.getLatestOffer.mockResolvedValue({
      ...offer('2000-01-01T00:00:00.000Z'),
      status: 'declined',
      createdByRole: 'seller',
    });
    renderPage();

    expect(await screen.findByText('Trade desk declined your counter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Counter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('This offer has expired. Message the Trade Desk to ask for a new offer.'),
    ).not.toBeInTheDocument();
  });

  it('shows closed state and removes counter controls after the submission is closed', async () => {
    mocks.getSubmission.mockResolvedValue({ ...submission, status: 'closed' });
    mocks.getLatestOffer.mockResolvedValue({
      ...offer(new Date(Date.now() + 60_000).toISOString()),
      status: 'declined',
      createdByRole: 'seller',
    });
    renderPage();

    expect(await screen.findByText('Trade closed')).toBeInTheDocument();
    expect(
      screen.getByText(/No further offers or counters are possible/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Trade declined')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument();
  });
});
