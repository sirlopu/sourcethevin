import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SubmissionNotFound from './SubmissionNotFound';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/submissions/missing-id']}>
      <Routes>
        <Route path="/submissions/:id" element={<SubmissionNotFound />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SubmissionNotFound', () => {
  it('automatically redirects to the dashboard after a short delay', async () => {
    vi.useFakeTimers();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Submission not found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('lets the user navigate immediately with the dashboard button', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Go to dashboard' }));

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });
});