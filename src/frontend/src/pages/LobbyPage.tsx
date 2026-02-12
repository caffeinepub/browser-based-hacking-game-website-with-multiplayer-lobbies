import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useLeaveLobby, useStartMatch, useGetLobby } from '../hooks/useQueries';
import { useLobbyAutoJoin } from '../hooks/useLobbyAutoJoin';
import { GameMode } from '../backend';
import { Users, Play, Copy, Check, ArrowLeft, Loader2, AlertCircle, X, LogIn } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '../components/ui/button';
import { parseIcErrorToMessage } from '../utils/parseIcError';

export default function LobbyPage() {
  const navigate = useNavigate();
  const params = useParams({ from: '/lobby/$lobbyId' });
  const { identity } = useInternetIdentity();
  
  const leaveLobby = useLeaveLobby();
  const startMatch = useStartMatch();
  
  const [lobbyId, setLobbyId] = useState<bigint | null>(null);
  const [copied, setCopied] = useState(false);
  const [startMatchError, setStartMatchError] = useState<string>('');
  const [leaveError, setLeaveError] = useState<string>('');
  
  const { data: lobby, refetch: refetchLobby, isLoading: lobbyLoading } = useGetLobby(lobbyId);
  
  // Auto-join hook for multiplayer lobbies
  const {
    needsJoin,
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
    const id = BigInt(params.lobbyId);
    setLobbyId(id);
  }, [params.lobbyId]);

  useEffect(() => {
    if (lobby?.isActive) {
      navigate({ to: '/match/$lobbyId', params: { lobbyId: lobby.id.toString() } });
    }
  }, [lobby?.isActive, lobby?.id, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lobbyId) {
      interval = setInterval(() => {
        refetchLobby();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [lobbyId, refetchLobby]);

  const handleStartMatch = async () => {
    if (!lobbyId) return;
    
    setStartMatchError('');
    
    try {
      await startMatch.mutateAsync(lobbyId);
      await refetchLobby();
    } catch (error) {
      console.error('Failed to start match:', error);
      setStartMatchError(parseIcErrorToMessage(error));
    }
  };

  const handleLeaveLobby = async () => {
    if (!lobbyId) return;
    
    setLeaveError('');
    
    try {
      await leaveLobby.mutateAsync(lobbyId);
      navigate({ to: '/' });
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      setLeaveError(parseIcErrorToMessage(error));
    }
  };

  const handleRetryJoin = async () => {
    clearJoinError();
    await retryJoin();
    await refetchLobby();
  };

  const copyLobbyCode = () => {
    if (lobbyId) {
      navigator.clipboard.writeText(lobbyId.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = lobby && identity && lobby.host.toString() === identity.getPrincipal().toString();
  const isMultiplayer = lobby?.mode === GameMode.cooperative || lobby?.mode === GameMode.competitive;
  const currentPrincipal = identity?.getPrincipal().toString();
  const isMember = lobby && currentPrincipal 
    ? lobby.players.some(p => p.toString() === currentPrincipal)
    : false;

  if (!lobby) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto terminal-glow" />
          <p className="text-primary terminal-text">LOADING_LOBBY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors terminal-text"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK_TO_MENU
        </button>
      </div>

      <div className="terminal-border bg-card p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary terminal-glow" />
            <div>
              <h1 className="text-3xl font-bold text-primary terminal-text">LOBBY</h1>
              <p className="text-sm text-muted-foreground terminal-text">
                {lobby.mode.toUpperCase()} MODE
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="terminal-border bg-background px-4 py-2">
              <p className="text-xs text-muted-foreground terminal-text">LOBBY_CODE</p>
              <p className="text-lg font-bold text-primary terminal-text font-mono">
                {lobbyId?.toString()}
              </p>
            </div>
            <button
              onClick={copyLobbyCode}
              className="terminal-border bg-secondary hover:bg-secondary/80 p-2 transition-colors"
              title="Copy lobby code"
            >
              {copied ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <Copy className="w-5 h-5 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Multiplayer Join Section */}
        {isMultiplayer && !isMember && (
          <div className="terminal-border bg-secondary/20 p-4 space-y-3">
            {!isAuthenticated ? (
              <div className="flex items-start gap-3">
                <LogIn className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-bold text-primary terminal-text">LOGIN_REQUIRED</p>
                  <p className="text-sm text-muted-foreground terminal-text">
                    You must be logged in to join multiplayer lobbies. Please log in to continue.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-primary terminal-text">
                      {isJoining ? 'JOINING_LOBBY...' : 'NOT_IN_LOBBY'}
                    </p>
                    <p className="text-sm text-muted-foreground terminal-text">
                      {isJoining 
                        ? 'Attempting to join the lobby...'
                        : 'You are not a member of this lobby yet.'}
                    </p>
                  </div>
                </div>
                
                {!isJoining && (
                  <Button
                    onClick={handleRetryJoin}
                    disabled={isJoining}
                    className="w-full terminal-border bg-primary hover:bg-primary/90 terminal-text font-bold"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {needsJoin ? 'JOIN_LOBBY' : 'RETRY_JOIN'}
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

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-primary terminal-text">PLAYERS</h2>
          <div className="space-y-2">
            {lobby.players.map((player, index) => (
              <div
                key={player.toString()}
                className="terminal-border bg-background p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center terminal-border">
                    <span className="text-primary font-bold terminal-text">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">
                      {player.toString().slice(0, 8)}...
                    </p>
                  </div>
                </div>
                {player.toString() === lobby.host.toString() && (
                  <span className="terminal-border bg-secondary px-2 py-1 text-xs font-bold text-primary terminal-text">
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Match Error Panel */}
        {startMatchError && (
          <div className="terminal-border bg-destructive/10 border-destructive p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-destructive terminal-text">START_MATCH_FAILED</p>
                  <p className="text-sm text-muted-foreground terminal-text">
                    {startMatchError}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStartMatchError('')}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Leave Lobby Error Panel */}
        {leaveError && (
          <div className="terminal-border bg-destructive/10 border-destructive p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-destructive terminal-text">LEAVE_FAILED</p>
                  <p className="text-sm text-muted-foreground terminal-text">
                    {leaveError}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLeaveError('')}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {isHost && (
            <Button
              onClick={handleStartMatch}
              disabled={startMatch.isPending || lobby.players.length === 0}
              className="flex-1 terminal-border bg-primary hover:bg-primary/90 terminal-text font-bold"
            >
              <Play className="w-4 h-4 mr-2" />
              {startMatch.isPending ? 'STARTING...' : 'START_MATCH'}
            </Button>
          )}
          <Button
            onClick={handleLeaveLobby}
            disabled={leaveLobby.isPending}
            variant="outline"
            className="terminal-border terminal-text font-bold"
          >
            {leaveLobby.isPending ? 'LEAVING...' : 'LEAVE_LOBBY'}
          </Button>
        </div>
      </div>
    </div>
  );
}
