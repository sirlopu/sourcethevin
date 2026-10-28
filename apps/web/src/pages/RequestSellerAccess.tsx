import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';
import { Field } from '../components/Field';
import { SubmitButton } from '../components/SubmitButton';
import { ApiError, requestSellerAccess } from '../lib/api';

export default function RequestSellerAccess() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dealershipName, setDealershipName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const requiredFields: Array<[string, string]> = [
      ['Email', email],
      ['First name', firstName],
      ['Last name', lastName],
      ['Dealership name', dealershipName],
      ['Phone', phone],
    ];
    const missingFields = requiredFields
      .filter(([, value]) => !value.trim())
      .map(([label]) => label);

    if (missingFields.length > 0) {
      setError(`Please complete the following required fields: ${missingFields.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    try {
      await requestSellerAccess({
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dealership: {
          name: dealershipName.trim(),
          licenseNumber: licenseNumber.trim() || undefined,
          phone,
        },
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
            verified, with a link to create your password.
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
          label="First name"
          name="firstName"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <Field
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <Field
          label="Dealership name"
          name="dealershipName"
          required
          value={dealershipName}
          onChange={(event) => setDealershipName(event.target.value)}
        />
        <Field
          label="Dealer license number (optional)"
          name="licenseNumber"
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
        <p className="mt-4 text-center text-xs text-blue-100">
          By submitting this request, you agree to our{' '}
          <Link to="/terms" className="font-semibold text-white underline">
            Terms &amp; Conditions
          </Link>
          .
        </p>
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
