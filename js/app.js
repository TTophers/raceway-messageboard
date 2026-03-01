/**
 * Main Application Module
 * Orchestrates API calls, UI updates, and event handling
 */

import { api, ApiError } from './api.js';
import * as ui from './ui.js';
import { CONFIG, debug } from './config.js';

class MessageApp {
  constructor() {
    this.messages = [];
    this.refreshInterval = null;
    this.isLoading = false;
    
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    debug('Initializing Secure Message Viewer');
    
    this.bindEvents();
    this.loadMessages();
    this.startAutoRefresh();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.loadMessages();
    });

    // Retry button
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.loadMessages();
    });

    // Filter buttons
    document.getElementById('filter-all')?.addEventListener('click', () => {
      ui.setFilter('all');
      this.loadMessages();
    });

    document.getElementById('filter-unread')?.addEventListener('click', () => {
      ui.setFilter('unread');
      this.loadMessages();
    });

    // Mark as read events (delegated from message items)
    document.addEventListener('message:read', (e) => {
      this.handleMarkAsRead(e.detail.id);
    });

    // Visibility change - refresh when tab becomes active
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.loadMessages();
      }
    });

    // Online/offline detection
    window.addEventListener('online', () => {
      ui.setConnectionStatus(true);
      ui.showToast('Back online', 'success');
      this.loadMessages();
    });

    window.addEventListener('offline', () => {
      ui.setConnectionStatus(false, 'Offline');
      ui.showToast('You are offline', 'warning');
    });
  }

  /**
   * Load messages from API
   */
  async loadMessages() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    ui.showLoading();

    try {
      const filter = ui.getFilter();
      const filters = {
        unread: filter === 'unread' ? true : undefined,
        limit: CONFIG.UI.MESSAGES_PER_PAGE
      };

      const response = await api.getMessages(filters);
      
      // Handle different response formats
      const messages = response.messages || response.data || response;
      const total = response.total || messages.length;
      const unread = response.unread || messages.filter(m => !m.read).length;

      this.messages = messages;
      
      if (messages.length === 0) {
        ui.showEmpty();
      } else {
        ui.renderMessages(messages);
      }

      ui.updateStats(total, unread);
      ui.setConnectionStatus(true);

    } catch (error) {
      debug('Failed to load messages:', error);
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle mark as read
   */
  async handleMarkAsRead(id) {
    try {
      await api.markAsRead(id);
      
      // Update local state
      const message = this.messages.find(m => m.id === id);
      if (message) {
        message.read = true;
      }

      // Recalculate stats
      const unread = this.messages.filter(m => !m.read).length;
      ui.updateStats(this.messages.length, unread);

    } catch (error) {
      debug('Failed to mark as read:', error);
      // Don't show error - optimistic UI already updated
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    let message = 'Something went wrong';
    let canRetry = true;

    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          message = 'Authentication required. Please sign in.';
          canRetry = false;
          // TODO: Redirect to login when auth is enabled
          break;
        case 403:
          message = 'Access denied. Insufficient permissions.';
          canRetry = false;
          break;
        case 404:
          message = 'Messages not found.';
          canRetry = false;
          break;
        case 408:
          message = 'Request timed out. Please check your connection.';
          break;
        case 429:
          message = 'Too many requests. Please wait a moment.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = error.message || message;
      }
    } else if (error.name === 'TypeError') {
      message = 'Network error. Please check your connection.';
    }

    ui.showError(message, canRetry);
    ui.setConnectionStatus(false, 'Error');
  }

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
    if (CONFIG.FEATURES.REALTIME_UPDATES) return; // Skip if using WebSocket
    
    this.refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isLoading) {
        this.loadMessages();
      }
    }, CONFIG.UI.REFRESH_INTERVAL);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    this.stopAutoRefresh();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new MessageApp();
  });
} else {
  window.app = new MessageApp();
}