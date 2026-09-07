import { useState } from 'react';
import { RoleShell } from '../components/RoleShell';
import { ApiError } from '../lib/api';
import { useStartSubmission } from '../lib/useStartSubmission';

export default function Dashboard() {
  const startSubmission = useStartSubmission();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      await startSubmission();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setStarting(false);
    }
  }

  return (
    <RoleShell title="Seller dashboard">
      <div className="max-w-sm rounded-md bg-gradient-to-br from-blue-400 to-blue-600 p-5 text-white shadow-[0_4px_14px_rgba(10,75,168,.25)]">
        <p className="text-xs font-semibold text-blue-100">Start a new</p>
        <p className="font-display text-xl font-bold">Trade-in submission</p>
        <button
          type="button"
          disabled={starting}
          onClick={() => {
            void handleStart();
          }}
          className="mt-4 w-full rounded-md bg-white py-2.5 font-display font-semibold text-navy-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {starting ? 'Starting…' : 'Enter VIN →'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </RoleShell>
  );
}
