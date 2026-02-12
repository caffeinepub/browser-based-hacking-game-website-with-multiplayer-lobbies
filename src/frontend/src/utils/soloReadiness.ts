/**
 * Utility for Solo mode lobby readiness checks and resilient polling.
 * Encapsulates the logic for determining when a lobby is ready and provides
 * a bounded retry strategy that tolerates transient delays.
 */

import type { LobbyView, Challenge } from '../backend';
import { unwrapCandidOptional } from './unwrapCandidOptional';

/**
 * Check if a lobby is ready for gameplay.
 * A lobby is ready when it is active AND has a current challenge.
 */
export function isLobbyReady(lobby: LobbyView | null | undefined): boolean {
  if (!lobby) return false;
  if (!lobby.isActive) return false;
  
  const challenge = unwrapCandidOptional<Challenge>(lobby.currentChallenge as any);
  return challenge !== null;
}

/**
 * Bounded retry configuration for lobby readiness polling.
 * Uses fast initial checks with exponential backoff to balance
 * quick success with tolerance for transient delays.
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration: 10 attempts over ~6 seconds
 * (100ms, 200ms, 400ms, 800ms, 1000ms, 1000ms, 1000ms, 1000ms, 1000ms, 1000ms)
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 10,
  initialDelayMs: 100,
  maxDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for the next retry attempt using exponential backoff.
 */
export function getRetryDelay(attemptNumber: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Helper to create a cancellable delay promise.
 */
export function createCancellableDelay(ms: number): { promise: Promise<void>; cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  let cancelled = false;
  
  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      if (!cancelled) resolve();
    }, ms);
  });
  
  const cancel = () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
  
  return { promise, cancel };
}
