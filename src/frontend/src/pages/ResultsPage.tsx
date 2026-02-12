import { useNavigate, useSearch } from '@tanstack/react-router';
import { Trophy, RotateCcw, Home } from 'lucide-react';

export default function ResultsPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/results' }) as any;
  
  // Ensure score is properly parsed as a number
  const score = typeof search?.score === 'number' ? search.score : (typeof search?.score === 'string' ? parseInt(search.score, 10) : 0);
  const mode = search?.mode || 'solo';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="terminal-border bg-card p-12 space-y-8 text-center">
        <Trophy className="w-20 h-20 text-primary terminal-glow mx-auto" />
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary terminal-glow terminal-text">
            MISSION_COMPLETE
          </h1>
          <p className="text-muted-foreground terminal-text">
            {'>'} CHALLENGE_SOLVED
          </p>
        </div>

        <div className="space-y-4">
          <div className="terminal-border bg-background p-6">
            <p className="text-sm text-muted-foreground terminal-text mb-2">FINAL_SCORE</p>
            <p className="text-6xl font-bold text-primary terminal-glow terminal-text">
              {score}
            </p>
          </div>

          <div className="text-sm text-muted-foreground terminal-text">
            MODE: {mode.toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate({ to: '/solo' })}
            className="flex items-center justify-center gap-2 px-6 py-3 terminal-border bg-primary text-primary-foreground hover:bg-primary/90 terminal-text font-bold"
          >
            <RotateCcw className="w-4 h-4" />
            PLAY_AGAIN
          </button>
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center justify-center gap-2 px-6 py-3 terminal-border bg-card hover:bg-primary/10 terminal-text font-bold"
          >
            <Home className="w-4 h-4" />
            MAIN_MENU
          </button>
        </div>
      </div>

      <div className="terminal-border bg-card/50 p-4 text-center">
        <p className="text-muted-foreground terminal-text text-sm">
          Check the leaderboard to see how you rank!
        </p>
      </div>
    </div>
  );
}
