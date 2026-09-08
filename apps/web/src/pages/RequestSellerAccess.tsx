import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { Field } from '../components/Field';
import { SubmitButton } from '../components/SubmitButton';
import { ApiError, requestSellerAccess } from '../lib/api';

export default function RequestSellerAccess() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dealershipName, setDealershipName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestSellerAccess({
        email,
        password,
        dealership: { name: dealershipName, licenseNumber, phone },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthCard>
        <div className="rounded-md bg-white/10 p-5 text-blue-100">
          <p className="font-display text-lg font-semibold text-white">Request received</p>
          <p className="mt-2 text-sm">
            Your seller access request is pending approval. We&rsquo;ll email you at{' '}
            <span className="font-semibold text-white">{email}</span> once your dealership is
            verified.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-blue-100">
          <Link to="/login" className="font-semibold text-white underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
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
        <Field
          label="Password"
          name="password"
          type="password"
          showPasswordToggle
          autoComplete="new-password"
          minLength={10}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Field
          label="Dealership name"
          name="dealershipName"
          required
          value={dealershipName}
          onChange={(event) => setDealershipName(event.target.value)}
        />
        <Field
          label="Dealer license number"
          name="licenseNumber"
          required
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-red-300">
            {error}
          </p>
        )}
        <SubmitButton disabled={submitting}>
          {submitting ? 'Submitting…' : 'Request seller access'}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-blue-100">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-white underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
