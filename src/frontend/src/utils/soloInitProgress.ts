/**
 * Utility for Solo mode initialization progress tracking and messaging.
 * Provides consistent phase labels and timeout helpers for clear UX during startup.
 */

export type InitPhase = 'creating' | 'starting' | 'loading' | 'ready';

export interface InitProgress {
  phase: InitPhase;
  message: string;
  elapsed: number;
}

/**
 * Get user-friendly progress message for the current initialization phase.
 */
export function getPhaseMessage(phase: InitPhase): string {
  switch (phase) {
    case 'creating':
      return 'Creating game session...';
    case 'starting':
      return 'Starting match...';
    case 'loading':
      return 'Loading challenge...';
    case 'ready':
      return 'Ready!';
  }
}

/**
 * Format elapsed time in seconds for display.
 * Returns clear English text like "3 seconds" or "1 second".
 */
export function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return 'less than 1 second';
  if (seconds === 1) return '1 second';
  return `${seconds} seconds`;
}

/**
 * Overall timeout for Solo initialization before showing error (15 seconds).
 */
export const SOLO_INIT_TIMEOUT_MS = 15000;

/**
 * Check if initialization has exceeded the overall timeout.
 */
export function hasExceededTimeout(startTime: number): boolean {
  return Date.now() - startTime > SOLO_INIT_TIMEOUT_MS;
}
