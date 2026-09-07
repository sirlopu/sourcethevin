import { useNavigate } from 'react-router-dom';

/** Opens step 1 without creating a draft. The draft is created after a VIN decodes. */
export function useStartSubmission() {
  const navigate = useNavigate();

  return () => {
    navigate('/wizard/new/1');
  };
}
