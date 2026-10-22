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

    expect(await screen.findByAltText('SourceTheVIN')).toBeInTheDocument();
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

    await screen.findByAltText('SourceTheVIN');
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

    await screen.findByAltText('SourceTheVIN');
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

    await screen.findByAltText('SourceTheVIN');
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

    await screen.findByAltText('SourceTheVIN');
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

  it('submits seller access without a password and links to terms', async () => {
    vi.mocked(api.requestSellerAccess).mockResolvedValue({ id: 'u4', status: 'pending' });
    const user = userEvent.setup();
    renderApp('/request-access');

    await screen.findByAltText('SourceTheVIN');
    await user.type(screen.getByLabelText('Email'), 'seller@example.com');
    await user.type(screen.getByLabelText('First name'), 'Sam');
    await user.type(screen.getByLabelText('Last name'), 'Seller');
    await user.type(screen.getByLabelText('Dealership name'), 'Example Motors');
    await user.type(screen.getByLabelText('Dealer license number (optional)'), 'DL-123');
    await user.type(screen.getByLabelText('Phone'), '555-0100');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute('href', '/terms');

    await user.click(screen.getByRole('button', { name: 'Request seller access' }));

    expect(await screen.findByText('Request received')).toBeInTheDocument();
    expect(api.requestSellerAccess).toHaveBeenCalledWith({
      email: 'seller@example.com',
      firstName: 'Sam',
      lastName: 'Seller',
      dealership: { name: 'Example Motors', licenseNumber: 'DL-123', phone: '555-0100' },
    });
  });

  it('lists missing required fields without submitting the request', async () => {
    const user = userEvent.setup();
    renderApp('/request-access');

    await screen.findByAltText('SourceTheVIN');
    await user.click(screen.getByRole('button', { name: 'Request seller access' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please complete the following required fields: Email, First name, Last name, Dealership name, Phone.',
    );
    expect(api.requestSellerAccess).not.toHaveBeenCalled();
  });

  it('serves the terms page at /terms', async () => {
    renderApp('/terms');

    expect(await screen.findByRole('heading', { name: 'Terms & Conditions' })).toBeInTheDocument();
  });
});
