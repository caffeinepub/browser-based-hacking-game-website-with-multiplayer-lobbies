import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateLobby, useStartMatch, useGetLobby, useProcessCommand } from '../hooks/useQueries';
import { useActorReady } from '../hooks/useActorReady';
import { useActor } from '../hooks/useActor';
import { GameMode, type Challenge } from '../backend';
import TerminalPanel from '../components/game/TerminalPanel';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { parseIcErrorToMessage } from '../utils/parseIcError';
import { useQueryClient } from '@tanstack/react-query';
import { unwrapCandidOptional } from '../utils/unwrapCandidOptional';

type InitState = 'idle' | 'initializing' | 'ready' | 'error';

const MAX_POLL_ATTEMPTS = 10;
const POLL_DELAY_MS = 500;

export default function SoloGamePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isActorReady } = useActorReady();
  const { actor } = useActor();
  const createLobby = useCreateLobby();
  const startMatch = useStartMatch();
  const processCommand = useProcessCommand();
  
  const [initState, setInitState] = useState<InitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lobbyId, setLobbyId] = useState<bigint | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [commandCount, setCommandCount] = useState(0);
  
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);
  const isInitializingRef = useRef(false);
  
  const { data: lobby, refetch: refetchLobby } = useGetLobby(lobbyId);

  // Clear any polling timers on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  const pollLobbyUntilReady = async (targetLobbyId: bigint): Promise<boolean> => {
    pollAttemptsRef.current = 0;
    
    const poll = async (): Promise<boolean> => {
      try {
        if (!actor) {
          throw new Error('Actor not available');
        }
        
        // Force a fresh fetch using the exact lobbyId
        const result = await queryClient.fetchQuery({
          queryKey: ['lobby', targetLobbyId.toString()],
          queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getLobby(targetLobbyId);
          },
          staleTime: 0,
        });
        
        // Unwrap the Candid optional to check if challenge is present
        const challenge = unwrapCandidOptional<Challenge>(result?.currentChallenge as any);
        
        if (result && challenge !== null) {
          // Success! Lobby has the challenge
          return true;
        }
        
        pollAttemptsRef.current++;
        
        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          // Exceeded max attempts
          return false;
        }
        
        // Wait and try again
        await new Promise(resolve => {
          pollingTimeoutRef.current = setTimeout(resolve, POLL_DELAY_MS);
        });
        
        return poll();
      } catch (error) {
        console.error('Polling error:', error);
        pollAttemptsRef.current++;
        
        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          return false;
        }
        
        // Wait and try again even on error
        await new Promise(resolve => {
          pollingTimeoutRef.current = setTimeout(resolve, POLL_DELAY_MS);
        });
        
        return poll();
      }
    };
    
    return poll();
  };

  const initSoloGame = async () => {
    if (!isActorReady || !actor || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    setInitState('initializing');
    setErrorMessage('');
    pollAttemptsRef.current = 0;
    
    try {
      // Step 1: Create lobby
      const newLobbyId = await createLobby.mutateAsync(GameMode.solo);
      setLobbyId(newLobbyId);
      
      // Step 2: Start match
      try {
        await startMatch.mutateAsync(newLobbyId);
      } catch (startError) {
        console.error('Failed to start match:', startError);
        setErrorMessage(parseIcErrorToMessage(startError));
        setInitState('error');
        isInitializingRef.current = false;
        return;
      }
      
      // Step 3: Poll until lobby has currentChallenge
      const success = await pollLobbyUntilReady(newLobbyId);
      
      if (!success) {
        setErrorMessage(
          'Failed to load the challenge after starting the match. The game server may be slow or experiencing issues. Please try again.'
        );
        setInitState('error');
        isInitializingRef.current = false;
        return;
      }
      
      // Final refetch to update the UI hook
      await refetchLobby();
      setInitState('ready');
      isInitializingRef.current = false;
    } catch (error) {
      console.error('Failed to initialize solo game:', error);
      setErrorMessage(parseIcErrorToMessage(error));
      setInitState('error');
      isInitializingRef.current = false;
    }
  };

  useEffect(() => {
    if (isActorReady && actor && initState === 'idle') {
      initSoloGame();
    }
  }, [isActorReady, actor, initState]);

  const handleRetry = () => {
    // Clear any in-flight polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    
    // Reset all state
    setInitState('idle');
    setErrorMessage('');
    setLobbyId(null);
    setScore(0);
    setAttempts(0);
    setCommandCount(0);
    pollAttemptsRef.current = 0;
    isInitializingRef.current = false;
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
      
      // Return error as terminal output with clear English message
      const errorMessage = parseIcErrorToMessage(error);
      return {
        lines: [{ type: 'error', text: errorMessage }],
        solved: false,
      };
    }
  };

  // Unwrap the Candid optional challenge with proper type assertion
  const challenge = unwrapCandidOptional<Challenge>(lobby?.currentChallenge as any);

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

  // Loading state - check if challenge is actually present
  if (initState === 'initializing' || !lobby || challenge === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto terminal-glow" />
          <p className="text-primary terminal-text">INITIALIZING_SOLO_MODE...</p>
        </div>
      </div>
    );
  }

  // Ready state - game is active (challenge is guaranteed non-null here)
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
        challenge={challenge}
        onCommandProcess={handleCommandProcess}
        isProcessing={processCommand.isPending}
      />
    </div>
  );
}
