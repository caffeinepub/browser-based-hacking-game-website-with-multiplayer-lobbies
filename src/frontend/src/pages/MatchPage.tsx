import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetLobby, useProcessCommand } from '../hooks/useQueries';
import { useLobbyAutoJoin } from '../hooks/useLobbyAutoJoin';
import TerminalPanel from '../components/game/TerminalPanel';
import Scoreboard from '../components/game/Scoreboard';
import RoundTimer from '../components/game/RoundTimer';
import { Loader2, AlertCircle, X, LogIn } from 'lucide-react';
import { parseIcErrorToMessage } from '../utils/parseIcError';
import { unwrapCandidOptional } from '../utils/unwrapCandidOptional';
import { Button } from '../components/ui/button';
import type { Challenge, GameMode } from '../backend';

export default function MatchPage() {
  const navigate = useNavigate();
  const params = useParams({ from: '/match/$lobbyId' });
  const lobbyId = BigInt(params.lobbyId);
  
  const { data: lobby, refetch: refetchLobby, isLoading: lobbyLoading } = useGetLobby(lobbyId);
  const processCommand = useProcessCommand();
  
  const [hasCompleted, setHasCompleted] = useState(false);
  const [commandError, setCommandError] = useState<string>('');

  // Auto-join hook for multiplayer lobbies
  const {
    canProcessCommands,
    isJoining,
    joinError,
    isAuthenticated,
    retryJoin,
    clearError: clearJoinError,
  } = useLobbyAutoJoin({
    lobbyId,
    lobby,
    lobbyLoading,
  });

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
    // Prevent command processing if user is not a member
    if (!canProcessCommands) {
      const errorMsg = 'You must join the lobby before sending commands.';
      setCommandError(errorMsg);
      return {
        lines: [{ type: 'error', text: errorMsg }],
        solved: false,
      };
    }

    setCommandError('');
    
    try {
      const result = await processCommand.mutateAsync({ lobbyId, command });
      
      if (result.solved) {
        setHasCompleted(true);
        await refetchLobby();
      }
      
      return result;
    } catch (error) {
      console.error('Failed to process command:', error);
      const errorMsg = parseIcErrorToMessage(error);
      setCommandError(errorMsg);
      
      // Return error as terminal output for immediate feedback
      return {
        lines: [{ type: 'error', text: errorMsg }],
        solved: false,
      };
    }
  };

  const handleRetryJoin = async () => {
    clearJoinError();
    await retryJoin();
    await refetchLobby();
  };

  // Unwrap the Candid optional challenge with proper type assertion
  const challenge = unwrapCandidOptional<Challenge>(lobby?.currentChallenge as any);

  const isMultiplayer = lobby?.mode === ('cooperative' as GameMode) || lobby?.mode === ('competitive' as GameMode);

  if (!lobby || challenge === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto terminal-glow" />
          <p className="text-primary terminal-text">LOADING_MATCH...</p>
        </div>
      </div>
    );
  }

  // Show join requirement for multiplayer matches
  const showJoinRequired = isMultiplayer && !canProcessCommands;

  // At this point, challenge is guaranteed to be non-null
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

      {/* Join Required Panel */}
      {showJoinRequired && (
        <div className="terminal-border bg-secondary/20 p-4 space-y-3">
          {!isAuthenticated ? (
            <div className="flex items-start gap-3">
              <LogIn className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-bold text-primary terminal-text">LOGIN_REQUIRED</p>
                <p className="text-sm text-muted-foreground terminal-text">
                  You must be logged in to participate in multiplayer matches. Please log in to continue.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-bold text-primary terminal-text">
                    {isJoining ? 'JOINING_MATCH...' : 'LOBBY_MEMBERSHIP_REQUIRED'}
                  </p>
                  <p className="text-sm text-muted-foreground terminal-text">
                    {isJoining 
                      ? 'Attempting to join the lobby...'
                      : 'You must be a member of this lobby to send commands. Please join the lobby first.'}
                  </p>
                </div>
              </div>
              
              {!isJoining && (
                <Button
                  onClick={handleRetryJoin}
                  disabled={isJoining}
                  className="w-full terminal-border bg-primary hover:bg-primary/90 terminal-text font-bold"
                >
                  JOIN_LOBBY
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Join Error Panel */}
      {joinError && (
        <div className="terminal-border bg-destructive/10 border-destructive p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive terminal-text">JOIN_FAILED</p>
                <p className="text-sm text-muted-foreground terminal-text">
                  {joinError}
                </p>
              </div>
            </div>
            <button
              onClick={clearJoinError}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Command Error Panel */}
      {commandError && (
        <div className="terminal-border bg-destructive/10 border-destructive p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive terminal-text">COMMAND_ERROR</p>
                <p className="text-sm text-muted-foreground terminal-text">
                  {commandError}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCommandError('')}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <TerminalPanel
        challenge={challenge}
        onCommandProcess={handleCommandProcess}
        isProcessing={processCommand.isPending}
        disabled={hasCompleted || !canProcessCommands}
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
