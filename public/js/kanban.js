/**
 * Minimal Kanban Board Controller
 */
const kanban = (() => {
  const columns = {
    todo: document.getElementById('cards-todo'),
    in_progress: document.getElementById('cards-in_progress'),
    completed: document.getElementById('cards-completed')
  };

  const counters = {
    todo: document.getElementById('count-todo'),
    in_progress: document.getElementById('count-in_progress'),
    completed: document.getElementById('count-completed')
  };

  let draggedTaskId = null;

  function init() {
    setupDragAndDrop();
    setupAddButtons();
  }

  function setupAddButtons() {
    document.querySelectorAll('.btn-add-inline').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status || 'todo';
        taskModal.openCreateModal(status);
      });
    });
  }

  function setupDragAndDrop() {
    document.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        const newStatus = col.dataset.status;

        if (taskId && newStatus) {
          await handleTaskMove(taskId, newStatus);
        }
      });
    });
  }

  async function handleTaskMove(taskId, newStatus) {
    const card = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    if (!card) return;

    const currentStatus = card.dataset.status;
    if (currentStatus === newStatus) return;

    const targetCol = columns[newStatus];
    if (targetCol) {
      card.dataset.status = newStatus;
      targetCol.prepend(card);
      updateCounters();
    }

    try {
      const res = await api.updateTask(taskId, { status: newStatus });
      toast.info(`Moved to ${newStatus.replace('_', ' ')}`);
      window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
    } catch (err) {
      toast.error('Failed to move task');
      const origCol = columns[currentStatus];
      if (origCol) {
        card.dataset.status = currentStatus;
        origCol.prepend(card);
        updateCounters();
      }
    }
  }

  function render(tasks) {
    Object.values(columns).forEach(col => {
      if (col) col.innerHTML = '';
    });

    const counts = { todo: 0, in_progress: 0, completed: 0 };
    const today = new Date().toISOString().split('T')[0];

    tasks.forEach(task => {
      // Treat 'review' as in_progress if any
      const status = task.status === 'review' ? 'in_progress' : (task.status || 'todo');
      if (counts[status] !== undefined) counts[status]++;

      const col = columns[status];
      if (col) {
        col.appendChild(createCard(task, today));
      }
    });

    Object.keys(counters).forEach(k => {
      if (counters[k]) counters[k].textContent = counts[k] || 0;
    });

    // Empty indicator
    Object.keys(columns).forEach(k => {
      const col = columns[k];
      if (col && col.children.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.78rem;';
        empty.textContent = 'Empty';
        col.appendChild(empty);
      }
    });
  }

  function createCard(task, today) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.dataset.status = task.status;

    card.addEventListener('dragstart', (e) => {
      draggedTaskId = task.id;
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      draggedTaskId = null;
      card.classList.remove('dragging');
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-mini-btn')) return;
      taskModal.openEditModal(task);
    });

    const isOverdue = task.status !== 'completed' && task.dueDate && task.dueDate < today;
    const assignee = task.assignee || { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' };

    card.innerHTML = `
      <div class="card-row-top">
        <div class="priority-dot-wrap">
          <span class="p-dot ${task.priority}"></span>
          <span style="color:var(--text-sub);">${task.priority}</span>
        </div>
        <div class="card-actions-quick">
          <button class="card-mini-btn btn-del" title="Delete" aria-label="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="card-title-text">${escapeHtml(task.title)}</div>
      <div class="card-row-bottom">
        <div class="card-user-info" title="${escapeHtml(assignee.name)}">
          <img src="${assignee.avatar}" alt="${escapeHtml(assignee.name)}">
          <span>${escapeHtml(assignee.name.split(' ')[0])}</span>
        </div>
        ${task.dueDate ? `
          <span class="card-date-badge ${isOverdue ? 'overdue' : ''}">
            ${formatDate(task.dueDate)}
          </span>
        ` : ''}
      </div>
    `;

    card.querySelector('.btn-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${task.title}"?`)) {
        try {
          await api.deleteTask(task.id);
          card.remove();
          updateCounters();
          toast.info('Task deleted');
          window.dispatchEvent(new CustomEvent('task:deleted', { detail: { id: task.id } }));
        } catch (err) {
          toast.error('Failed to delete task');
        }
      }
    });

    return card;
  }

  function updateCounters() {
    Object.keys(columns).forEach(k => {
      const col = columns[k];
      const count = col.querySelectorAll('.task-card').length;
      if (counters[k]) counters[k].textContent = count;
    });
  }

  function formatDate(dStr) {
    try {
      const [y, m, d] = dStr.split('-');
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    render,
    updateCounters
  };
})();
