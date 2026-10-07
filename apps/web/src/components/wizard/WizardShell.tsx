import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import SubmissionNotFound from '../SubmissionNotFound';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { getSubmission, type SubmissionRecord } from '../../lib/wizard-api';
import Step1Vin from '../../pages/wizard/Step1Vin';
import Step2VehicleInfo from '../../pages/wizard/Step2VehicleInfo';
import Step3Condition from '../../pages/wizard/Step3Condition';
import Step4TradePayoff from '../../pages/wizard/Step4TradePayoff';
import Step5Photos from '../../pages/wizard/Step5Photos';
import Step6Review from '../../pages/wizard/Step6Review';
import { WizardHeader } from './WizardHeader';

export interface WizardStepProps {
  submission: SubmissionRecord;
  isNew?: boolean;
  onSaved: (updated: SubmissionRecord) => void;
  onContinue: (nextStep: number, submissionId?: string) => void;
}

const NEW_SUBMISSION: SubmissionRecord = {
  _id: 'new',
  referenceId: '',
  status: 'new',
  currentStep: 1,
  vehicle: {},
  condition: { cosmeticIssues: [] },
  payoff: {},
  photos: [],
  createdAt: '',
  updatedAt: '',
};

const STEP_COMPONENTS: Record<number, React.ComponentType<WizardStepProps>> = {
  1: Step1Vin,
  2: Step2VehicleInfo,
  3: Step3Condition,
  4: Step4TradePayoff,
  5: Step5Photos,
  6: Step6Review,
};

export default function WizardShell() {
  const { id, step } = useParams<{ id: string; step: string }>();
  const stepNumber = Number(step);
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);

  useEffect(() => {
    if (!id || isNew) return;
    let cancelled = false;
    getSubmission(authFetch, id)
      .then((loaded) => {
        if (!cancelled) setSubmission(loaded);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setRedirectToDashboard(true);
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load this trade-in.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, authFetch]);

  if (
    !id ||
    !Number.isInteger(stepNumber) ||
    stepNumber < 1 ||
    stepNumber > 6 ||
    (isNew && stepNumber !== 1)
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  if (redirectToDashboard) return <SubmissionNotFound />;

  const StepComponent = STEP_COMPONENTS[stepNumber]!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(10,31,82,.14)]">
        <WizardHeader
          step={stepNumber}
          onExit={() => navigate('/dashboard')}
          exitLabel={stepNumber === 1 ? 'Cancel' : 'Save & exit'}
          onBack={stepNumber > 1 ? () => navigate(`/wizard/${id}/${stepNumber - 1}`) : undefined}
        />
        <div className="p-6 sm:p-8">
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          {!error && !isNew && !submission && <p className="text-sm text-ink-500">Loading…</p>}
          {!error && (isNew || submission) && (
            <StepComponent
              submission={isNew ? NEW_SUBMISSION : submission!}
              isNew={isNew}
              onSaved={setSubmission}
              onContinue={(nextStep, submissionId) =>
                navigate(`/wizard/${submissionId ?? id}/${nextStep}`)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
