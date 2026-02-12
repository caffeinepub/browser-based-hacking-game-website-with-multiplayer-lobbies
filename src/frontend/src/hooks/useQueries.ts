import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, GameMode, LobbyView, LeaderboardEntry, MatchResultView } from '../backend';

// Local type definitions for command processing (until backend implements these)
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

export function useGetLobby(lobbyId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LobbyView | null>({
    queryKey: ['lobby', lobbyId?.toString()],
    queryFn: async () => {
      if (!actor || !lobbyId) return null;
      return actor.getLobby(lobbyId);
    },
    enabled: !!actor && !actorFetching && !!lobbyId,
    refetchInterval: false,
    retry: 1,
  });
}

export function useProcessCommand() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ lobbyId, command }: { lobbyId: bigint; command: string }): Promise<CommandOutput> => {
      if (!actor) throw new Error('Actor not available');
      
      // Check if backend has processCommand method
      const actorAny = actor as any;
      if (typeof actorAny.processCommand === 'function') {
        return actorAny.processCommand(lobbyId, command);
      }
      
      // Fallback simulation for development until backend implements processCommand
      return simulateCommandProcessing(command);
    },
  });
}

// Temporary simulation function until backend implements processCommand
function simulateCommandProcessing(command: string): CommandOutput {
  const cmd = command.trim().toLowerCase();
  const parts = cmd.split(' ');
  const baseCmd = parts[0];

  // Simulated command responses
  const responses: Record<string, () => CommandOutput> = {
    help: () => ({
      lines: [
        { type: 'info', text: 'Available commands:' },
        { type: 'info', text: '  scan <range>     - Scan network for open ports' },
        { type: 'info', text: '  connect <port>   - Connect to a specific port' },
        { type: 'info', text: '  decode <data>    - Decode encrypted data' },
        { type: 'info', text: '  grep <pattern>   - Search for patterns in files' },
        { type: 'info', text: '  exploit <target> - Attempt to exploit vulnerability' },
        { type: 'info', text: '  help             - Show this help message' },
      ],
      solved: false,
    }),
    scan: () => {
      if (parts.length < 2) {
        return {
          lines: [{ type: 'error', text: 'Usage: scan <range>' }],
          solved: false,
        };
      }
      return {
        lines: [
          { type: 'info', text: `Scanning ${parts[1]}...` },
          { type: 'success', text: 'Port 22: CLOSED' },
          { type: 'success', text: 'Port 80: OPEN' },
          { type: 'success', text: 'Port 443: OPEN' },
          { type: 'success', text: 'Port 8080: OPEN [VULNERABLE]' },
          { type: 'info', text: 'Scan complete. Found 1 vulnerable port.' },
        ],
        solved: false,
        context: 'port_8080_found',
      };
    },
    connect: () => {
      if (parts.length < 2) {
        return {
          lines: [{ type: 'error', text: 'Usage: connect <port>' }],
          solved: false,
        };
      }
      if (parts[1] === '8080') {
        return {
          lines: [
            { type: 'info', text: 'Connecting to port 8080...' },
            { type: 'success', text: 'Connection established!' },
            { type: 'info', text: 'Server banner: "SecureVault v2.1"' },
            { type: 'info', text: 'Authentication required. Try to exploit the vulnerability.' },
          ],
          solved: false,
          context: 'connected_8080',
        };
      }
      return {
        lines: [
          { type: 'error', text: `Port ${parts[1]} is not accessible.` },
        ],
        solved: false,
      };
    },
    exploit: () => {
      if (parts.length < 2) {
        return {
          lines: [{ type: 'error', text: 'Usage: exploit <target>' }],
          solved: false,
        };
      }
      if (parts[1] === '8080' || parts[1] === 'securevault') {
        return {
          lines: [
            { type: 'info', text: 'Analyzing target...' },
            { type: 'info', text: 'Found buffer overflow vulnerability!' },
            { type: 'info', text: 'Crafting payload...' },
            { type: 'success', text: 'Exploit successful!' },
            { type: 'success', text: 'ACCESS GRANTED - Challenge Complete!' },
          ],
          solved: true,
        };
      }
      return {
        lines: [
          { type: 'error', text: 'No known vulnerabilities for this target.' },
        ],
        solved: false,
      };
    },
    decode: () => {
      if (parts.length < 2) {
        return {
          lines: [{ type: 'error', text: 'Usage: decode <data>' }],
          solved: false,
        };
      }
      return {
        lines: [
          { type: 'info', text: 'Decoding...' },
          { type: 'success', text: 'Decoded: "admin:password123"' },
        ],
        solved: false,
      };
    },
    grep: () => {
      if (parts.length < 2) {
        return {
          lines: [{ type: 'error', text: 'Usage: grep <pattern>' }],
          solved: false,
        };
      }
      return {
        lines: [
          { type: 'info', text: `Searching for "${parts[1]}"...` },
          { type: 'success', text: 'config.txt: password="secret123"' },
          { type: 'success', text: 'logs.txt: admin logged in from 192.168.1.1' },
        ],
        solved: false,
      };
    },
  };

  const handler = responses[baseCmd];
  if (handler) {
    return handler();
  }

  return {
    lines: [
      { type: 'error', text: `Command not found: ${baseCmd}` },
      { type: 'info', text: 'Type "help" for available commands.' },
    ],
    solved: false,
  };
}

export function useSubmitSolution() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ lobbyId, solution }: { lobbyId: bigint; solution: string }) => {
      if (!actor) throw new Error('Actor not available');
      // Backend method not yet implemented, using type assertion
      const actorAny = actor as any;
      if (typeof actorAny.submitSolution === 'function') {
        return actorAny.submitSolution(lobbyId, solution);
      }
      throw new Error('submitSolution method not available in backend');
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
