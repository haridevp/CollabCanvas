// Mock service for username availability check
// In production, this would make actual API calls to your backend

// Simulated existing usernames (in production, this would come from the backend)
const EXISTING_USERNAMES = [
  'john_doe',
  'jane_smith',
  'artist123',
  'canvas_master',
  'designer',
  'creative',
  'painter',
  'drawing_pro'
];

export interface UsernameCheckResult {
  available: boolean;
  message: string;
  suggestions?: string[];
}

/**
 * Checks if a username is available
 * Simulates API call with delay for real-time checking
 * 
 * @param username - Username to check
 * @returns Promise with availability result
 */
export const checkUsernameAvailability = async (username: string): Promise<UsernameCheckResult> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Trim and lowercase for consistent checking
  const normalizedUsername = username.trim().toLowerCase();

  // Validation rules
  if (normalizedUsername.length < 3) {
    return {
      available: false,
      message: 'Username must be at least 3 characters'
    };
  }

  if (normalizedUsername.length > 20) {
    return {
      available: false,
      message: 'Username must be less than 20 characters'
    };
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) {
    return {
      available: false,
      message: 'Username can only contain letters, numbers, dots, hyphens, and underscores'
    };
  }

  // Check if username is taken
  const isTaken = EXISTING_USERNAMES.includes(normalizedUsername);
  
  if (isTaken) {
    // Generate suggestions
    const suggestions = generateUsernameSuggestions(normalizedUsername);
    
    return {
      available: false,
      message: 'Username is already taken',
      suggestions
    };
  }

  return {
    available: true,
    message: 'Username is available!'
  };
};

/**
 * Generates alternative username suggestions
 * 
 * @param username - Original username
 * @returns Array of suggested usernames
 */
const generateUsernameSuggestions = (username: string): string[] => {
  const suggestions: string[] = [];
  const baseName = username.replace(/[0-9_.-]/g, '');
  
  // Add numbers
  for (let i = 1; i <= 5; i++) {
    suggestions.push(`${username}${i}`);
    suggestions.push(`${baseName}${i}`);
  }
  
  // Add common suffixes
  const suffixes = ['art', 'draw', 'design', 'canvas', 'studio', 'creative'];
  suffixes.forEach(suffix => {
    suggestions.push(`${username}_${suffix}`);
    suggestions.push(`${baseName}_${suffix}`);
  });
  
  // Return unique suggestions, limited to 5
  return [...new Set(suggestions)].slice(0, 5);
};