/**
 * Token Monitor Tests
 * Tests for the TokenMonitor service functionality
 */

import { TokenMonitor, DEFAULT_TOKEN_MONITOR_CONFIG, type TokenMonitorConfig } from '../lib/token-monitor';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
};

describe('TokenMonitor', () => {
  let tokenMonitor: TokenMonitor;
  let mockConfig: TokenMonitorConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    
    // Create mock config
    mockConfig = {
      ...DEFAULT_TOKEN_MONITOR_CONFIG,
      onTokenExpired: jest.fn(),
      onTokenNearExpiry: jest.fn(),
      onTokenRefreshed: jest.fn(),
      onError: jest.fn(),
    };

    tokenMonitor = new TokenMonitor(mockConfig);
  });

  afterEach(() => {
    if (tokenMonitor.isRunning()) {
      tokenMonitor.stop();
    }
  });

  describe('Initialization', () => {
    it('should create TokenMonitor with correct config', () => {
      expect(tokenMonitor).toBeInstanceOf(TokenMonitor);
      expect(tokenMonitor.isRunning()).toBe(false);
    });

    it('should use default config values', () => {
      expect(DEFAULT_TOKEN_MONITOR_CONFIG.refreshThreshold).toBe(5 * 60 * 1000); // 5 minutes
      expect(DEFAULT_TOKEN_MONITOR_CONFIG.validationInterval).toBe(30 * 1000); // 30 seconds
    });
  });

  describe('Start/Stop functionality', () => {
    it('should start monitoring', () => {
      tokenMonitor.start();
      expect(tokenMonitor.isRunning()).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith('Starting token monitor...');
    });

    it('should stop monitoring', () => {
      tokenMonitor.start();
      tokenMonitor.stop();
      expect(tokenMonitor.isRunning()).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith('Stopping token monitor...');
    });

    it('should not start if already running', () => {
      tokenMonitor.start();
      tokenMonitor.start(); // Try to start again
      expect(consoleSpy.warn).toHaveBeenCalledWith('Token monitor is already running');
    });

    it('should handle stop when not running', () => {
      tokenMonitor.stop(); // Stop when not running
      expect(tokenMonitor.isRunning()).toBe(false);
    });
  });

  describe('Token validation', () => {
    it('should trigger onTokenExpired when no tokens found', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      tokenMonitor.forceCheck();
      
      expect(mockConfig.onTokenExpired).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('No tokens found, triggering logout');
    });

    it('should trigger onTokenExpired when refresh token is expired', () => {
      // Create expired refresh token (exp in the past)
      const expiredToken = createMockToken(Date.now() - 1000); // Expired 1 second ago
      const validAccessToken = createMockToken(Date.now() + 60000); // Valid for 1 minute
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return validAccessToken;
        if (key === 'refreshToken') return expiredToken;
        return null;
      });
      
      tokenMonitor.forceCheck();
      
      expect(mockConfig.onTokenExpired).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('Refresh token expired, triggering logout');
    });

    it('should trigger onTokenNearExpiry when access token is near expiry', () => {
      // Create tokens that are near expiry
      const nearExpiryToken = createMockToken(Date.now() + 60000); // Expires in 1 minute
      const validRefreshToken = createMockToken(Date.now() + 7 * 24 * 60 * 60 * 1000); // Valid for 7 days
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return nearExpiryToken;
        if (key === 'refreshToken') return validRefreshToken;
        return null;
      });
      
      tokenMonitor.forceCheck();
      
      expect(mockConfig.onTokenNearExpiry).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('Access token near expiry, triggering refresh');
    });

    it('should handle valid tokens correctly', () => {
      // Create valid tokens
      const validAccessToken = createMockToken(Date.now() + 60 * 60 * 1000); // Valid for 1 hour
      const validRefreshToken = createMockToken(Date.now() + 7 * 24 * 60 * 60 * 1000); // Valid for 7 days
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return validAccessToken;
        if (key === 'refreshToken') return validRefreshToken;
        return null;
      });
      
      tokenMonitor.forceCheck();
      
      expect(mockConfig.onTokenExpired).not.toHaveBeenCalled();
      expect(mockConfig.onTokenNearExpiry).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Token valid, expires in'));
    });
  });

  describe('Configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        refreshThreshold: 10 * 60 * 1000, // 10 minutes
      };
      
      tokenMonitor.updateConfig(newConfig);
      
      // Force check to see if new config is applied
      const validAccessToken = createMockToken(Date.now() + 8 * 60 * 1000); // Valid for 8 minutes
      const validRefreshToken = createMockToken(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return validAccessToken;
        if (key === 'refreshToken') return validRefreshToken;
        return null;
      });
      
      tokenMonitor.forceCheck();
      
      // With 10-minute threshold, 8-minute token should trigger near expiry
      expect(mockConfig.onTokenNearExpiry).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid token format', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'invalid-token';
        if (key === 'refreshToken') return 'invalid-token';
        return null;
      });
      
      tokenMonitor.forceCheck();
      
      expect(mockConfig.onError).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking token status:', expect.any(Error));
    });
  });
});

/**
 * Helper function to create mock JWT tokens
 */
function createMockToken(expirationTime: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    exp: Math.floor(expirationTime / 1000), // JWT exp is in seconds
    iat: Math.floor(Date.now() / 1000),
    userId: 1,
    username: 'testuser',
    email: 'test@example.com'
  }));
  const signature = 'mock-signature';
  
  return `${header}.${payload}.${signature}`;
}
