import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCreateLobby, useJoinLobby, useLeaveLobby, useStartMatch, useGetLobby } from '../hooks/useQueries';
import { GameMode } from '../backend';
import { Users, Play, Copy, Check, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '../components/ui/button';

function parseBackendError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Extract trap messages from canister errors
    if (message.includes('Unauthorized')) {
      return 'Authorization failed. Only the host can start the match.';
    }
    if (message.includes('Lobby not found')) {
      return 'Lobby could not be found.';
    }
    if (message.includes('Only the host can start')) {
      return 'Only the lobby host can start the match.';
    }
    if (message.includes('Match is already active')) {
      return 'This match is already in progress.';
    }
    
    return message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const params = useParams({ from: '/lobby/$lobbyId' });
  const { identity } = useInternetIdentity();
  
  const joinLobby = useJoinLobby();
  const leaveLobby = useLeaveLobby();
  const startMatch = useStartMatch();
  
  const [lobbyId, setLobbyId] = useState<bigint | null>(null);
  const [copied, setCopied] = useState(false);
  const [startMatchError, setStartMatchError] = useState<string>('');
  
  const { data: lobby, refetch: refetchLobby } = useGetLobby(lobbyId);

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
      setStartMatchError(parseBackendError(error));
    }
  };

  const handleLeaveLobby = async () => {
    if (!lobbyId) return;
    
    try {
      await leaveLobby.mutateAsync(lobbyId);
      navigate({ to: '/' });
    } catch (error) {
      console.error('Failed to leave lobby:', error);
    }
  };

  const copyLobbyCode = () => {
    if (lobbyId) {
      navigator.clipboard.writeText(lobbyId.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = lobby && identity && lobby.host.toString() === identity.getPrincipal().toString();

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

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-primary terminal-text">PLAYERS</h2>
          <div className="space-y-2">
            {lobby.players.map((player, index) => (
              <div
                key={player.toString()}
                className="terminal-border bg-background p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold terminal-text">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-foreground terminal-text font-mono text-sm">
                    {player.toString().slice(0, 20)}...
                  </span>
                </div>
                {player.toString() === lobby.host.toString() && (
                  <span className="terminal-border bg-secondary px-3 py-1 text-xs font-bold text-primary terminal-text">
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {startMatchError && (
          <div className="terminal-border bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive terminal-text font-bold">
                START_MATCH_FAILED
              </p>
              <p className="text-xs text-destructive/80 terminal-text mt-1">
                {startMatchError}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {isHost ? (
            <Button
              onClick={handleStartMatch}
              disabled={startMatch.isPending || lobby.players.length === 0}
              className="flex-1 terminal-border bg-primary hover:bg-primary/90 terminal-text font-bold"
            >
              {startMatch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  STARTING...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  START_MATCH
                </>
              )}
            </Button>
          ) : (
            <div className="flex-1 terminal-border bg-muted p-4 text-center">
              <p className="text-muted-foreground terminal-text text-sm">
                WAITING_FOR_HOST_TO_START...
              </p>
            </div>
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
