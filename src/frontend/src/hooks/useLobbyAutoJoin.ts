import { useEffect, useRef, useState } from 'react';
import { useJoinLobby } from './useQueries';
import { useInternetIdentity } from './useInternetIdentity';
import { parseIcErrorToMessage } from '../utils/parseIcError';
import type { LobbyView, GameMode } from '../backend';

interface UseLobbyAutoJoinOptions {
  lobbyId: bigint | null;
  lobby: LobbyView | null | undefined;
  lobbyLoading: boolean;
}

interface UseLobbyAutoJoinResult {
  /** Whether the user needs to join (multiplayer lobby and not a member) */
  needsJoin: boolean;
  
  /** Whether an auto-join attempt is currently in progress */
  isJoining: boolean;
  
  /** Whether an auto-join attempt has been made for this lobby visit */
  hasAttempted: boolean;
  
  /** Error message from the last join attempt, if any */
  joinError: string;
  
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  
  /** Whether commands can be processed (user is a member or solo mode) */
  canProcessCommands: boolean;
  
  /** Manually retry joining the lobby */
  retryJoin: () => Promise<void>;
  
  /** Clear the join error */
  clearError: () => void;
}

/**
 * Hook that coordinates auto-joining multiplayer lobbies.
 * - Attempts to join once per lobbyId visit for cooperative/competitive lobbies
 * - Only joins when authenticated and not already a member
 * - Does not join solo lobbies
 * - Exposes state for UI to show join status and errors
 */
export function useLobbyAutoJoin({
  lobbyId,
  lobby,
  lobbyLoading,
}: UseLobbyAutoJoinOptions): UseLobbyAutoJoinResult {
  const { identity } = useInternetIdentity();
  const joinLobby = useJoinLobby();
  
  const [hasAttempted, setHasAttempted] = useState(false);
  const [joinError, setJoinError] = useState('');
  const attemptedLobbyRef = useRef<string | null>(null);
  
  const isAuthenticated = !!identity;
  const currentPrincipal = identity?.getPrincipal().toString();
  
  // Reset attempt tracking when lobbyId changes
  useEffect(() => {
    const lobbyIdStr = lobbyId?.toString() || null;
    if (attemptedLobbyRef.current !== lobbyIdStr) {
      attemptedLobbyRef.current = lobbyIdStr;
      setHasAttempted(false);
      setJoinError('');
    }
  }, [lobbyId]);
  
  // Determine if this is a multiplayer lobby
  const isMultiplayer = lobby?.mode === ('cooperative' as GameMode) || lobby?.mode === ('competitive' as GameMode);
  
  // Check if user is already a member
  const isMember = lobby && currentPrincipal 
    ? lobby.players.some(p => p.toString() === currentPrincipal)
    : false;
  
  // Determine if user needs to join
  const needsJoin = isMultiplayer && isAuthenticated && !isMember && !lobbyLoading;
  
  // Determine if commands can be processed
  const canProcessCommands = !lobby || lobby.mode === ('solo' as GameMode) || isMember;
  
  // Auto-join logic
  useEffect(() => {
    if (!needsJoin || hasAttempted || joinLobby.isPending || !lobbyId) {
      return;
    }
    
    // Perform auto-join
    const performJoin = async () => {
      setHasAttempted(true);
      setJoinError('');
      
      try {
        await joinLobby.mutateAsync(lobbyId);
      } catch (error) {
        console.error('Auto-join failed:', error);
        setJoinError(parseIcErrorToMessage(error));
      }
    };
    
    performJoin();
  }, [needsJoin, hasAttempted, joinLobby, lobbyId]);
  
  // Manual retry function
  const retryJoin = async () => {
    if (!lobbyId) return;
    
    setHasAttempted(true);
    setJoinError('');
    
    try {
      await joinLobby.mutateAsync(lobbyId);
    } catch (error) {
      console.error('Manual join failed:', error);
      setJoinError(parseIcErrorToMessage(error));
    }
  };
  
  const clearError = () => {
    setJoinError('');
  };
  
  return {
    needsJoin,
    isJoining: joinLobby.isPending,
    hasAttempted,
    joinError,
    isAuthenticated,
    canProcessCommands,
    retryJoin,
    clearError,
  };
}
