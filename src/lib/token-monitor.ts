/**
 * Token Monitoring Service
 * Provides proactive token validation and automatic refresh/logout functionality
 */

import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp: number;
  iat: number;
  userId: number;
  username: string;
  email: string;
}

interface TokenStatus {
  isValid: boolean;
  isExpired: boolean;
  isNearExpiry: boolean;
  expiresAt: number;
  timeUntilExpiry: number;
}

interface TokenMonitorConfig {
  refreshThreshold: number; // Time before expiry to trigger refresh (ms)
  validationInterval: number; // How often to check token status (ms)
  onTokenExpired: () => void;
  onTokenNearExpiry: () => void;
  onTokenRefreshed: (newToken: string) => void;
  onError: (error: Error) => void;
}

class TokenMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private config: TokenMonitorConfig;
  private isMonitoring = false;

  constructor(config: TokenMonitorConfig) {
    this.config = config;
  }

  /**
   * Start monitoring token status
   */
  start(): void {
    if (this.isMonitoring) {
      console.warn('Token monitor is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting token monitor...');

    // Initial check
    this.checkTokenStatus();

    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkTokenStatus();
    }, this.config.validationInterval);
  }

  /**
   * Stop monitoring token status
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log('Stopping token monitor...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check current token status
   */
  private checkTokenStatus(): void {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken || !refreshToken) {
        console.log('No tokens found, triggering logout');
        this.config.onTokenExpired();
        return;
      }

      const accessTokenStatus = this.getTokenStatus(accessToken);
      const refreshTokenStatus = this.getTokenStatus(refreshToken);

      // Check if refresh token is expired
      if (refreshTokenStatus.isExpired) {
        console.log('Refresh token expired, triggering logout');
        this.config.onTokenExpired();
        return;
      }

      // Check if access token is expired
      if (accessTokenStatus.isExpired) {
        console.log('Access token expired, attempting refresh');
        this.config.onTokenNearExpiry();
        return;
      }

      // Check if access token is near expiry
      if (accessTokenStatus.isNearExpiry) {
        console.log('Access token near expiry, triggering refresh');
        this.config.onTokenNearExpiry();
        return;
      }

      // Token is valid
      console.log(`Token valid, expires in ${Math.round(accessTokenStatus.timeUntilExpiry / 1000)}s`);
    } catch (error) {
      console.error('Error checking token status:', error);
      this.config.onError(error as Error);
    }
  }

  /**
   * Get detailed status of a token
   */
  private getTokenStatus(token: string): TokenStatus {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Date.now();
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const timeUntilExpiry = expiresAt - now;
      
      const isExpired = timeUntilExpiry <= 0;
      const isNearExpiry = timeUntilExpiry <= this.config.refreshThreshold && timeUntilExpiry > 0;
      const isValid = timeUntilExpiry > 0;

      return {
        isValid,
        isExpired,
        isNearExpiry,
        expiresAt,
        timeUntilExpiry
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return {
        isValid: false,
        isExpired: true,
        isNearExpiry: false,
        expiresAt: 0,
        timeUntilExpiry: 0
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TokenMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current monitoring status
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * Force a token status check
   */
  forceCheck(): void {
    this.checkTokenStatus();
  }
}

// Default configuration
export const DEFAULT_TOKEN_MONITOR_CONFIG: Omit<TokenMonitorConfig, 'onTokenExpired' | 'onTokenNearExpiry' | 'onTokenRefreshed' | 'onError'> = {
  refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  validationInterval: 30 * 1000, // Check every 30 seconds
};

export { TokenMonitor, type TokenMonitorConfig, type TokenStatus };
