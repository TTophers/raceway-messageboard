/**
 * Mock Bridge for Development
 * Enables local testing without a real backend
 */

import { setupMockServer } from '../api/mock-server.js';

// Auto-enable mock server in development
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  setupMockServer();
}