import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { Field } from '../components/Field';
import { SubmitButton } from '../components/SubmitButton';
import { ApiError, resetPassword } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="New password"
          name="newPassword"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <Field
          label="Confirm password"
          name="confirmPassword"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-red-300">
            {error}
          </p>
        )}
        <SubmitButton disabled={submitting}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </SubmitButton>
        <p className="mt-6 text-center text-sm text-blue-100">
          <Link to="/login" className="font-semibold text-white underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
