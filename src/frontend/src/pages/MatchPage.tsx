import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetLobby, useProcessCommand } from '../hooks/useQueries';
import TerminalPanel from '../components/game/TerminalPanel';
import Scoreboard from '../components/game/Scoreboard';
import RoundTimer from '../components/game/RoundTimer';
import { Loader2 } from 'lucide-react';

export default function MatchPage() {
  const navigate = useNavigate();
  const params = useParams({ from: '/match/$lobbyId' });
  const lobbyId = BigInt(params.lobbyId);
  
  const { data: lobby, refetch: refetchLobby } = useGetLobby(lobbyId);
  const processCommand = useProcessCommand();
  
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchLobby();
    }, 1000);
    return () => clearInterval(interval);
  }, [refetchLobby]);

  useEffect(() => {
    if (lobby && !lobby.isActive && hasCompleted) {
      navigate({ to: '/results', search: { lobbyId: lobby.id.toString() } });
    }
  }, [lobby?.isActive, lobby?.id, hasCompleted, navigate]);

  const handleCommandProcess = async (command: string) => {
    try {
      const result = await processCommand.mutateAsync({ lobbyId, command });
      
      if (result.solved) {
        setHasCompleted(true);
        await refetchLobby();
      }
      
      return result;
    } catch (error) {
      console.error('Failed to process command:', error);
      return {
        lines: [{ type: 'error', text: 'Command processing failed. Please try again.' }],
        solved: false,
      };
    }
  };

  if (!lobby || !lobby.currentChallenge) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto terminal-glow" />
          <p className="text-primary terminal-text">LOADING_MATCH...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <RoundTimer startTime={Date.now()} duration={120} />
        <Scoreboard lobby={lobby} />
        <div className="terminal-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground terminal-text mb-1">MODE</p>
          <p className="text-lg font-bold text-secondary terminal-text">
            {lobby.mode.toUpperCase()}
          </p>
        </div>
      </div>

      <TerminalPanel
        challenge={lobby.currentChallenge}
        onCommandProcess={handleCommandProcess}
        isProcessing={processCommand.isPending}
        disabled={hasCompleted}
      />

      {hasCompleted && (
        <div className="terminal-border bg-card/50 p-4 text-center">
          <p className="text-primary terminal-glow terminal-text text-sm font-bold">
            ✓ Challenge completed! Waiting for other players...
          </p>
        </div>
      )}
    </div>
  );
}
