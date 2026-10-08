import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import WizardShell from './WizardShell';

const mocks = vi.hoisted(() => ({ authFetch: vi.fn(), getSubmission: vi.fn() }));

vi.mock('../../lib/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth-context')>();
  return { ...actual, useAuth: () => ({ authFetch: mocks.authFetch }) };
});

vi.mock('../../lib/wizard-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/wizard-api')>();
  return { ...actual, getSubmission: mocks.getSubmission };
});

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/wizard/submission-1/2']}>
      <Routes>
        <Route path="/wizard/:id/:step" element={<WizardShell />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WizardShell submission access', () => {
  it('redirects to the dashboard when the submission is not viewable', async () => {
    mocks.getSubmission.mockRejectedValue(new ApiError(404, 'Submission not found'));
    renderWizard();

    expect(
      await screen.findByRole('heading', { name: 'Submission not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument();
  });

  it('shows other submission loading errors in the wizard', async () => {
    mocks.getSubmission.mockRejectedValue(new ApiError(500, 'Server error'));
    renderWizard();

    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });
});
