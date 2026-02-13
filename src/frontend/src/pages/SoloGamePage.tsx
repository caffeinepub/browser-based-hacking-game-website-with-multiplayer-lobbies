import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateLobby, useStartMatchAndGetLobby, useProcessCommand } from '../hooks/useQueries';
import { useActorReady } from '../hooks/useActorReady';
import { useActor } from '../hooks/useActor';
import { GameMode, type Challenge, type LobbyView } from '../backend';
import TerminalPanel from '../components/game/TerminalPanel';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { parseIcErrorToMessage } from '../utils/parseIcError';
import { useQueryClient } from '@tanstack/react-query';
import { unwrapCandidOptional } from '../utils/unwrapCandidOptional';
import { 
  getPhaseMessage, 
  formatElapsedTime,
  hasExceededTimeout, 
  SOLO_INIT_TIMEOUT_MS,
  type InitPhase 
} from '../utils/soloInitProgress';
import { 
  isLobbyReady, 
  getRetryDelay, 
  DEFAULT_RETRY_CONFIG,
  createCancellableDelay 
} from '../utils/soloReadiness';

type InitState = 'idle' | 'initializing' | 'ready' | 'error';

export default function SoloGamePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isActorReady } = useActorReady();
  const { actor } = useActor();
  const createLobby = useCreateLobby();
  const startMatchAndGetLobby = useStartMatchAndGetLobby();
  const processCommand = useProcessCommand();
  
  const [initState, setInitState] = useState<InitState>('idle');
  const [initPhase, setInitPhase] = useState<InitPhase>('creating');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lobbyId, setLobbyId] = useState<bigint | null>(null);
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [commandCount, setCommandCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  
  const initStartTimeRef = useRef<number>(0);
  const initAttemptTokenRef = useRef(0);
  const cancelDelayRef = useRef<(() => void) | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending delays and timers on unmount
  useEffect(() => {
    return () => {
      if (cancelDelayRef.current) {
        cancelDelayRef.current();
        cancelDelayRef.current = null;
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, []);

  // Elapsed time tracker during initialization
  useEffect(() => {
    if (initState === 'initializing') {
      // Start the elapsed time timer
      elapsedTimerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - initStartTimeRef.current);
      }, 100);
    } else {
      // Stop and clear the timer when not initializing
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setElapsedMs(0);
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [initState]);

  /**
   * Resilient polling for lobby readiness with bounded retries and tighter early backoff.
   * Only used as fallback when startMatchAndGetLobby doesn't return a ready lobby.
   */
  const pollLobbyUntilReady = async (
    targetLobbyId: bigint, 
    attemptToken: number
  ): Promise<LobbyView | null> => {
    let attemptNumber = 0;
    
    while (attemptNumber < DEFAULT_RETRY_CONFIG.maxAttempts) {
      // Check if this attempt is still valid
      if (initAttemptTokenRef.current !== attemptToken) {
        return null;
      }
      
      // Check overall timeout before each attempt
      if (hasExceededTimeout(initStartTimeRef.current)) {
        return null;
      }
      
      try {
        if (!actor) {
          throw new Error('Actor not available');
        }
        
        // Fetch fresh lobby state and unwrap Candid optional
        const rawResult = await actor.getLobby(targetLobbyId);
        const result = unwrapCandidOptional<LobbyView>(rawResult as any);
        
        // Check if ready
        if (isLobbyReady(result)) {
          return result;
        }
        
        // Not ready yet, wait before next attempt
        if (attemptNumber >= DEFAULT_RETRY_CONFIG.maxAttempts - 1) {
          // Exceeded max attempts
          return null;
        }
        
        // Calculate delay with exponential backoff (attempt 0 gets initialDelayMs)
        const delay = getRetryDelay(attemptNumber);
        const { promise, cancel } = createCancellableDelay(delay);
        cancelDelayRef.current = cancel;
        
        await promise;
        cancelDelayRef.current = null;
        
        attemptNumber++;
        
      } catch (error) {
        console.error('Polling error:', error);
        
        if (attemptNumber >= DEFAULT_RETRY_CONFIG.maxAttempts - 1) {
          return null;
        }
        
        // Wait before retry even on error
        const delay = getRetryDelay(attemptNumber);
        const { promise, cancel } = createCancellableDelay(delay);
        cancelDelayRef.current = cancel;
        
        await promise;
        cancelDelayRef.current = null;
        
        attemptNumber++;
      }
    }
    
    return null;
  };

  const initSoloGame = async () => {
    if (!isActorReady || !actor) return;
    
    // Increment the attempt token to invalidate any in-flight operations
    initAttemptTokenRef.current++;
    const currentAttemptToken = initAttemptTokenRef.current;
    
    // Clear any pending delays
    if (cancelDelayRef.current) {
      cancelDelayRef.current();
      cancelDelayRef.current = null;
    }
    
    // Start initialization timer
    initStartTimeRef.current = Date.now();
    
    setInitState('initializing');
    setInitPhase('creating');
    setErrorMessage('');
    
    try {
      // Step 1: Create lobby
      setInitPhase('creating');
      let newLobbyId: bigint;
      
      try {
        newLobbyId = await createLobby.mutateAsync(GameMode.solo);
        
        // Check if this attempt is still valid
        if (initAttemptTokenRef.current !== currentAttemptToken) {
          return;
        }
        
        // Check overall timeout
        if (hasExceededTimeout(initStartTimeRef.current)) {
          setErrorMessage(
            'Game initialization is taking longer than expected. The server may be slow or experiencing issues. Please try again.'
          );
          setInitState('error');
          return;
        }
        
        setLobbyId(newLobbyId);
      } catch (createError) {
        console.error('Failed to create lobby:', createError);
        
        // Check if this attempt is still valid
        if (initAttemptTokenRef.current !== currentAttemptToken) {
          return;
        }
        
        const parsedError = parseIcErrorToMessage(createError);
        setErrorMessage(parsedError);
        setInitState('error');
        return;
      }
      
      // Step 2: Start match and get lobby in one call (cache is hydrated automatically)
      setInitPhase('starting');
      
      try {
        const lobbyView = await startMatchAndGetLobby.mutateAsync(newLobbyId);
        
        // Check if this attempt is still valid
        if (initAttemptTokenRef.current !== currentAttemptToken) {
          return;
        }
        
        // Check overall timeout
        if (hasExceededTimeout(initStartTimeRef.current)) {
          setErrorMessage(
            'Game initialization is taking longer than expected. The server may be slow or experiencing issues. Please try again.'
          );
          setInitState('error');
          return;
        }
        
        // Check if already ready (fast path - no polling needed)
        if (isLobbyReady(lobbyView)) {
          // Success! Ready immediately
          setLobby(lobbyView);
          setInitState('ready');
          return;
        }
        
        // Not ready immediately, use resilient polling as fallback
        setInitPhase('loading');
        
        const readyLobby = await pollLobbyUntilReady(newLobbyId, currentAttemptToken);
        
        // Check if this attempt is still valid
        if (initAttemptTokenRef.current !== currentAttemptToken) {
          return;
        }
        
        if (!readyLobby) {
          // Check if we exceeded overall timeout
          if (hasExceededTimeout(initStartTimeRef.current)) {
            setErrorMessage(
              'Game initialization is taking longer than expected. The server may be slow or experiencing issues. Please try again.'
            );
          } else {
            setErrorMessage(
              'Failed to load the challenge after starting the match. Please try again.'
            );
          }
          setInitState('error');
          return;
        }
        
        // Success - lobby is ready
        setLobby(readyLobby);
        setInitState('ready');
        
      } catch (startError) {
        console.error('Failed to start match:', startError);
        
        // Check if this attempt is still valid
        if (initAttemptTokenRef.current !== currentAttemptToken) {
          return;
        }
        
        const parsedError = parseIcErrorToMessage(startError);
        setErrorMessage(parsedError);
        setInitState('error');
        return;
      }
    } catch (error) {
      console.error('Failed to initialize solo game:', error);
      
      // Check if this attempt is still valid
      if (initAttemptTokenRef.current !== currentAttemptToken) {
        return;
      }
      
      const parsedError = parseIcErrorToMessage(error);
      setErrorMessage(parsedError);
      setInitState('error');
    }
  };

  useEffect(() => {
    if (isActorReady && actor && initState === 'idle') {
      initSoloGame();
    }
  }, [isActorReady, actor, initState]);

  const handleRetry = () => {
    // Increment attempt token to cancel any in-flight operations
    initAttemptTokenRef.current++;
    
    // Clear any pending delays
    if (cancelDelayRef.current) {
      cancelDelayRef.current();
      cancelDelayRef.current = null;
    }
    
    // Clear elapsed timer
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    
    // Clear cached lobby data if we have a lobbyId
    if (lobbyId) {
      queryClient.removeQueries({ queryKey: ['lobby', lobbyId.toString()] });
    }
    
    // Cancel any pending mutations
    queryClient.cancelQueries({ queryKey: ['createLobby'] });
    queryClient.cancelQueries({ queryKey: ['startMatch'] });
    
    // Reset all state
    setInitState('idle');
    setInitPhase('creating');
    setErrorMessage('');
    setLobbyId(null);
    setLobby(null);
    setScore(0);
    setAttempts(0);
    setCommandCount(0);
    setElapsedMs(0);
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

  // Unwrap the Candid optional challenge
  const challenge = lobby ? unwrapCandidOptional<Challenge>(lobby.currentChallenge as any) : null;

  // Error state
  if (initState === 'error') {
    const displayError = errorMessage.trim() || 'An unexpected error occurred. Please try again.';
    
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="terminal-border bg-card p-8 max-w-lg space-y-6 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto terminal-glow" />
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-destructive terminal-text tracking-wider">
              INITIALIZATION_FAILED
            </h2>
            <div className="terminal-border bg-destructive/10 p-4 rounded">
              <p className="text-xs text-muted-foreground terminal-text mb-2 uppercase tracking-wide">
                Reason:
              </p>
              <p className="text-sm text-foreground terminal-text font-mono">
                {displayError}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleRetry}
              variant="default"
              className="terminal-glow"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              onClick={() => navigate({ to: '/' })}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </div>
          <p className="text-xs text-muted-foreground terminal-text italic">
            This is a simulation. No real systems were harmed.
          </p>
        </div>
      </div>
    );
  }

  // Loading state with elapsed time display
  if (initState === 'initializing') {
    const phaseMessage = getPhaseMessage(initPhase);
    const elapsedText = formatElapsedTime(elapsedMs);
    
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="terminal-border bg-card p-8 max-w-md space-y-6 text-center">
          <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin terminal-glow" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary terminal-text tracking-wider">
              INITIALIZING_SOLO_MODE
            </h2>
            <p className="text-sm text-muted-foreground terminal-text">
              {phaseMessage}
            </p>
            <p className="text-xs text-muted-foreground/70 terminal-text">
              Elapsed: {elapsedText}
            </p>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full bg-primary terminal-glow animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-xs text-muted-foreground terminal-text italic">
            This is a simulation. No real systems were harmed.
          </p>
        </div>
      </div>
    );
  }

  // Ready state - show terminal
  if (initState === 'ready' && challenge) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={() => navigate({ to: '/' })}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <div className="flex gap-6 text-sm terminal-text">
            <div>
              <span className="text-muted-foreground">Score:</span>{' '}
              <span className="text-primary font-bold terminal-glow">{score}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Commands:</span>{' '}
              <span className="text-foreground font-bold">{commandCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Attempts:</span>{' '}
              <span className="text-foreground font-bold">{attempts}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="terminal-border bg-card p-6">
            <h2 className="text-xl font-bold text-primary terminal-text mb-2 terminal-glow">
              {challenge.name}
            </h2>
            <p className="text-sm text-muted-foreground terminal-text">
              {challenge.description}
            </p>
          </div>

          <TerminalPanel challenge={challenge} onCommandProcess={handleCommandProcess} />
        </div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
