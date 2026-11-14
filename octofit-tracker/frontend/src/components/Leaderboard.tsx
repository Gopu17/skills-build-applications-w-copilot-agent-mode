import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      try {
        const payload = await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
        if (!active) return;
        setLeaderboard(payload.leaderboard ?? []);
        setError(null);
      } catch {
        if (!active) return;
        setError('Unable to load leaderboard.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLeaderboard();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <CapabilityCard title="Leaderboard" description="Compare team point totals." status={<p role="status">Loading leaderboard…</p>} />;
  }

  if (error) {
    return <CapabilityCard title="Leaderboard" description="Compare team point totals." status={<div role="alert">{error}</div>} />;
  }

  if (leaderboard.length === 0) {
    return <CapabilityCard title="Leaderboard" description="Compare team point totals." status={<p>No leaderboard scores yet.</p>} />;
  }

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      status={(
        <ol className="list-group list-group-numbered">
          {leaderboard.map((entry) => (
            <li key={`${entry.teamName}-${entry.rank}`} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                #{entry.rank} {entry.teamName}
              </span>
              <span className="badge text-bg-primary rounded-pill">{entry.totalPoints}</span>
            </li>
          ))}
        </ol>
      )}
    />
  );
}
