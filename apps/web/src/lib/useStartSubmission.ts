import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { createSubmission } from './wizard-api';

/** Creates a new trade-in submission and navigates into step 1 of the wizard. */
export function useStartSubmission() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  return async () => {
    const submission = await createSubmission(authFetch);
    navigate(`/wizard/${submission._id}/1`);
  };
}
