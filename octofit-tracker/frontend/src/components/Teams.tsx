import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = {
  name: string;
  mascot?: string;
  members?: Array<string | { _id?: string; name?: string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTeams() {
      try {
        const payload = await getJson<{ teams: Team[] }>('/api/teams');
        if (!active) return;
        setTeams(payload.teams ?? []);
        setError(null);
      } catch {
        if (!active) return;
        setError('Unable to load teams.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTeams();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <CapabilityCard title="Teams" description="Manage teams and members." status={<p role="status">Loading teams…</p>} />;
  }

  if (error) {
    return <CapabilityCard title="Teams" description="Manage teams and members." status={<div role="alert">{error}</div>} />;
  }

  if (teams.length === 0) {
    return <CapabilityCard title="Teams" description="Manage teams and members." status={<p>No teams yet.</p>} />;
  }

  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      status={(
        <ul className="list-group list-group-flush">
          {teams.map((team) => (
            <li key={team.name} className="list-group-item">
              <strong>{team.name}</strong> {team.mascot ? `(${team.mascot})` : ''}
              <div className="small text-body-secondary">
                Members: {(team.members ?? []).map((member) => typeof member === 'string' ? member : member.name ?? member._id ?? 'Unknown').join(', ') || 'None'}
              </div>
            </li>
          ))}
        </ul>
      )}
    />
  );
}
