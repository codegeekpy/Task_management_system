/**
 * TaskFlow Master Application Controller
 * Coordinates views, global state, search/filters, activity drawer, theme, and real-time sync
 */
const app = (() => {
  let currentView = 'kanban'; // 'kanban' | 'list' | 'calendar' | 'analytics'
  let allTasks = [];
  let currentFilters = {
    search: '',
    status: 'all',
    priorities: ['urgent', 'high', 'medium', 'low'],
    assigneeId: 'all',
    tag: 'all',
    onlyMine: false,
    onlyOverdue: false
  };

  // View Containers
  const views = {
    kanban: document.getElementById('viewKanban'),
    list: document.getElementById('viewList'),
    calendar: document.getElementById('viewCalendar'),
    analytics: document.getElementById('viewAnalytics')
  };

  const navItems = {
    kanban: document.getElementById('navKanban'),
    list: document.getElementById('navList'),
    calendar: document.getElementById('navCalendar'),
    analytics: document.getElementById('navAnalytics')
  };

  const viewTitles = {
    kanban: { title: 'Kanban Board', subtitle: 'Manage your task workflows with real-time drag-and-drop collaboration' },
    list: { title: 'Interactive List', subtitle: 'View, sort, filter, and batch update all workspace tasks' },
    calendar: { title: 'Calendar Schedule', subtitle: 'Track upcoming deadlines and project milestones across dates' },
    analytics: { title: 'Metrics & Analytics', subtitle: 'Real-time throughput velocity, status distributions, and team capacity' }
  };

  // Filter elements
  const globalSearchInput = document.getElementById('globalSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterTagSelect = document.getElementById('filterTagSelect');
  const filterAssigneeSelect = document.getElementById('filterAssigneeSelect');
  const counterTotalTasks = document.getElementById('counterTotalTasks');
  const btnRefreshTasks = document.getElementById('btnRefreshTasks');

  // Theme & Navigation
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainSidebar = document.getElementById('mainSidebar');

  // Activity Drawer
  const btnToggleActivity = document.getElementById('btnToggleActivity');
  const btnCloseActivity = document.getElementById('btnCloseActivity');
  const activityDrawer = document.getElementById('activityDrawer');
  const activityStream = document.getElementById('activityStream');
  const activityBadge = document.getElementById('activityBadge');

  function init() {
    setupTheme();
    setupNavigation();
    setupFilters();
    setupActivityDrawer();
    setupKeyboardShortcuts();
    setupEventListeners();

    // Initialize sub-controllers
    auth.init();
    taskModal.init();
    kanban.init();
    listView.init();
    calendarView.init();

    // Connect WebSocket
    wsClient.connect();

    // Initial tasks fetch
    fetchTasks();
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    btnThemeToggle?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('taskflow_theme', nextTheme);
      toast.info(`Switched to ${nextTheme} mode`);
    });
  }

  function setupNavigation() {
    // Switch View Tabs
    Object.keys(navItems).forEach(viewKey => {
      navItems[viewKey]?.addEventListener('click', () => {
        switchView(viewKey);
      });
    });

    // Mobile Hamburger
    mobileMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      mainSidebar?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (mainSidebar?.classList.contains('open') && !mainSidebar.contains(e.target) && e.target !== mobileMenuBtn) {
        mainSidebar.classList.remove('open');
      }
    });

    btnRefreshTasks?.addEventListener('click', () => {
      fetchTasks();
      toast.info('Workspace tasks refreshed');
    });
  }

  function switchView(viewKey) {
    if (!views[viewKey]) return;
    currentView = viewKey;

    // Toggle container classes
    Object.keys(views).forEach(k => {
      if (views[k]) views[k].classList.toggle('active', k === viewKey);
    });

    // Toggle nav active classes
    Object.keys(navItems).forEach(k => {
      if (navItems[k]) navItems[k].classList.toggle('active', k === viewKey);
    });

    // Update Header
    const titleEl = document.getElementById('currentViewTitle');
    const subtitleEl = document.getElementById('currentViewSubtitle');
    if (titleEl && viewTitles[viewKey]) titleEl.textContent = viewTitles[viewKey].title;
    if (subtitleEl && viewTitles[viewKey]) subtitleEl.textContent = viewTitles[viewKey].subtitle;

    // Close mobile sidebar if open
    mainSidebar?.classList.remove('open');

    // Render active view
    renderCurrentView();
  }

  function setupFilters() {
    // Search input
    let searchTimeout = null;
    globalSearchInput?.addEventListener('input', () => {
      const val = globalSearchInput.value.trim();
      clearSearchBtn?.classList.toggle('active', val.length > 0);

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = val;
        applyFiltersAndRender();
      }, 200);
    });

    clearSearchBtn?.addEventListener('click', () => {
      globalSearchInput.value = '';
      clearSearchBtn.classList.remove('active');
      currentFilters.search = '';
      applyFiltersAndRender();
      globalSearchInput.focus();
    });

    // Quick Filter Pills (Sidebar)
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filterType = pill.dataset.filter;
        currentFilters.onlyMine = filterType === 'my-tasks';
        currentFilters.onlyOverdue = filterType === 'overdue';
        if (filterType === 'urgent') {
          currentFilters.priorities = ['urgent'];
          syncPriorityCheckboxes();
        } else if (filterType === 'all') {
          currentFilters.priorities = ['urgent', 'high', 'medium', 'low'];
          syncPriorityCheckboxes();
        }

        applyFiltersAndRender();
      });
    });

    // Priority Checkboxes
    document.querySelectorAll('.filter-priority-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const checkedPriorities = Array.from(document.querySelectorAll('.filter-priority-cb:checked')).map(c => c.value);
        currentFilters.priorities = checkedPriorities;
        applyFiltersAndRender();
      });
    });

    // Tag Select
    filterTagSelect?.addEventListener('change', () => {
      currentFilters.tag = filterTagSelect.value;
      applyFiltersAndRender();
    });

    // Assignee Select
    filterAssigneeSelect?.addEventListener('change', () => {
      currentFilters.assigneeId = filterAssigneeSelect.value;
      applyFiltersAndRender();
    });
  }

  function syncPriorityCheckboxes() {
    document.querySelectorAll('.filter-priority-cb').forEach(cb => {
      cb.checked = currentFilters.priorities.includes(cb.value);
    });
  }

  function setupActivityDrawer() {
    btnToggleActivity?.addEventListener('click', () => {
      activityDrawer?.classList.toggle('open');
      if (activityDrawer?.classList.contains('open')) {
        activityBadge?.classList.remove('active');
        loadActivityLog();
      }
    });

    btnCloseActivity?.addEventListener('click', () => {
      activityDrawer?.classList.remove('open');
    });
  }

  async function loadActivityLog() {
    if (!activityStream) return;
    try {
      const res = await api.getActivityLog(30);
      const activities = res.activities || [];

      if (activities.length === 0) {
        activityStream.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px 0;">No activities recorded yet.</p>';
        return;
      }

      activityStream.innerHTML = activities.map(act => {
        const user = act.user || { name: 'Teammate', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user' };
        return `
          <div class="activity-item">
            <img src="${user.avatar}" alt="${escapeHtml(user.name)}">
            <div class="act-body">
              <div class="act-text">
                <strong>${escapeHtml(user.name)}</strong>: ${escapeHtml(act.details || act.action)}
                <div style="font-weight:600; font-size:0.785rem; color:var(--text-secondary); margin-top:1px;">
                  "${escapeHtml(act.taskTitle || 'Task')}"
                </div>
              </div>
              <div class="act-time">${formatRelative(act.timestamp)}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load activity log:', err);
    }
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      // Ctrl + K or Cmd + K: Focus global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        globalSearchInput?.focus();
        return;
      }

      // Escape: Close open modals, search, or drawer
      if (e.key === 'Escape') {
        taskModal.closeTaskModal();
        taskModal.closeDetailModal();
        auth.closeAuthModal();
        activityDrawer?.classList.remove('open');
        mainSidebar?.classList.remove('open');
        globalSearchInput?.blur();
        return;
      }

      // 'N' to create new task when not typing inside input
      if (!isInput && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        taskModal.openCreateModal();
        return;
      }
    });
  }

  function setupEventListeners() {
    // Re-fetch when logged in or data reset
    window.addEventListener('auth:login_success', () => {
      fetchTasks();
      loadActivityLog();
    });

    window.addEventListener('data:refreshed', () => {
      fetchTasks();
      loadActivityLog();
    });

    window.addEventListener('task:saved', () => {
      fetchTasks();
    });

    window.addEventListener('task:deleted', (e) => {
      const id = e.detail?.id;
      allTasks = allTasks.filter(t => t.id !== id);
      applyFiltersAndRender();
    });

    window.addEventListener('task:updated', (e) => {
      const updated = e.detail;
      if (updated) {
        const idx = allTasks.findIndex(t => t.id === updated.id);
        if (idx !== -1) {
          allTasks[idx] = updated;
          applyFiltersAndRender();
        }
      }
    });

    // WebSocket Real-time Broadcast Listeners
    window.addEventListener('ws:TASK_CREATED', (e) => {
      const { task, actor } = e.detail || {};
      if (task) {
        // Prevent duplicate if already added
        if (!allTasks.some(t => t.id === task.id)) {
          allTasks.unshift(task);
          applyFiltersAndRender();
          updateTagOptions();
          const me = auth.getCurrentUser();
          if (actor && me && actor.id !== me.id) {
            toast.info(`⚡ ${actor.name} created task: "${task.title}"`);
            showActivityNotification();
          }
        }
      }
    });

    window.addEventListener('ws:TASK_UPDATED', (e) => {
      const { task, actor } = e.detail || {};
      if (task) {
        const idx = allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          allTasks[idx] = task;
          applyFiltersAndRender();
          const me = auth.getCurrentUser();
          if (actor && me && actor.id !== me.id) {
            toast.info(`⚡ ${actor.name} updated: "${task.title}"`);
            showActivityNotification();
          }
        }
      }
    });

    window.addEventListener('ws:TASK_STATUS_CHANGED', (e) => {
      const { task, actor, newStatus } = e.detail || {};
      if (task) {
        const idx = allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          allTasks[idx] = task;
          applyFiltersAndRender();
          const me = auth.getCurrentUser();
          if (actor && me && actor.id !== me.id) {
            toast.info(`⚡ ${actor.name} moved "${task.title}" to ${newStatus.replace('_', ' ')}`);
            showActivityNotification();
          }
        }
      }
    });

    window.addEventListener('ws:TASK_DELETED', (e) => {
      const { taskId, taskTitle, actor } = e.detail || {};
      if (taskId) {
        allTasks = allTasks.filter(t => t.id !== taskId);
        applyFiltersAndRender();
        const me = auth.getCurrentUser();
        if (actor && me && actor.id !== me.id) {
          toast.warning(`⚡ ${actor.name} removed: "${taskTitle}"`);
          showActivityNotification();
        }
      }
    });

    window.addEventListener('ws:COMMENT_ADDED', (e) => {
      const { taskId, actor } = e.detail || {};
      const me = auth.getCurrentUser();
      if (actor && me && actor.id !== me.id) {
        showActivityNotification();
      }
    });
  }

  function showActivityNotification() {
    activityBadge?.classList.add('active');
    if (activityDrawer?.classList.contains('open')) {
      loadActivityLog();
    }
  }

  async function fetchTasks() {
    try {
      const res = await api.getTasks();
      allTasks = res.tasks || [];
      updateTagOptions();
      applyFiltersAndRender();
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }

  function updateTagOptions() {
    if (!filterTagSelect) return;
    const tagSet = new Set();
    allTasks.forEach(t => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach(tag => tagSet.add(tag));
      }
    });

    const currentVal = filterTagSelect.value;
    filterTagSelect.innerHTML = '<option value="all">All Tags</option>' +
      Array.from(tagSet).sort().map(tag => `
        <option value="${escapeHtml(tag)}" ${tag === currentVal ? 'selected' : ''}>#${escapeHtml(tag)}</option>
      `).join('');
  }

  function applyFiltersAndRender() {
    const today = new Date().toISOString().split('T')[0];
    const currentUser = auth.getCurrentUser();

    const filtered = allTasks.filter(task => {
      // Search keyword filter
      if (currentFilters.search) {
        const q = currentFilters.search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description && task.description.toLowerCase().includes(q);
        const matchTag = task.tags && task.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }

      // Priority checkboxes
      if (!currentFilters.priorities.includes(task.priority)) {
        return false;
      }

      // Assignee
      if (currentFilters.assigneeId !== 'all' && task.assigneeId !== currentFilters.assigneeId) {
        return false;
      }

      // Tag
      if (currentFilters.tag !== 'all' && (!task.tags || !task.tags.includes(currentFilters.tag))) {
        return false;
      }

      // Assigned to me pill
      if (currentFilters.onlyMine && currentUser && task.assigneeId !== currentUser.id) {
        return false;
      }

      // Overdue pill
      if (currentFilters.onlyOverdue && (task.status === 'completed' || !task.dueDate || task.dueDate >= today)) {
        return false;
      }

      return true;
    });

    if (counterTotalTasks) {
      counterTotalTasks.textContent = filtered.length;
    }

    renderCurrentView(filtered);
  }

  function renderCurrentView(filteredTasks = null) {
    const tasks = filteredTasks || getFilteredTasks();

    switch (currentView) {
      case 'kanban':
        kanban.render(tasks);
        break;
      case 'list':
        listView.render(tasks);
        break;
      case 'calendar':
        calendarView.render(tasks);
        break;
      case 'analytics':
        analyticsView.render();
        break;
    }
  }

  function getFilteredTasks() {
    // Re-apply filters synchronously
    const today = new Date().toISOString().split('T')[0];
    const currentUser = auth.getCurrentUser();

    return allTasks.filter(task => {
      if (currentFilters.search) {
        const q = currentFilters.search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description && task.description.toLowerCase().includes(q);
        const matchTag = task.tags && task.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      if (!currentFilters.priorities.includes(task.priority)) return false;
      if (currentFilters.assigneeId !== 'all' && task.assigneeId !== currentFilters.assigneeId) return false;
      if (currentFilters.tag !== 'all' && (!task.tags || !task.tags.includes(currentFilters.tag))) return false;
      if (currentFilters.onlyMine && currentUser && task.assigneeId !== currentUser.id) return false;
      if (currentFilters.onlyOverdue && (task.status === 'completed' || !task.dueDate || task.dueDate >= today)) return false;
      return true;
    });
  }

  function formatRelative(isoStr) {
    if (!isoStr) return '';
    const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    fetchTasks,
    switchView,
    applyFiltersAndRender
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
