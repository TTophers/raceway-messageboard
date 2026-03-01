/**
 * Application Configuration
 * Centralized config for easy environment switching
 */

export const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: '/api',  // Proxy endpoint - no direct Firebase access
    ENDPOINTS: {
      MESSAGES: '/messages',
      MESSAGE: (id) => `/messages/${id}`,
      MARK_READ: (id) => `/messages/${id}/read`
    },
    TIMEOUT: 10000,  // 10 second timeout
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },

  // Feature Flags (easy to toggle for future auth)
  FEATURES: {
    AUTH_ENABLED: false,      // Set to true when auth is ready
    REALTIME_UPDATES: false,  // WebSocket/SSE when ready
    OFFLINE_SUPPORT: false    // Service worker caching
  },

  // UI Configuration
  UI: {
    MESSAGES_PER_PAGE: 20,
    REFRESH_INTERVAL: 30000,  // Auto-refresh every 30s
    DATE_FORMAT: {
      today: { hour: '2-digit', minute: '2-digit' },
      thisYear: { month: 'short', day: 'numeric' },
      default: { year: 'numeric', month: 'short', day: 'numeric' }
    }
  }
};

// Environment detection
export const ENV = {
  isDevelopment: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
  isProduction: location.protocol === 'https:'
};

// Debug helper (only in development)
export const debug = (...args) => {
  if (ENV.isDevelopment) {
    console.log('[SecureMessages]', ...args);
  }
};