import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SubmissionNotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <section className="w-full max-w-md rounded-md border border-ink-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-navy-900">Submission not found</h1>
        <p className="mt-2 text-sm text-ink-500">
          We couldn’t find that submission. You’ll be redirected to your dashboard shortly.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard', { replace: true })}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Go to dashboard
        </button>
      </section>
    </main>
  );
}
