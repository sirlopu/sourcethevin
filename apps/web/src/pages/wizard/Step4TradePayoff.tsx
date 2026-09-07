import { useState, type FormEvent } from 'react';
import { WizardField } from '../../components/wizard/WizardField';
import { WizardSelect } from '../../components/wizard/WizardSelect';
import type { WizardStepProps } from '../../components/wizard/WizardShell';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useAutosave } from '../../lib/useAutosave';
import { patchSubmission } from '../../lib/wizard-api';
import type { Payoff } from '@sourcethevin/shared';

type LienStatus = NonNullable<Payoff['lienStatus']>;
type TitleStatus = NonNullable<Payoff['titleStatus']>;

export default function Step4TradePayoff({ submission, onSaved, onContinue }: WizardStepProps) {
  const { authFetch } = useAuth();
  const p = submission.payoff;
  const [expectedAllowance, setExpectedAllowance] = useState(p.expectedAllowance?.toString() ?? '');
  const [lienStatus, setLienStatus] = useState<LienStatus>(p.lienStatus ?? 'none');
  const [payoffAmount, setPayoffAmount] = useState(p.payoffAmount?.toString() ?? '');
  const [titleStatus, setTitleStatus] = useState<TitleStatus>(p.titleStatus ?? 'in_hand');
  const [lienHolder, setLienHolder] = useState(p.lienHolder ?? '');
  const [sellerNotes, setSellerNotes] = useState(p.sellerNotes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payoffPatch = {
    payoff: {
      expectedAllowance: expectedAllowance ? Number(expectedAllowance) : null,
      lienStatus,
      payoffAmount: payoffAmount ? Number(payoffAmount) : null,
      titleStatus,
      lienHolder: lienHolder || null,
      sellerNotes: sellerNotes || null,
    },
  };
  useAutosave(authFetch, submission._id, payoffPatch, onSaved);

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await patchSubmission(authFetch, submission._id, {
        currentStep: 5,
        ...payoffPatch,
      });
      onSaved(updated);
      onContinue(5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleContinue} noValidate className="space-y-4">
      <h2 className="font-display text-2xl font-bold text-navy-900">Trade &amp; payoff</h2>

      <WizardField
        label="Customer's expected allowance"
        name="expectedAllowance"
        type="number"
        placeholder="$"
        value={expectedAllowance}
        onChange={(e) => setExpectedAllowance(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <WizardSelect
          label="Lien / payoff status"
          name="lienStatus"
          value={lienStatus}
          onChange={(e) => setLienStatus(e.target.value as LienStatus)}
        >
          <option value="none">No lien — clear title</option>
          <option value="active_lien">Active lien — payoff required</option>
        </WizardSelect>
        <WizardField
          label="Payoff amount"
          name="payoffAmount"
          type="number"
          placeholder="$"
          value={payoffAmount}
          onChange={(e) => setPayoffAmount(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <WizardSelect
          label="Title available?"
          name="titleStatus"
          value={titleStatus}
          onChange={(e) => setTitleStatus(e.target.value as TitleStatus)}
        >
          <option value="in_hand">In hand</option>
          <option value="with_lienholder">With lienholder</option>
          <option value="lost">Lost / duplicate needed</option>
        </WizardSelect>
        <WizardField
          label="Lienholder"
          name="lienHolder"
          value={lienHolder}
          onChange={(e) => setLienHolder(e.target.value)}
        />
      </div>

      <label htmlFor="sellerNotes" className="block">
        <span className="mb-1.5 block text-xs font-semibold text-ink-700">
          Seller notes / disclosures (optional)
        </span>
        <textarea
          id="sellerNotes"
          rows={3}
          value={sellerNotes}
          onChange={(e) => setSellerNotes(e.target.value)}
          className="w-full rounded-md border-[1.5px] border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting ? 'Saving…' : 'Continue to photos'}
      </button>
    </form>
  );
}
