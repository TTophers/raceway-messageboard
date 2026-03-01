/**
 * API Client Module
 * Handles all HTTP communication with the secure backend proxy
 * No Firebase credentials or direct database access
 */

import { CONFIG, debug } from './config.js';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin'  // Include cookies for auth when enabled
    };
  }

  /**
   * Build full URL from endpoint
   */
  buildUrl(endpoint) {
    return `${this.baseURL}${endpoint}`;
  }

  /**
   * Core fetch wrapper with timeout and retry logic
   */
  async fetchWithTimeout(url, options, timeout = CONFIG.API.TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, { timeout: true });
      }
      throw error;
    }
  }

  /**
   * Execute request with retry logic
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const url = this.buildUrl(endpoint);
    
    try {
      debug('API Request:', options.method || 'GET', endpoint);
      
      const response = await this.fetchWithTimeout(url, {
        ...this.defaultOptions,
        ...options,
        headers: {
          ...this.defaultOptions.headers,
          ...options.headers
        }
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      // Parse JSON response
      const data = await response.json();
      debug('API Response:', data);
      return data;

    } catch (error) {
      // Retry on network errors or 5xx server errors
      if (retryCount < CONFIG.API.RETRY_ATTEMPTS && 
          (error.name === 'TypeError' || (error.status >= 500))) {
        debug(`Retrying ${endpoint}, attempt ${retryCount + 1}`);
        await this.delay(CONFIG.API.RETRY_DELAY * (retryCount + 1));
        return this.request(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // === Message Endpoints ===

  /**
   * Fetch all messages
   * GET /api/messages
   */
  async getMessages(filters = {}) {
    const params = new URLSearchParams();
    if (filters.unread !== undefined) params.append('unread', filters.unread);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.after) params.append('after', filters.after);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(CONFIG.API.ENDPOINTS.MESSAGES + query);
  }

  /**
   * Fetch single message
   * GET /api/messages/:id
   */
  async getMessage(id) {
    return this.request(CONFIG.API.ENDPOINTS.MESSAGE(id));
  }

  /**
   * Mark message as read
   * POST /api/messages/:id/read
   */
  async markAsRead(id) {
    return this.request(CONFIG.API.ENDPOINTS.MARK_READ(id), {
      method: 'POST'
    });
  }

  /**
   * Health check
   * GET /api/health
   */
  async healthCheck() {
    return this.request('/health');
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export error class for type checking
export { ApiError };