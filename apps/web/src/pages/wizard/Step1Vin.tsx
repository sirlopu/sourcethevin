import { useState, type FormEvent } from 'react';
import { WizardField } from '../../components/wizard/WizardField';
import type { WizardStepProps } from '../../components/wizard/WizardShell';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { isValidVinChecksum } from '../../lib/vin-checksum';
import { createSubmission, decodeVin, patchSubmission } from '../../lib/wizard-api';

export default function Step1Vin({ submission, isNew, onSaved, onContinue }: WizardStepProps) {
  const { authFetch } = useAuth();
  const [vin, setVin] = useState(submission.vin ?? '');
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedVin = vin.trim().toUpperCase();
  const hasSeventeen = trimmedVin.length === 17;
  const checksumValid = hasSeventeen && isValidVinChecksum(trimmedVin);

  async function handleDecode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDecoding(true);
    try {
      const decoded = await decodeVin(authFetch, trimmedVin);
      const decodedVehicle = {
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim,
        drivetrain: decoded.drivetrain,
        engine: decoded.engine,
      };
      const updated = isNew
        ? await createSubmission(authFetch, { vin: trimmedVin, decoded: decodedVehicle })
        : await patchSubmission(authFetch, submission._id, {
            currentStep: 2,
            vin: trimmedVin,
            decoded: decodedVehicle,
            vehicle: decodedVehicle,
          });
      onSaved(updated);
      onContinue(2, updated._id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setDecoding(false);
    }
  }

  return (
    <form onSubmit={handleDecode} noValidate>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Source the VIN</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-navy-900">
        Enter the vehicle&rsquo;s VIN
      </h2>

      <div className="mt-6">
        <WizardField
          label="VIN"
          name="vin"
          value={vin}
          maxLength={17}
          autoComplete="off"
          placeholder="1HGCM82633A004352"
          onChange={(event) => setVin(event.target.value.toUpperCase())}
        />
        <p className="mt-1.5 font-mono text-xs text-ink-500">
          {vin.length} characters
          {hasSeventeen && <> · checksum {checksumValid ? 'valid' : 'invalid'}</>}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!hasSeventeen || decoding}
        className="mt-4 w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {decoding ? 'Decoding…' : 'Decode VIN'}
      </button>
    </form>
  );
}
