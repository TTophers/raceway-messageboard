/**
 * Mock API Server for Development
 * Simulates the backend proxy that would connect to Firebase
 * 
 * In production, this is replaced by your actual backend (Node.js, Python, etc.)
 */

// Mock data simulating what Firebase would return
const MOCK_MESSAGES = [
  {
    id: 'msg_1',
    sender: {
      name: 'Sarah Chen',
      email: 'sarah.chen@company.com',
      avatar: null
    },
    subject: 'Q4 Marketing Strategy Review',
    preview: 'Hi team, I have put together the initial draft for our Q4 marketing strategy. Please review and provide feedback by Friday...',
    body: 'Full message content here...',
    timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    read: false,
    tags: ['marketing', 'strategy', 'urgent']
  },
  {
    id: 'msg_2',
    sender: {
      name: 'Marcus Johnson',
      email: 'marcus.j@company.com',
      avatar: 'https://static.photos/people/200x200/42'
    },
    subject: 'Design System Updates',
    preview: 'The new component library is ready for testing. I have attached the documentation and migration guide...',
    body: 'Full message content here...',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    read: false,
    tags: ['design', 'engineering']
  },
  {
    id: 'msg_3',
    sender: {
      name: 'Emily Rodriguez',
      email: 'emily.r@company.com',
      avatar: null
    },
    subject: 'Weekly Team Sync - Notes',
    preview: 'Here are the notes from today is team sync. Action items have been assigned to respective owners...',
    body: 'Full message content here...',
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    read: true,
    tags: ['meeting', 'notes']
  },
  {
    id: 'msg_4',
    sender: {
      name: 'David Kim',
      email: 'david.kim@company.com',
      avatar: 'https://static.photos/people/200x200/88'
    },
    subject: 'Security Audit Results',
    preview: 'The quarterly security audit has been completed. We have 3 medium-priority items that need attention...',
    body: 'Full message content here...',
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    read: true,
    tags: ['security', 'audit']
  },
  {
    id: 'msg_5',
    sender: {
      name: 'Lisa Thompson',
      email: 'lisa.t@company.com',
      avatar: null
    },
    subject: 'New Hire Onboarding Schedule',
    preview: 'Please welcome our new team members starting next Monday. I have prepared the onboarding schedule...',
    body: 'Full message content here...',
    timestamp: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    read: true,
    tags: ['hr', 'onboarding']
  }
];

// Simulate network delay
const DELAY = 800;

/**
 * Mock fetch interceptor for development
 */
export function setupMockServer() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options = {}) {
    // Only intercept /api/* requests
    if (!url.startsWith('/api')) {
      return originalFetch(url, options);
    }

    debug('[Mock Server]', options.method || 'GET', url);

    // Simulate network delay
    await new Promise(r => setTimeout(r, DELAY));

    const path = url.replace('/api', '');
    const method = options.method || 'GET';

    // Route handlers
    try {
      // GET /api/messages
      if (path === '/messages' && method === 'GET') {
        const urlObj = new URL(url, window.location.origin);
        const unreadOnly = urlObj.searchParams.get('unread') === 'true';
        const limit = parseInt(urlObj.searchParams.get('limit')) || 20;

        let messages = [...MOCK_MESSAGES];
        
        if (unreadOnly) {
          messages = messages.filter(m => !m.read);
        }

        messages = messages.slice(0, limit);

        return new Response(JSON.stringify({
          messages,
          total: MOCK_MESSAGES.length,
          unread: MOCK_MESSAGES.filter(m => !m.read).length
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // GET /api/messages/:id
      const messageMatch = path.match(/^\/messages\/([^/]+)$/);
      if (messageMatch && method === 'GET') {
        const id = messageMatch[1];
        const message = MOCK_MESSAGES.find(m => m.id === id);
        
        if (!message) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(message), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // POST /api/messages/:id/read
      const readMatch = path.match(/^\/messages\/([^/]+)\/read$/);
      if (readMatch && method === 'POST') {
        const id = readMatch[1];
        const message = MOCK_MESSAGES.find(m => m.id === id);
        
        if (message) {
          message.read = true;
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // GET /api/health
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };

  console.log('[Mock Server] Development mock server active');
}

function debug(...args) {
  console.log(...args);
}