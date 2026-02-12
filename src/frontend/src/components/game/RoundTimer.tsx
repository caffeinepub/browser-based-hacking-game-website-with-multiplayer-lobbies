import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface RoundTimerProps {
  startTime: number;
  duration: number;
}

export default function RoundTimer({ startTime, duration }: RoundTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="terminal-border bg-card p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-primary" />
        <p className="text-xs text-muted-foreground terminal-text">TIME_LEFT</p>
      </div>
      <p className={`text-3xl font-bold terminal-text ${
        timeLeft < 30 ? 'text-destructive' : 'text-primary terminal-glow'
      }`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>
    </div>
  );
}
