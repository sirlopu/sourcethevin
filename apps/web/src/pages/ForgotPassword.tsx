import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { Field } from '../components/Field';
import { SubmitButton } from '../components/SubmitButton';
import { ApiError, requestPasswordReset } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('There is no account associated with that email.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard>
      {success ? (
        <div>
          <p className="mb-6 text-center text-sm text-blue-100">
            Check your email for a reset link
          </p>
          <p className="text-center text-sm text-blue-100">
            <Link to="/login" className="font-semibold text-white underline">
              Back to sign in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && (
            <p role="alert" className="mb-4 text-sm font-medium text-red-300">
              {error}
            </p>
          )}
          <SubmitButton disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </SubmitButton>
          <p className="mt-6 text-center text-sm text-blue-100">
            <Link to="/login" className="font-semibold text-white underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
