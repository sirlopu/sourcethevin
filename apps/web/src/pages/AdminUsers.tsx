import { RoleShell } from '../components/RoleShell';

export default function AdminUsers() {
  return (
    <RoleShell title="Users">
      <p className="text-sm text-ink-500">Pending and active accounts will appear here.</p>
    </RoleShell>
  );
}
