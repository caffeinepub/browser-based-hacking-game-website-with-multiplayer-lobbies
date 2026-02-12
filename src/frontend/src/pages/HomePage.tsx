import { useNavigate } from '@tanstack/react-router';
import { Terminal, Users, Zap, Trophy, AlertCircle, X } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreateLobby } from '../hooks/useQueries';
import { GameMode } from '../backend';
import { useState } from 'react';
import { APP_VERSION } from '../constants/appVersion';
import { parseIcErrorToMessage } from '../utils/parseIcError';

export default function HomePage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const createLobby = useCreateLobby();
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSoloPlay = () => {
    navigate({ to: '/solo' });
  };

  const handleMultiplayerCreate = async () => {
    if (!isAuthenticated) {
      setErrorMessage('Please login to create a multiplayer lobby.');
      return;
    }
    
    setIsCreatingLobby(true);
    setErrorMessage('');
    
    try {
      const lobbyId = await createLobby.mutateAsync(GameMode.competitive);
      navigate({ to: '/lobby/$lobbyId', params: { lobbyId: lobbyId.toString() } });
    } catch (error) {
      console.error('Failed to create lobby:', error);
      setErrorMessage(parseIcErrorToMessage(error));
    } finally {
      setIsCreatingLobby(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-bold text-primary terminal-glow terminal-text">
                HACK_MANIA
              </h1>
              <p className="text-xl text-secondary terminal-text">
                {'>'} TERMINAL_SIMULATION_{APP_VERSION}
              </p>
            </div>

            <p className="text-lg text-muted-foreground terminal-text leading-relaxed">
              Enter the cyber arena. Solve terminal challenges, crack codes, and compete against hackers worldwide. 
              This is a simulated game environment - no real systems are accessed.
            </p>

            {/* Error Panel */}
            {errorMessage && (
              <div className="terminal-border bg-destructive/10 border-destructive p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-destructive terminal-text">ERROR</p>
                      <p className="text-sm text-muted-foreground terminal-text">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setErrorMessage('')}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSoloPlay}
                className="flex items-center justify-center gap-2 px-8 py-4 terminal-border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors terminal-text font-bold text-lg"
              >
                <Zap className="w-5 h-5" />
                SOLO_MODE
              </button>
              <button
                onClick={handleMultiplayerCreate}
                disabled={isCreatingLobby}
                className="flex items-center justify-center gap-2 px-8 py-4 terminal-border bg-card hover:bg-primary/10 transition-colors terminal-text font-bold text-lg disabled:opacity-50"
              >
                <Users className="w-5 h-5" />
                {isCreatingLobby ? 'CREATING...' : 'MULTIPLAYER'}
              </button>
            </div>
          </div>

          <div className="relative">
            <img
              src="/assets/generated/hero-terminal.dim_1600x900.png"
              alt="Terminal Interface"
              className="w-full terminal-border shadow-glow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="terminal-border bg-card p-6 space-y-3">
          <Terminal className="w-10 h-10 text-primary terminal-glow" />
          <h3 className="text-xl font-bold terminal-text text-primary">
            TERMINAL_CHALLENGES
          </h3>
          <p className="text-muted-foreground terminal-text text-sm">
            Solve port scanning, code breaking, and command puzzles in a retro terminal interface.
          </p>
        </div>

        <div className="terminal-border bg-card p-6 space-y-3">
          <Users className="w-10 h-10 text-secondary terminal-glow" />
          <h3 className="text-xl font-bold terminal-text text-secondary">
            MULTIPLAYER_MODES
          </h3>
          <p className="text-muted-foreground terminal-text text-sm">
            Compete head-to-head or cooperate with teammates in real-time lobby-based matches.
          </p>
        </div>

        <div className="terminal-border bg-card p-6 space-y-3">
          <Trophy className="w-10 h-10 text-accent terminal-glow" />
          <h3 className="text-xl font-bold terminal-text text-accent">
            GLOBAL_LEADERBOARD
          </h3>
          <p className="text-muted-foreground terminal-text text-sm">
            Track your progress and compete for the top spot on the global rankings.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="terminal-border bg-card/50 p-6">
        <p className="text-center text-muted-foreground terminal-text text-sm">
          <span className="text-primary">{'>'} DISCLAIMER:</span> This is a simulated game environment. 
          No real hacking, network intrusion, or unauthorized access occurs. All challenges are fictional puzzles 
          designed for entertainment and education.
        </p>
      </section>
    </div>
  );
}
