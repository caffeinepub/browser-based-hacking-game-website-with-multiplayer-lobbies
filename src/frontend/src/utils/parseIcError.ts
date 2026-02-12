/**
 * Parses Internet Computer and backend errors into user-friendly messages.
 * Handles common canister errors including stopped canisters, authorization failures,
 * lobby loading issues, command processing errors, and backend trap messages.
 * Extended to handle non-Error rejection objects from the IC agent.
 */
export function parseIcErrorToMessage(error: unknown): string {
  // Handle Error instances
  if (error instanceof Error) {
    const message = error.message;
    
    // Check for stopped canister (IC0508 / reject_code 5) - with explicit grouping
    if (
      (message.includes('Canister') && message.includes('is stopped')) ||
      message.includes('IC0508') ||
      message.includes('reject_code: 5') ||
      message.includes('reject_code:5')
    ) {
      return 'The game server is currently offline or stopped. Please try again later, or contact the administrator to restart the server.';
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
  
  // Handle non-Error rejection objects from IC agent
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    
    // Check for reject_code 5 (canister stopped) - with explicit grouping and type coercion
    if (
      errorObj.reject_code === 5 || 
      errorObj.reject_code === '5' || 
      errorObj.error_code === 'IC0508' ||
      errorObj.error_code === 'IC0508'
    ) {
      return 'The game server is currently offline or stopped. Please try again later, or contact the administrator to restart the server.';
    }
    
    // Try to extract message from various possible fields
    let extractedMessage = '';
    
    if (errorObj.reject_message) {
      extractedMessage = String(errorObj.reject_message);
    } else if (errorObj.error_message) {
      extractedMessage = String(errorObj.error_message);
    } else if (errorObj.message) {
      extractedMessage = String(errorObj.message);
    } else if (errorObj.error && typeof errorObj.error === 'object') {
      // Nested error object
      if (errorObj.error.message) {
        extractedMessage = String(errorObj.error.message);
      } else if (errorObj.error.reject_message) {
        extractedMessage = String(errorObj.error.reject_message);
      }
    } else if (errorObj.result && typeof errorObj.result === 'object' && errorObj.result.err) {
      // Result with err field
      extractedMessage = String(errorObj.result.err);
    }
    
    // Apply same parsing logic to extracted message
    if (extractedMessage) {
      const lowerMessage = extractedMessage.toLowerCase();
      
      // Check for stopped canister patterns - with explicit grouping
      if (
        (lowerMessage.includes('canister') && lowerMessage.includes('stopped')) ||
        lowerMessage.includes('ic0508') || 
        lowerMessage.includes('reject_code: 5') ||
        lowerMessage.includes('reject_code:5')
      ) {
        return 'The game server is currently offline or stopped. Please try again later, or contact the administrator to restart the server.';
      }
      
      // Check for authorization patterns
      if (lowerMessage.includes('unauthorized')) {
        if (lowerMessage.includes('only the host can start')) {
          return 'Only the lobby host can start the match.';
        }
        if (lowerMessage.includes('only users can')) {
          return 'You must be logged in to perform this action.';
        }
        if (lowerMessage.includes('not a member of this lobby')) {
          return 'You are not a member of this lobby. Please join the lobby first.';
        }
        if (lowerMessage.includes('only authenticated users')) {
          return 'You must be logged in to interact with multiplayer lobbies.';
        }
        return 'Authorization failed. Please ensure you are logged in and have the required permissions.';
      }
      
      // Check for lobby errors
      if (lowerMessage.includes('lobby not found') || 
          (lowerMessage.includes('lobby with id') && lowerMessage.includes('not found'))) {
        return 'Lobby could not be found. It may have been closed or deleted.';
      }
      
      // Return the extracted message if it's non-empty
      if (extractedMessage.trim()) {
        return extractedMessage;
      }
    }
  }
  
  // Handle plain string errors
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  
  // Safe fallback for any case where we couldn't extract a meaningful message
  return 'An unexpected error occurred. Please try again.';
}
