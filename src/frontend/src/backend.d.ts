import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Challenge {
    id: bigint;
    name: string;
    description: string;
}
export interface LeaderboardEntry {
    player: Principal;
    wins: bigint;
    totalScore: bigint;
}
export interface LobbyView {
    id: bigint;
    currentChallenge?: Challenge;
    host: Principal;
    mode: GameMode;
    isActive: boolean;
    players: Array<Principal>;
}
export type Time = bigint;
export interface MatchResultView {
    scores: Array<[Principal, bigint]>;
    mode: GameMode;
    winner?: Principal;
    matchId: bigint;
    timestamp: Time;
}
export interface UserProfile {
    gamesPlayed: bigint;
    name: string;
    totalScore: bigint;
}
export interface TerminalOutput {
    context?: string;
    solved: boolean;
    lines: Array<string>;
}
export enum GameMode {
    solo = "solo",
    competitive = "competitive",
    cooperative = "cooperative"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createLobby(mode: GameMode): Promise<bigint>;
    getActiveLobbies(): Promise<Array<LobbyView>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getLobby(lobbyId: bigint): Promise<LobbyView | null>;
    getRecentMatches(): Promise<Array<MatchResultView>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    joinLobby(lobbyId: bigint): Promise<void>;
    leaveLobby(lobbyId: bigint): Promise<void>;
    processTerminalCommand(lobbyId: bigint, commandText: string): Promise<TerminalOutput>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startMatch(lobbyId: bigint): Promise<void>;
    startMatchAndGetLobby(lobbyId: bigint): Promise<LobbyView | null>;
}
