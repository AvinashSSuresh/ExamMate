import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';

// Pads a number to two digits, for example 5 becomes "05"
function pad(value) {
  return String(value).padStart(2, '0');
}

// Study timer. Stopping it reports the minutes studied to the parent component.
export default function SessionTimer({ onStop, busy = false }) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0);

  // Refresh the display once per second while the timer is running
  useEffect(() => {
    if (!running) return undefined;

    const id = setInterval(() => {
      setElapsedMs(accumulatedRef.current + (Date.now() - startedAtRef.current));
    }, 1000);

    return () => clearInterval(id);
  }, [running]);

  function start() {
    startedAtRef.current = Date.now();
    setRunning(true);
  }

  function pause() {
    accumulatedRef.current += Date.now() - startedAtRef.current;
    setElapsedMs(accumulatedRef.current);
    setRunning(false);
  }

  function stop() {
    const totalMs = running
      ? accumulatedRef.current + (Date.now() - startedAtRef.current)
      : accumulatedRef.current;

    // Always record at least one minute, so a quick session is still counted
    const minutes = Math.max(1, Math.round(totalMs / 60000));

    accumulatedRef.current = 0;
    setRunning(false);
    setElapsedMs(0);
    onStop(minutes);
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const display = `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-xl font-semibold tabular-nums">{display}</span>

      {running ? (
        <button
          type="button"
          onClick={pause}
          disabled={busy}
          className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10 disabled:opacity-50"
        >
          <Pause size={16} /> Pause
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="glass rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10 disabled:opacity-50"
        >
          <Play size={16} /> {elapsedMs > 0 ? 'Resume' : 'Start'}
        </button>
      )}

      <button
        type="button"
        onClick={stop}
        disabled={busy || (!running && elapsedMs === 0)}
        className="btn-gradient !py-2 !px-4 text-sm flex items-center gap-2 disabled:opacity-50"
      >
        <Square size={14} /> Stop and save
      </button>
    </div>
  );
}