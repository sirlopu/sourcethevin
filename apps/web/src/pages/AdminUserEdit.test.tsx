import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUserEdit from './AdminUserEdit';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  listAdminUsers: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@example.com' },
    authFetch: mocks.authFetch,
  }),
}));

vi.mock('../lib/admin-api', () => ({
  listAdminUsers: mocks.listAdminUsers,
  updateUserProfile: mocks.updateUserProfile,
  updateUserRole: mocks.updateUserRole,
  updateUserStatus: mocks.updateUserStatus,
}));

const seller = {
  id: 'seller-1',
  firstName: 'Pat',
  lastName: 'Lee',
  email: 'seller@example.com',
  role: 'seller',
  status: 'active',
  mustChangePassword: false,
  dealership: { name: 'Acme Motors', licenseNumber: 'L-1', phone: '555-0100' },
  lastActiveAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const tradeDesk = {
  ...seller,
  id: 'desk-1',
  email: 'desk@example.com',
  role: 'trade_desk',
  dealership: null,
};

function renderPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${id}`]}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserEdit />} />
        <Route path="/admin/users" element={<p>Users list</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAdminUsers.mockResolvedValue({
    items: [seller, tradeDesk],
    pendingCount: 0,
    tenant: { id: 'tenant-1', environment: 'test', activeUserCount: 2, transport: 'HTTPS / TLS' },
  });
  mocks.updateUserProfile.mockResolvedValue(seller);
});

describe('AdminUserEdit profile fields', () => {
  it('updates names, dealership name and license for a seller', async () => {
    const user = userEvent.setup();
    renderPage('seller-1');

    const firstName = await screen.findByRole('textbox', { name: 'First name' });
    const dealershipName = screen.getByRole('textbox', { name: 'Dealership name' });
    const license = screen.getByRole('textbox', { name: 'License # (optional)' });
    expect(firstName).toHaveValue('Pat');
    expect(dealershipName).toBeRequired();
    expect(license).toHaveValue('L-1');

    await user.clear(firstName);
    await user.type(firstName, ' Jordan ');
    await user.clear(dealershipName);
    await user.type(dealershipName, 'Beta Autos');
    await user.clear(license);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.updateUserProfile).toHaveBeenCalledWith(mocks.authFetch, 'seller-1', {
      firstName: 'Jordan',
      lastName: 'Lee',
      dealership: { name: 'Beta Autos' },
    });
    expect(mocks.updateUserRole).not.toHaveBeenCalled();
    expect(await screen.findByText('Users list')).toBeInTheDocument();
  });

  it('hides dealership fields for users without a dealership', async () => {
    renderPage('desk-1');

    expect(await screen.findByRole('textbox', { name: 'Last name' })).toHaveValue('Lee');
    expect(screen.queryByRole('textbox', { name: 'Dealership name' })).not.toBeInTheDocument();
  });

  it('skips the profile update when nothing changed', async () => {
    const user = userEvent.setup();
    renderPage('seller-1');

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(mocks.updateUserProfile).not.toHaveBeenCalled();
  });
});
