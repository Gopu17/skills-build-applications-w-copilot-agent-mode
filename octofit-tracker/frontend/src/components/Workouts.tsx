import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  reason?: string;
  minutes?: number;
  difficulty?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSuggestions() {
      try {
        const payload = await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
        if (!active) return;
        setSuggestions(payload.suggestions ?? []);
        setError(null);
      } catch {
        if (!active) return;
        setError('Unable to load workout suggestions.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSuggestions();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." status={<p role="status">Loading workout suggestions…</p>} />;
  }

  if (error) {
    return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." status={<div role="alert">{error}</div>} />;
  }

  if (suggestions.length === 0) {
    return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." status={<p>No workout suggestions available.</p>} />;
  }

  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      status={(
        <ul className="list-group list-group-flush">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.title}-${index}`} className="list-group-item">
              <strong>{suggestion.title}</strong>
              {suggestion.focus ? <div className="small text-body-secondary">Focus: {suggestion.focus}</div> : null}
              {suggestion.reason ? <div>{suggestion.reason}</div> : null}
            </li>
          ))}
        </ul>
      )}
    />
  );
}
