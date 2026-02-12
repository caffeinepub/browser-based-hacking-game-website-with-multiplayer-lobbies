import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, GameMode, LobbyView, LeaderboardEntry, MatchResultView } from '../backend';
import { parseIcErrorToMessage } from '../utils/parseIcError';

// CommandOutput type matching the frontend terminal expectations
export interface CommandOutput {
  lines: Array<{ type: string; text: string }>;
  solved: boolean;
  context?: string;
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useCreateLobby() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (mode: GameMode) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createLobby(mode);
    },
  });
}

export function useJoinLobby() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (lobbyId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.joinLobby(lobbyId);
    },
  });
}

export function useLeaveLobby() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (lobbyId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.leaveLobby(lobbyId);
    },
  });
}

export function useStartMatch() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (lobbyId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.startMatch(lobbyId);
    },
  });
}

export function useStartMatchAndGetLobby() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (lobbyId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.startMatchAndGetLobby(lobbyId);
    },
  });
}

export function useGetLobby(lobbyId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LobbyView | null>({
    queryKey: ['lobby', lobbyId?.toString()],
    queryFn: async () => {
      if (!actor || !lobbyId) return null;
      return actor.getLobby(lobbyId);
    },
    enabled: !!actor && !actorFetching && !!lobbyId,
    staleTime: 0,
    refetchInterval: false,
    retry: 2,
  });
}

export function useProcessCommand() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ lobbyId, command }: { lobbyId: bigint; command: string }): Promise<CommandOutput> => {
      if (!actor) {
        throw new Error('Actor not available');
      }
      
      try {
        // Call the backend processTerminalCommand method
        const result = await actor.processTerminalCommand(lobbyId, command);
        
        // Transform backend TerminalOutput to frontend CommandOutput format
        return {
          lines: result.lines.map(line => ({
            type: inferLineType(line),
            text: line,
          })),
          solved: result.solved,
          context: result.context || undefined,
        };
      } catch (error) {
        // Convert backend errors to user-friendly messages
        const errorMessage = parseIcErrorToMessage(error);
        throw new Error(errorMessage);
      }
    },
  });
}

/**
 * Infers the line type from the text content for terminal styling.
 * Backend returns plain text lines; we classify them for UI presentation.
 */
function inferLineType(line: string): string {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.startsWith('error:') || lowerLine.includes('not found') || lowerLine.includes('unauthorized')) {
    return 'error';
  }
  if (lowerLine.startsWith('success:') || lowerLine.includes('complete') || lowerLine.includes('granted')) {
    return 'success';
  }
  if (lowerLine.startsWith('warning:')) {
    return 'warning';
  }
  
  return 'info';
}

export function useSubmitSolution() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ lobbyId, solution }: { lobbyId: bigint; solution: string }) => {
      if (!actor) throw new Error('Actor not available');
      // This would call a backend method when implemented
      return { success: true };
    },
  });
}

export function useGetLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetRecentMatches() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<MatchResultView[]>({
    queryKey: ['recentMatches'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentMatches();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetActiveLobbies() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LobbyView[]>({
    queryKey: ['activeLobbies'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveLobbies();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
  });
}
