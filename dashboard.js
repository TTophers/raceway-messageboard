document.addEventListener("DOMContentLoaded", () => {
  // Replace these with your actual project info
  const SUPABASE_URL = "https://imojiudetgpkvvvfufld.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UFAx-ucMBv91P2mXeocorw_Dnmow6mc";

  if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  const supabaseClient = window.supabaseClient;

  let currentView = 'inbox'; // only 'inbox' now
  let firstRenderUnreadIds = new Set(); // track unread messages on first load

  // --- AUTH CHECK ---
  (async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
      window.location.href = 'loggin.html';
    }
  })();

  async function markMessagesAsRead(messageIds) {
    if (messageIds.length === 0) return;
    const { error } = await supabaseClient
      .from('messages')
      .update({ read: true })
      .in('id', messageIds);
    if (error) {
      console.error("Failed to mark messages as read:", error);
    }
  }

  function updateStats() {
    const container = document.getElementById("messages");
    const totalCount = document.getElementById("total-count");
    const unreadCount = document.getElementById("unread-count");

    const messages = container.querySelectorAll(".message");
    let unread = 0;
    messages.forEach(msg => {
      if (msg.getAttribute("data-read") === "false") {
        unread++;
      }
    });

    totalCount.textContent = messages.length;
    unreadCount.textContent = unread;
  }

  async function loadMessages() {
    currentView = 'inbox';
    try {
      const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Failed to fetch messages:", error);
        return;
      }

      const container = document.getElementById("messages");
      container.innerHTML = "";

      const unreadIds = [];

      messages.forEach(msg => {
        const div = document.createElement("div");
        div.className = "message bg-white border rounded p-4 mb-4";
        div.setAttribute("data-id", msg.id);
        div.setAttribute("data-read", msg.read ? "true" : "false");

        // Only show green dot if it's the first render
        const showDot = !msg.read && !firstRenderUnreadIds.has(msg.id);
        if (showDot) firstRenderUnreadIds.add(msg.id);

        div.innerHTML = `
          <div class="flex justify-between items-start">

            <!-- LEFT SIDE: message content -->
            <div class="flex-1 pr-4">

              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                  ${showDot ? '<span class="w-3 h-3 rounded-full bg-green-500 inline-block unread-dot"></span>' : ''}
                  <strong>${msg.first_name} ${msg.last_name}</strong>
                </div>
                <span class="text-sm text-gray-500">${msg.service || ""}</span>
              </div>

              <p class="text-sm text-gray-600 mt-1">${msg.email} • ${msg.phone}</p>

              <p class="mt-3 text-gray-800 whitespace-pre-wrap">${msg.message}</p>

            </div>

            <!-- RIGHT SIDE: actions -->
            <div class="flex flex-col gap-2 items-end">

              <button
                class="delete-btn text-red-500 text-sm border border-red-900 px-2 py-1 rounded hover:bg-red-50"
                data-id="${msg.id}">
                Delete
              </button>

            </div>

          </div>
        `;

        container.appendChild(div);

        if (!msg.read) {
          unreadIds.push(msg.id);
        }
      });

      updateStats();

      // mark unread messages as read in backend
      if (unreadIds.length > 0) {
        await markMessagesAsRead(unreadIds);
        updateStats();
      }

    } catch (err) {
      console.error("Failed to load messages", err);
    }
  }

  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {

      const id = e.target.dataset.id;

      if (!confirm("Delete this message?")) return;

      const { error } = await supabaseClient
      .from('messages')
      .update({ archived: true })
      .eq('id', id);

      if (error) {
        console.error("Failed to delete message:", error);
        return;
      }

      // remove from UI immediately
      const messageEl = e.target.closest(".message");
      if (messageEl) messageEl.remove();

      updateStats();
    }
  });

  const inboxBtn = document.getElementById("inbox-btn");
  if (inboxBtn) {
    inboxBtn.addEventListener("click", () => {
      if (currentView !== 'inbox') {
        loadMessages();
      }
    });
  }

  document.getElementById("refresh-btn").addEventListener("click", () => loadMessages());

  // --- LOGOUT BUTTON ---
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'loggin.html';
    });
  }

  loadMessages();

  // auto refresh every 20 seconds
  setInterval(() => loadMessages(), 20000);
});