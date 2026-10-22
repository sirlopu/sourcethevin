import { Link } from 'react-router-dom';
import { AuthCard } from '../components/AuthCard';

export default function Terms() {
  return (
    <AuthCard>
      <h1 className="font-display text-xl font-semibold text-white">Terms &amp; Conditions</h1>
      <p className="mt-4 text-sm leading-6 text-blue-100">
        The terms and conditions for SourceTheVIN are being prepared and will be published here.
      </p>
      <p className="mt-6 text-center text-sm text-blue-100">
        <Link to="/request-access" className="font-semibold text-white underline">
          Back to seller access request
        </Link>
      </p>
    </AuthCard>
  );
}