/**
 * Utility functions for handling errors in a user-friendly way
 */

/**
 * Checks if an error is a user rejection (user cancelled transaction in MetaMask)
 */
export function isUserRejection(error: any): boolean {
  if (!error) return false;

  // Check error code (4001 is standard for user rejection)
  if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
    return true;
  }

  // Check error message for rejection keywords
  const message = 
    error.message ||
    error.shortMessage ||
    error.info?.error?.message ||
    error.error?.message ||
    error.data?.message ||
    String(error);

  if (!message) return false;

  const rejectionPatterns = [
    /user rejected/i,
    /user denied/i,
    /ACTION_REJECTED/i,
    /denied transaction/i,
    /rejected/i,
    /cancelled/i,
    /canceled/i,
    /user cancelled/i,
    /user canceled/i,
  ];

  return rejectionPatterns.some(pattern => pattern.test(message));
}

/**
 * Gets a user-friendly error message from an error object
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // User rejection - return friendly message
  if (isUserRejection(error)) {
    return 'Transaction was cancelled. No changes were made.';
  }

  // Extract message from various error formats
  const message = 
    error.message ||
    error.shortMessage ||
    error.info?.error?.message ||
    error.error?.message ||
    error.data?.message ||
    error.reason ||
    String(error);

  // Clean up common error messages
  if (message.includes('execution reverted:')) {
    const reason = message.split('execution reverted:')[1]?.trim();
    if (reason) {
      return reason.charAt(0).toUpperCase() + reason.slice(1);
    }
  }

  // Remove technical prefixes
  let cleanMessage = message
    .replace(/^Error: /i, '')
    .replace(/^ethers-/i, '')
    .replace(/^MetaMask /i, '');

  // Limit message length
  if (cleanMessage.length > 200) {
    cleanMessage = cleanMessage.substring(0, 200) + '...';
  }

  return cleanMessage || 'An unexpected error occurred';
}

/**
 * Checks if an error should be shown to the user
 * Returns false for user rejections (they already know they cancelled)
 */
export function shouldShowError(error: any): boolean {
  return !isUserRejection(error);
}

