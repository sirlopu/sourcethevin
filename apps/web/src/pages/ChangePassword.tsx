import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { Field } from '../components/Field';
import { SubmitButton } from '../components/SubmitButton';
import { ApiError } from '../lib/api';
import { changePassword } from '../lib/account-api';
import { useAuth } from '../lib/auth-context';
import { roleHome } from '../lib/role';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, authFetch, refreshSession } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await changePassword(authFetch, { currentPassword, newPassword });
      await refreshSession();
      navigate(roleHome(user!.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <p className="mb-4 text-sm text-blue-100">
        You&rsquo;re using a temporary password. Choose a new password to continue.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Temporary password"
          name="currentPassword"
          type="password"
          showPasswordToggle
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <Field
          label="New password"
          name="newPassword"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          required
          minLength={10}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-red-300">
            {error}
          </p>
        )}
        <SubmitButton disabled={submitting}>
          {submitting ? 'Updating…' : 'Set new password'}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
