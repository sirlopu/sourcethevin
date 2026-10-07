import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionListItem } from '../../lib/desk-api';
import SubmissionDetail from './SubmissionDetail';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  getSubmissionDetail: vi.fn(),
  saveValuation: vi.fn(),
  appendInternalNote: vi.fn(),
  getLatestOffer: vi.fn(),
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({ authFetch: mocks.authFetch }),
}));

vi.mock('../../components/MessageThread', () => ({ default: () => null }));

vi.mock('../../lib/desk-api', () => ({
  declineSubmission: vi.fn(),
  getSubmissionDetail: mocks.getSubmissionDetail,
  overrideValuation: vi.fn(),
  appendInternalNote: mocks.appendInternalNote,
  saveValuation: mocks.saveValuation,
}));

vi.mock('../../lib/offers-api', () => ({
  acceptOffer: vi.fn(),
  createOffer: vi.fn(),
  declineOffer: vi.fn(),
  getLatestOffer: mocks.getLatestOffer,
}));

const submission: SubmissionListItem = {
  _id: 'submission-1',
  referenceId: 'TRD-001',
  status: 'submitted',
  currentStep: 6,
  vin: '1HGCM82633A004352',
  vehicle: { year: 2003, make: 'Honda', model: 'Accord' },
  condition: { cosmeticIssues: [] },
  payoff: {},
  photos: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  valuation: {
    submissionId: 'submission-1',
    tenantId: 'tenant-1',
    bidReferences: [],
    estimatedExpenses: { transport: 0, recon: 0, arbitrationCondition: 0, other: 0 },
    targetMargin: 0,
    recommendedMaxAcquisition: 0,
    buyerOverride: null,
    internalNoteHistory: [
      { text: 'Older note', createdAt: '2026-10-01T12:00:00.000Z' },
      { text: 'Latest existing note', createdAt: '2026-10-02T12:00:00.000Z' },
    ],
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/desk/submissions/submission-1']}>
      <Routes>
        <Route path="/desk/submissions/:id" element={<SubmissionDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSubmissionDetail.mockResolvedValue(submission);
  mocks.appendInternalNote.mockResolvedValue({
    ...submission.valuation,
    internalNoteHistory: [
      { text: 'New saved note', createdAt: '2026-10-03T12:00:00.000Z' },
      ...(submission.valuation?.internalNoteHistory ?? []),
    ],
  });
  mocks.getLatestOffer.mockResolvedValue(null);
});

describe('SubmissionDetail internal notes', () => {
  it('shows note history newest first below the save button and appends on success', async () => {
    const user = userEvent.setup();
    renderPage();

    const editor = await screen.findByLabelText('Internal notes');
    const savedNotes = screen.getByRole('group', { name: 'Saved notes' });
    expect(within(savedNotes).getByText('Latest existing note')).toBeInTheDocument();
    expect(within(savedNotes).getByText('Older note')).toBeInTheDocument();
    expect(editor).toHaveValue('');
    const saveButton = screen.getByRole('button', { name: 'Save notes' });
    expect(
      saveButton.compareDocumentPosition(savedNotes) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(savedNotes)
        .getByText('Latest existing note')
        .compareDocumentPosition(within(savedNotes).getByText('Older note')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.clear(editor);
    await user.type(editor, 'New saved note');
    await user.click(screen.getByRole('button', { name: 'Save notes' }));

    expect(await within(savedNotes).findByText('New saved note')).toBeInTheDocument();
    expect(editor).toHaveValue('');
    expect(mocks.appendInternalNote).toHaveBeenCalledWith(
      mocks.authFetch,
      'submission-1',
      'New saved note',
    );
  });

  it('keeps the draft and existing history visible when saving fails', async () => {
    mocks.appendInternalNote.mockRejectedValue(new Error('save failed'));
    const user = userEvent.setup();
    renderPage();

    const editor = await screen.findByLabelText('Internal notes');
    const savedNotes = screen.getByRole('group', { name: 'Saved notes' });
    await user.clear(editor);
    await user.type(editor, 'Unsaved edit');

    expect(within(savedNotes).getByText('Latest existing note')).toBeInTheDocument();
    expect(within(savedNotes).queryByText('Unsaved edit')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save notes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save notes.');
    expect(editor).toHaveValue('Unsaved edit');
    expect(within(savedNotes).getByText('Latest existing note')).toBeInTheDocument();
  });
});