import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionRecord } from '../../lib/wizard-api';
import Step1Vin from './Step1Vin';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  createSubmission: vi.fn(),
  decodeVin: vi.fn(),
  patchSubmission: vi.fn(),
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({ authFetch: mocks.authFetch }),
}));

vi.mock('../../lib/wizard-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/wizard-api')>()),
  createSubmission: mocks.createSubmission,
  decodeVin: mocks.decodeVin,
  patchSubmission: mocks.patchSubmission,
}));

const newSubmission: SubmissionRecord = {
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

const decoded = {
  vin: '1HGCM82633A004352',
  year: 2003,
  make: 'Honda',
  model: 'Accord',
  trim: null,
  drivetrain: null,
  engine: null,
  cached: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.decodeVin.mockResolvedValue(decoded);
  mocks.createSubmission.mockResolvedValue({
    ...newSubmission,
    _id: 'submission-1',
    referenceId: 'STV-2026-00001',
    currentStep: 2,
    vin: decoded.vin,
    decoded,
    vehicle: decoded,
  });
});

describe('Step1Vin', () => {
  it('creates a new draft only after the VIN has been submitted and decoded', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onContinue = vi.fn();
    render(<Step1Vin submission={newSubmission} isNew onSaved={onSaved} onContinue={onContinue} />);

    expect(mocks.createSubmission).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('VIN'), decoded.vin);
    await user.click(screen.getByRole('button', { name: 'Decode VIN' }));

    await waitFor(() => expect(mocks.createSubmission).toHaveBeenCalledTimes(1));
    expect(mocks.decodeVin.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createSubmission.mock.invocationCallOrder[0]!,
    );
    expect(mocks.createSubmission).toHaveBeenCalledWith(
      mocks.authFetch,
      expect.objectContaining({ vin: decoded.vin }),
    );
    expect(onContinue).toHaveBeenCalledWith(2, 'submission-1');
  });

  it('does not create a draft when VIN decoding fails', async () => {
    mocks.decodeVin.mockRejectedValue(new Error('decode failed'));
    const user = userEvent.setup();
    render(<Step1Vin submission={newSubmission} isNew onSaved={vi.fn()} onContinue={vi.fn()} />);

    await user.type(screen.getByLabelText('VIN'), decoded.vin);
    await user.click(screen.getByRole('button', { name: 'Decode VIN' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mocks.createSubmission).not.toHaveBeenCalled();
  });
});
