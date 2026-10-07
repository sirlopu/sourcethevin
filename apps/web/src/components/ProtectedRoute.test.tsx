import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SubmissionNotFound from './SubmissionNotFound';
import { ProtectedRoute } from './ProtectedRoute';

const mocks = vi.hoisted(() => ({ user: vi.fn(), initializing: vi.fn() }));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ user: mocks.user(), initializing: mocks.initializing() }),
}));

function renderWithRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['seller']}>
              <p>Dashboard content</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute roles={['seller']} skipPasswordGate>
              <p>Change password content</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/submissions/:id/audit"
          element={
            <ProtectedRoute roles={['trade_desk', 'admin']} forbidden={<SubmissionNotFound />}>
              <p>Audit trail content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects a user with mustChangePassword set to the change-password screen', () => {
    mocks.initializing.mockReturnValue(false);
    mocks.user.mockReturnValue({
      id: 'u1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 't1',
      mustChangePassword: true,
    });

    renderWithRoutes('/dashboard');

    expect(screen.getByText('Change password content')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('does not redirect away from the change-password screen itself', () => {
    mocks.initializing.mockReturnValue(false);
    mocks.user.mockReturnValue({
      id: 'u1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 't1',
      mustChangePassword: true,
    });

    renderWithRoutes('/change-password');

    expect(screen.getByText('Change password content')).toBeInTheDocument();
  });

  it('renders the destination normally once the password has been changed', () => {
    mocks.initializing.mockReturnValue(false);
    mocks.user.mockReturnValue({
      id: 'u1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 't1',
      mustChangePassword: false,
    });

    renderWithRoutes('/dashboard');

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('redirects a seller opening a submission audit trail to the dashboard', () => {
    mocks.initializing.mockReturnValue(false);
    mocks.user.mockReturnValue({
      id: 'u1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 't1',
      mustChangePassword: false,
    });

    renderWithRoutes('/submissions/other-seller-submission/audit');

    expect(screen.getByRole('heading', { name: 'Submission not found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('Audit trail content')).not.toBeInTheDocument();
  });
});
