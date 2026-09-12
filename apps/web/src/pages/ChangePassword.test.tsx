import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import ChangePassword from './ChangePassword';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  changePassword: vi.fn(),
  refreshSession: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      email: 'seller@example.com',
      role: 'seller',
      tenantId: 't1',
      mustChangePassword: true,
    },
    authFetch: mocks.authFetch,
    refreshSession: mocks.refreshSession,
  }),
}));

vi.mock('../lib/account-api', () => ({
  changePassword: mocks.changePassword,
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.changePassword.mockResolvedValue({ ok: true });
  mocks.refreshSession.mockResolvedValue(undefined);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ChangePassword />
    </MemoryRouter>,
  );
}

describe('ChangePassword', () => {
  it('submits the current and new password, refreshes the session, and routes home', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Temporary password'), 'temp-password');
    await user.type(screen.getByLabelText('New password'), 'a-brand-new-password');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));

    expect(mocks.changePassword).toHaveBeenCalledWith(mocks.authFetch, {
      currentPassword: 'temp-password',
      newPassword: 'a-brand-new-password',
    });
    expect(mocks.refreshSession).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows an error message when the current password is rejected', async () => {
    mocks.changePassword.mockRejectedValue(new ApiError(401, 'Current password is incorrect'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Temporary password'), 'wrong-password');
    await user.type(screen.getByLabelText('New password'), 'a-brand-new-password');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
