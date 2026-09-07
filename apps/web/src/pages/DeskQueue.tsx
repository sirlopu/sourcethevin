import { RoleShell } from '../components/RoleShell';

export default function DeskQueue() {
  return (
    <RoleShell title="Trade desk queue">
      <p className="text-sm text-ink-500">Incoming trades awaiting review will appear here.</p>
    </RoleShell>
  );
}
