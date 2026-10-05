/**
 * Minimal Application Master Controller
 */
const app = (() => {
  let currentView = 'kanban'; // 'kanban' | 'list'
  let allTasks = [];
  let currentFilter = 'all'; // 'all' | 'my-tasks' | 'urgent'
  let searchQuery = '';

  const views = {
    kanban: document.getElementById('viewKanban'),
    list: document.getElementById('viewList')
  };

  const tabs = {
    kanban: document.getElementById('tabKanban'),
    list: document.getElementById('tabList')
  };

  const counterEl = document.getElementById('counterTotalTasks');
  const searchInput = document.getElementById('globalSearchInput');
  const themeBtn = document.getElementById('btnThemeToggle');

  function init() {
    setupTheme();
    setupNavigation();
    setupFilters();
    setupWebSocketSync();

    auth.init();
    taskModal.init();
    kanban.init();
    listView.init();

    wsClient.connect();
    loadTasks();
  }

  function setupTheme() {
    const saved = localStorage.getItem('taskflow_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    themeBtn?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('taskflow_theme', next);
    });
  }

  function setupNavigation() {
    tabs.kanban?.addEventListener('click', () => setView('kanban'));
    tabs.list?.addEventListener('click', () => setView('list'));
  }

  function setView(viewName) {
    currentView = viewName;
    Object.keys(views).forEach(k => {
      views[k]?.classList.toggle('active', k === viewName);
      tabs[k]?.classList.toggle('active', k === viewName);
    });
    renderView();
  }

  function setupFilters() {
    let searchTimeout = null;
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = searchInput.value.trim().toLowerCase();
        renderView();
      }, 150);
    });

    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter || 'all';
        renderView();
      });
    });

    window.addEventListener('task:saved', loadTasks);
    window.addEventListener('data:refreshed', loadTasks);
    window.addEventListener('task:deleted', (e) => {
      allTasks = allTasks.filter(t => t.id !== e.detail?.id);
      renderView();
    });
    window.addEventListener('task:updated', (e) => {
      const updated = e.detail;
      if (updated) {
        const idx = allTasks.findIndex(t => t.id === updated.id);
        if (idx !== -1) allTasks[idx] = updated;
        renderView();
      }
    });
  }

  function setupWebSocketSync() {
    window.addEventListener('ws:TASK_CREATED', (e) => {
      const { task } = e.detail || {};
      if (task && !allTasks.some(t => t.id === task.id)) {
        allTasks.unshift(task);
        renderView();
      }
    });

    window.addEventListener('ws:TASK_UPDATED', (e) => {
      const { task } = e.detail || {};
      if (task) {
        const idx = allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          allTasks[idx] = task;
          renderView();
        }
      }
    });

    window.addEventListener('ws:TASK_STATUS_CHANGED', (e) => {
      const { task } = e.detail || {};
      if (task) {
        const idx = allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          allTasks[idx] = task;
          renderView();
        }
      }
    });

    window.addEventListener('ws:TASK_DELETED', (e) => {
      const { taskId } = e.detail || {};
      if (taskId) {
        allTasks = allTasks.filter(t => t.id !== taskId);
        renderView();
      }
    });
  }

  async function loadTasks() {
    try {
      const res = await api.getTasks();
      allTasks = res.tasks || [];
      renderView();
    } catch (err) {}
  }

  function getFilteredTasks() {
    const user = auth.getCurrentUser();

    return allTasks.filter(task => {
      if (searchQuery) {
        const matchTitle = task.title.toLowerCase().includes(searchQuery);
        const matchDesc = task.description && task.description.toLowerCase().includes(searchQuery);
        if (!matchTitle && !matchDesc) return false;
      }

      if (currentFilter === 'my-tasks' && user && task.assigneeId !== user.id) {
        return false;
      }

      if (currentFilter === 'urgent' && task.priority !== 'urgent') {
        return false;
      }

      return true;
    });
  }

  function renderView() {
    const filtered = getFilteredTasks();

    if (counterEl) {
      counterEl.textContent = `${filtered.length} task${filtered.length === 1 ? '' : 's'}`;
    }

    if (currentView === 'kanban') {
      kanban.render(filtered);
    } else {
      listView.render(filtered);
    }
  }

  return {
    init,
    loadTasks
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
