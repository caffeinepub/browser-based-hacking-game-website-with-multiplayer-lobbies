/**
 * Parses Internet Computer and backend errors into user-friendly messages.
 * Handles common canister errors including stopped canisters, authorization failures,
 * lobby loading issues, command processing errors, and backend trap messages.
 */
export function parseIcErrorToMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Check for stopped canister (IC0508 / reject_code 5)
    if (
      message.includes('Canister') && 
      message.includes('is stopped') ||
      message.includes('IC0508') ||
      message.includes('reject_code: 5')
    ) {
      return 'The game server is temporarily offline or stopped. Please try again later or contact the site administrator to restart the canister.';
    }
    
    // Authorization errors
    if (message.includes('Unauthorized')) {
      if (message.includes('Only the host can start')) {
        return 'Only the lobby host can start the match.';
      }
      if (message.includes('Only users can')) {
        return 'You must be logged in to perform this action.';
      }
      if (message.includes('not a member of this lobby')) {
        return 'You are not a member of this lobby. Please join the lobby first.';
      }
      if (message.includes('Only authenticated users')) {
        return 'You must be logged in to interact with multiplayer lobbies.';
      }
      return 'Authorization failed. Please ensure you are logged in and have the required permissions.';
    }
    
    // Lobby errors
    if (message.includes('Lobby not found')) {
      return 'Lobby could not be found. It may have been closed or deleted.';
    }
    
    if (message.includes('Lobby with ID') && message.includes('not found')) {
      return 'The lobby could not be found. It may have expired or been removed.';
    }
    
    // Match state errors
    if (message.includes('Match is already active')) {
      return 'This match is already in progress.';
    }
    
    // Solo mode initialization errors
    if (message.includes('Failed to load the challenge')) {
      return 'Failed to initialize the game challenge. The server may be experiencing issues. Please try again.';
    }
    
    if (message.includes('challenge after starting')) {
      return 'The game challenge did not load properly after starting the match. Please try again or contact support if the issue persists.';
    }
    
    // Actor/connection errors
    if (message.includes('Actor not available')) {
      return 'Backend connection not ready. Please wait a moment and try again.';
    }
    
    // Timeout/loading errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The request timed out. The server may be slow or experiencing issues. Please try again.';
    }
    
    // Network/fetch errors
    if (message.includes('fetch') || message.includes('network')) {
      return 'Network error occurred. Please check your connection and try again.';
    }
    
    // Command processing errors
    if (message.includes('Command not found')) {
      return 'Unknown command. Type "help" to see available commands.';
    }
    
    // Return the original message if it's already user-friendly
    return message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}
