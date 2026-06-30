'use client';

import { useEffect, useState, useTransition } from 'react';

const COOLDOWN_SECONDS = 15 * 60;

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, '0')}s`;
}

export default function RefreshButton({ lastUpdatedAt }) {
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(() => {
    if (!lastUpdatedAt) return 0;
    const age = Math.floor((Date.now() - new Date(lastUpdatedAt).getTime()) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - age);
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!remaining) return undefined;

    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remaining]);

  async function refreshNow() {
    setMessage('');
    startTransition(async () => {
      const response = await fetch('/api/update', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Unable to update right now.');
        if (data.retryAfterSeconds) {
          setRemaining(data.retryAfterSeconds);
        }
        return;
      }

      setMessage(data.message || 'Updated.');
      setRemaining(COOLDOWN_SECONDS);
      window.location.reload();
    });
  }

  return (
    <div className="toolbar">
      <button type="button" onClick={refreshNow} disabled={isPending || remaining > 0}>
        {isPending ? 'Checking...' : remaining > 0 ? `Cooldown ${formatCountdown(remaining)}` : 'Check for new news'}
      </button>
      {message ? <span className="muted">{message}</span> : null}
    </div>
  );
}