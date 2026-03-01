/**
 * UI Module
 * Handles all DOM manipulation and rendering
 */

import { CONFIG, debug } from './config.js';

// DOM Element References
const elements = {
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  emptyState: document.getElementById('empty-state'),
  messagesList: document.getElementById('messages-list'),
  errorMessage: document.getElementById('error-message'),
  totalCount: document.getElementById('total-count'),
  unreadCount: document.getElementById('unread-count'),
  lastUpdated: document.getElementById('last-updated'),
  connectionStatus: document.getElementById('connection-status'),
  toastContainer: document.getElementById('toast-container')
};

// State
let currentFilter = 'all';

/**
 * Format timestamp for display
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('en-US', CONFIG.UI.DATE_FORMAT.today);
  } else if (isThisYear) {
    return date.toLocaleDateString('en-US', CONFIG.UI.DATE_FORMAT.thisYear);
  } else {
    return date.toLocaleDateString('en-US', CONFIG.UI.DATE_FORMAT.default);
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return formatDate(timestamp);
}

/**
 * Get avatar color based on sender
 */
function getAvatarColor(str) {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from name
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Create message HTML element
 */
function createMessageElement(message) {
  const div = document.createElement('div');
  div.className = `p-4 hover:bg-gray-50 transition-colors cursor-pointer message-enter ${message.read ? '' : 'bg-indigo-50/50'}`;
  div.dataset.id = message.id;

  const avatarColor = getAvatarColor(message.sender.name);
  const initials = getInitials(message.sender.name);

  div.innerHTML = `
    <div class="flex gap-4">
      <div class="flex-shrink-0">
        ${message.sender.avatar 
          ? `<img src="${message.sender.avatar}" alt="${message.sender.name}" class="w-10 h-10 rounded-full object-cover">`
          : `<div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-semibold text-sm">${initials}</div>`
        }
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900 truncate">${escapeHtml(message.sender.name)}</h3>
            ${!message.read ? '<span class="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></span>' : ''}
          </div>
          <span class="text-xs text-gray-500 flex-shrink-0">${formatRelativeTime(message.timestamp)}</span>
        </div>
        <p class="text-sm font-medium text-gray-900 mt-0.5">${escapeHtml(message.subject)}</p>
        <p class="text-sm text-gray-600 mt-1 line-clamp-2">${escapeHtml(message.preview)}</p>
        ${message.tags?.length ? `
          <div class="flex gap-1.5 mt-2 flex-wrap">
            ${message.tags.map(tag => `
              <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">${escapeHtml(tag)}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Click handler for marking as read
  div.addEventListener('click', () => {
    if (!message.read) {
      markAsRead(message.id, div);
    }
  });

  return div;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Mark message as read visually and trigger API call
 */
async function markAsRead(id, element) {
  // Visual update immediately (optimistic UI)
  element.classList.remove('bg-indigo-50/50');
  const unreadDot = element.querySelector('.bg-indigo-600.rounded-full');
  if (unreadDot) unreadDot.remove();

  // Dispatch custom event for app.js to handle API call
  element.dispatchEvent(new CustomEvent('message:read', { 
    detail: { id }, 
    bubbles: true 
  }));
}

/**
 * Show loading state
 */
export function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.errorState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.messagesList.classList.add('hidden');
}

/**
 * Show error state
 */
export function showError(message, canRetry = true) {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.remove('hidden');
  elements.emptyState.classList.add('hidden');
  elements.messagesList.classList.add('hidden');
  
  elements.errorMessage.textContent = message;
  
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.style.display = canRetry ? 'inline-flex' : 'none';
  }
}

/**
 * Show empty state
 */
export function showEmpty() {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
  elements.messagesList.classList.add('hidden');
}

/**
 * Render messages list
 */
export function renderMessages(messages) {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.messagesList.classList.remove('hidden');

  elements.messagesList.innerHTML = '';
  
  messages.forEach((message, index) => {
    // Stagger animation
    setTimeout(() => {
      elements.messagesList.appendChild(createMessageElement(message));
    }, index * 50);
  });
}

/**
 * Update statistics display
 */
export function updateStats(total, unread) {
  elements.totalCount.textContent = total.toLocaleString();
  elements.unreadCount.textContent = unread.toLocaleString();
  elements.lastUpdated.textContent = new Date().toLocaleTimeString();
}

/**
 * Update connection status indicator
 */
export function setConnectionStatus(connected, message = null) {
  const indicator = elements.connectionStatus.querySelector('span');
  const text = elements.connectionStatus;
  
  if (connected) {
    indicator.className = 'w-2 h-2 bg-green-500 rounded-full';
    text.innerHTML = '<span class="w-2 h-2 bg-green-500 rounded-full"></span>Connected';
    text.className = 'flex items-center gap-2 text-sm text-gray-500';
  } else {
    indicator.className = 'w-2 h-2 bg-red-500 rounded-full';
    text.innerHTML = `<span class="w-2 h-2 bg-red-500 rounded-full"></span>${message || 'Disconnected'}`;
    text.className = 'flex items-center gap-2 text-sm text-red-600';
  }
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-gray-900',
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500'
  };

  toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] message-enter`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="w-5 h-5"></i>
    <span class="font-medium">${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);
  lucide.createIcons();

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Set active filter
 */
export function setFilter(filter) {
  currentFilter = filter;
  
  const allBtn = document.getElementById('filter-all');
  const unreadBtn = document.getElementById('filter-unread');
  
  if (filter === 'all') {
    allBtn.className = 'px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700';
    unreadBtn.className = 'px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100';
  } else {
    allBtn.className = 'px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100';
    unreadBtn.className = 'px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700';
  }
}

/**
 * Get current filter
 */
export function getFilter() {
  return currentFilter;
}

// Export elements for event binding
export { elements };