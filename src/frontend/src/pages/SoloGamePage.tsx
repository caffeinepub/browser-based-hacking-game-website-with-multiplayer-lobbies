import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateLobby, useStartMatch, useGetLobby, useProcessCommand } from '../hooks/useQueries';
import { useActorReady } from '../hooks/useActorReady';
import { GameMode } from '../backend';
import TerminalPanel from '../components/game/TerminalPanel';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

type InitState = 'idle' | 'initializing' | 'ready' | 'error';

function parseBackendError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Extract trap messages from canister errors
    if (message.includes('Unauthorized')) {
      return 'Authorization failed. Please ensure you are logged in.';
    }
    if (message.includes('Lobby not found')) {
      return 'Lobby could not be found. Please try again.';
    }
    if (message.includes('Only the host can start')) {
      return 'Only the lobby host can start the match.';
    }
    if (message.includes('Match is already active')) {
      return 'This match is already in progress.';
    }
    if (message.includes('Actor not available')) {
      return 'Backend connection not ready. Please wait and try again.';
    }
    
    // Return the original message if it's already user-friendly
    return message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

export default function SoloGamePage() {
  const navigate = useNavigate();
  const { isActorReady } = useActorReady();
  const createLobby = useCreateLobby();
  const startMatch = useStartMatch();
  const processCommand = useProcessCommand();
  
  const [initState, setInitState] = useState<InitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lobbyId, setLobbyId] = useState<bigint | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [commandCount, setCommandCount] = useState(0);
  
  const { data: lobby, refetch: refetchLobby } = useGetLobby(lobbyId);

  const initSoloGame = async () => {
    if (!isActorReady) return;
    
    setInitState('initializing');
    setErrorMessage('');
    
    try {
      const newLobbyId = await createLobby.mutateAsync(GameMode.solo);
      setLobbyId(newLobbyId);
      
      try {
        await startMatch.mutateAsync(newLobbyId);
      } catch (startError) {
        console.error('Failed to start match:', startError);
        setErrorMessage(parseBackendError(startError));
        setInitState('error');
        return;
      }
      
      await refetchLobby();
      setInitState('ready');
    } catch (error) {
      console.error('Failed to initialize solo game:', error);
      setErrorMessage(parseBackendError(error));
      setInitState('error');
    }
  };

  useEffect(() => {
    if (isActorReady && initState === 'idle') {
      initSoloGame();
    }
  }, [isActorReady, initState]);

  const handleRetry = () => {
    setInitState('idle');
    setLobbyId(null);
    setScore(0);
    setAttempts(0);
    setCommandCount(0);
  };

  const handleCommandProcess = async (command: string) => {
    if (!lobbyId) {
      return {
        lines: [{ type: 'error', text: 'Lobby not initialized.' }],
        solved: false,
      };
    }

    setCommandCount(prev => prev + 1);
    
    try {
      const result = await processCommand.mutateAsync({ lobbyId, command });
      
      if (result.solved) {
        // Calculate score based on efficiency
        const baseScore = 100;
        const efficiencyBonus = Math.max(0, 50 - (commandCount * 5));
        const newScore = score + baseScore + efficiencyBonus;
        setScore(newScore);
        
        setTimeout(() => {
          navigate({ to: '/results', search: { score: newScore, mode: 'solo' } });
        }, 2000);
      }
      
      await refetchLobby();
      return result;
    } catch (error) {
      console.error('Failed to process command:', error);
      setAttempts(prev => prev + 1);
      return {
        lines: [{ type: 'error', text: 'Command processing failed. Please try again.' }],
        solved: false,
      };
    }
  };

  // Error state
  if (initState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="terminal-border bg-card p-8 max-w-md space-y-6 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary terminal-text">INITIALIZATION_FAILED</h2>
            <p className="text-muted-foreground terminal-text text-sm">
              {errorMessage}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleRetry}
              className="terminal-border bg-primary hover:bg-primary/90 terminal-text font-bold"
            >
              RETRY
            </Button>
            <Button
              onClick={() => navigate({ to: '/' })}
              variant="outline"
              className="terminal-border terminal-text font-bold"
            >
              BACK_TO_MENU
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (initState === 'initializing' || !lobby || !lobby.currentChallenge) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto terminal-glow" />
          <p className="text-primary terminal-text">INITIALIZING_SOLO_MODE...</p>
        </div>
      </div>
    );
  }

  // Ready state - game is active
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors terminal-text"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK_TO_MENU
        </button>

        <div className="flex gap-6 terminal-text">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">SCORE</p>
            <p className="text-2xl font-bold text-primary terminal-glow">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">COMMANDS</p>
            <p className="text-2xl font-bold text-secondary">{commandCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">ERRORS</p>
            <p className="text-2xl font-bold text-destructive">{attempts}</p>
          </div>
        </div>
      </div>

      <TerminalPanel
        challenge={lobby.currentChallenge}
        onCommandProcess={handleCommandProcess}
        isProcessing={processCommand.isPending}
      />
    </div>
  );
}
