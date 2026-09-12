import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './lib/api';

vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    login: vi.fn(),
    requestSellerAccess: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(api.refresh).mockReset().mockRejectedValue(new Error('not authenticated'));
  vi.mocked(api.login).mockReset();
});

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('redirects an unauthenticated visitor to the sign-in screen', async () => {
    renderApp('/');

    expect(await screen.findByText('Source the VIN.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('signs a seller in and routes them to the dashboard', async () => {
    vi.mocked(api.login).mockResolvedValue({
      accessToken: 'fake.token.value',
      user: {
        id: 'u1',
        email: 'seller@example.com',
        role: 'seller',
        tenantId: 't1',
        mustChangePassword: false,
      },
    });
    const user = userEvent.setup();
    renderApp('/login');

    await screen.findByText('Source the VIN.');
    await user.type(screen.getByLabelText('Email'), 'seller@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Seller dashboard' })).toBeInTheDocument();
  });

  it('routes an admin to /admin/users and a trade desk user to /desk/queue', async () => {
    vi.mocked(api.login).mockResolvedValue({
      accessToken: 'fake.token.value',
      user: {
        id: 'u2',
        email: 'admin@example.com',
        role: 'admin',
        tenantId: 't1',
        mustChangePassword: false,
      },
    });
    const user = userEvent.setup();
    renderApp('/login');

    await screen.findByText('Source the VIN.');
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Users & roles' })).toBeInTheDocument();
  });

  it('forces a user with a temporary password to the change-password screen instead of their home page', async () => {
    vi.mocked(api.login).mockResolvedValue({
      accessToken: 'fake.token.value',
      user: {
        id: 'u3',
        email: 'seller@example.com',
        role: 'seller',
        tenantId: 't1',
        mustChangePassword: true,
      },
    });
    const user = userEvent.setup();
    renderApp('/login');

    await screen.findByText('Source the VIN.');
    await user.type(screen.getByLabelText('Email'), 'seller@example.com');
    await user.type(screen.getByLabelText('Password'), 'temp-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByLabelText('Temporary password')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Seller dashboard' })).not.toBeInTheDocument();
  });

  it('shows the login error message when credentials are rejected', async () => {
    vi.mocked(api.login).mockRejectedValue(new api.ApiError(401, 'Invalid email or password'));
    const user = userEvent.setup();
    renderApp('/login');

    await screen.findByText('Source the VIN.');
    await user.type(screen.getByLabelText('Email'), 'seller@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('shows and hides the login password', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    const passwordInput = await screen.findByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows and hides the requested seller password', async () => {
    const user = userEvent.setup();
    renderApp('/request-access');

    const passwordInput = await screen.findByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
