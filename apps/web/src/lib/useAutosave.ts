import { useEffect, useRef, useState } from 'react';
import type { SubmissionPatch } from '@sourcethevin/shared';
import type { AuthFetch } from './auth-context';
import { patchSubmission, type SubmissionRecord } from './wizard-api';

const AUTOSAVE_DELAY_MS = 800;

/** Debounced autosave: PATCHes `patch` whenever it changes, matching the wizard's per-step autosave. */
export function useAutosave(
  authFetch: AuthFetch,
  submissionId: string,
  patch: SubmissionPatch,
  onSaved: (updated: SubmissionRecord) => void,
) {
  const [saving, setSaving] = useState(false);
  const serialized = JSON.stringify(patch);
  const onSavedRef = useRef(onSaved);
  const isFirstRun = useRef(true);

  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      setSaving(true);
      patchSubmission(authFetch, submissionId, JSON.parse(serialized) as SubmissionPatch)
        .then((updated) => onSavedRef.current(updated))
        .catch(() => {
          // Best-effort autosave — the next successful patch (e.g. on Continue) will catch up.
        })
        .finally(() => setSaving(false));
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [serialized, authFetch, submissionId]);

  return { saving };
}
