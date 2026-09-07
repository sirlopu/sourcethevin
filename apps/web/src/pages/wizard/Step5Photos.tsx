import { useRef, useState, type ChangeEvent } from 'react';
import { MIN_REQUIRED_PHOTOS, PHOTO_SLOTS, type PhotoSlot } from '@sourcethevin/shared';
import type { WizardStepProps } from '../../components/wizard/WizardShell';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { compressImage } from '../../lib/image-compression';
import {
  confirmPhotoUpload,
  patchSubmission,
  signPhotoUpload,
  uploadToCloudinary,
} from '../../lib/wizard-api';

export default function Step5Photos({ submission, onSaved, onContinue }: WizardStepProps) {
  const { authFetch } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<PhotoSlot | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const capturedSlots = new Set(submission.photos.map((photo) => photo.slot));
  const capturedCount = submission.photos.length;
  const nextSlot = PHOTO_SLOTS.find((slot) => !capturedSlots.has(slot.key));
  const canReview = capturedCount >= MIN_REQUIRED_PHOTOS;

  function openPickerFor(slot: PhotoSlot) {
    setError(null);
    setActiveSlot(slot);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeSlot) return;

    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const signed = await signPhotoUpload(authFetch, submission._id, activeSlot);
      const uploaded = await uploadToCloudinary(compressed, signed);
      const updated = await confirmPhotoUpload(authFetch, submission._id, {
        slot: activeSlot,
        publicId: signed.publicId,
        url: uploaded.secure_url,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
      setActiveSlot(null);
    }
  }

  async function handleReviewAndSubmit() {
    setAdvancing(true);
    setError(null);
    try {
      const updated = await patchSubmission(authFetch, submission._id, { currentStep: 6 });
      onSaved(updated);
      onContinue(6);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      <h2 className="font-display text-2xl font-bold text-navy-900">Photos</h2>
      <p className="text-sm text-ink-500">
        {capturedCount} of {PHOTO_SLOTS.length} captured · compressed on device before upload
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {PHOTO_SLOTS.map((slot) => {
          const captured = capturedSlots.has(slot.key);
          const isActive = uploading && activeSlot === slot.key;
          return (
            <button
              key={slot.key}
              type="button"
              disabled={uploading}
              onClick={() => openPickerFor(slot.key)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-[1.5px] p-2 text-center text-[11px] font-semibold transition disabled:cursor-not-allowed ${
                captured
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-dashed border-ink-300 bg-ink-50 text-ink-500 hover:border-blue-500'
              }`}
            >
              {captured && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] text-white">
                  ✓
                </span>
              )}
              <span>{isActive ? '…' : captured ? '' : '+'}</span>
              <span className="leading-tight">{slot.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {nextSlot && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => openPickerFor(nextSlot.key)}
          className="mt-5 w-full rounded-md bg-gradient-to-br from-blue-400 to-blue-600 py-3 font-display font-semibold text-white shadow-[0_4px_14px_rgba(10,75,168,.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {uploading ? 'Uploading…' : `Capture ${nextSlot.label}`}
        </button>
      )}

      <button
        type="button"
        disabled={!canReview || advancing}
        onClick={handleReviewAndSubmit}
        className="mt-3 w-full text-center text-sm font-semibold text-blue-500 hover:underline disabled:cursor-not-allowed disabled:text-ink-300 disabled:no-underline"
      >
        {advancing ? 'Saving…' : 'Review & submit →'}
      </button>
    </div>
  );
}
