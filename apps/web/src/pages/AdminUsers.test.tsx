import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsers from './AdminUsers';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  signOut: vi.fn(),
  listAdminUsers: vi.fn(),
  inviteUser: vi.fn(),
  approveSellerRequest: vi.fn(),
  rejectSellerRequest: vi.fn(),
  resetUserPassword: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@example.com' },
    authFetch: mocks.authFetch,
    signOut: mocks.signOut,
  }),
}));

vi.mock('../lib/admin-api', () => ({
  listAdminUsers: mocks.listAdminUsers,
  inviteUser: mocks.inviteUser,
  approveSellerRequest: mocks.approveSellerRequest,
  rejectSellerRequest: mocks.rejectSellerRequest,
  resetUserPassword: mocks.resetUserPassword,
}));

vi.mock('../components/NotificationBell', () => ({
  NotificationBell: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAdminUsers.mockResolvedValue({
    items: [],
    pendingCount: 0,
    tenant: {
      id: 'tenant-1',
      environment: 'test',
      activeUserCount: 0,
      transport: 'HTTPS / TLS',
    },
  });
  mocks.inviteUser.mockResolvedValue({
    user: { email: 'trade.desk@example.com' },
    temporaryPassword: 'temporary-password',
  });
});

describe('AdminUsers invite form', () => {
  it('requires names and sends trimmed names with a Trade Desk invitation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '+ Invite user' }));

    const firstName = screen.getByRole('textbox', { name: 'First name' });
    const lastName = screen.getByRole('textbox', { name: 'Last name' });
    expect(firstName).toBeRequired();
    expect(lastName).toBeRequired();

    await user.type(firstName, '  Taylor  ');
    await user.type(lastName, '  Morgan  ');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'trade.desk@example.com');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(mocks.inviteUser).toHaveBeenCalledWith(mocks.authFetch, {
      firstName: 'Taylor',
      lastName: 'Morgan',
      email: 'trade.desk@example.com',
      role: 'trade_desk',
      dealership: undefined,
    });
  });

  it('shows dealership fields only when Seller is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '+ Invite user' }));
    expect(screen.queryByRole('textbox', { name: 'Phone' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'seller');
    expect(screen.getByRole('textbox', { name: 'Phone' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Dealership name (optional)' })).toBeInTheDocument();
  });
});