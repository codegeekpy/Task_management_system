/**
 * Kanban Board Controller
 * Drag-and-drop interactions, column counters, card rendering, and status transitions
 */
const kanban = (() => {
  const columns = {
    todo: document.getElementById('cards-todo'),
    in_progress: document.getElementById('cards-in_progress'),
    review: document.getElementById('cards-review'),
    completed: document.getElementById('cards-completed')
  };

  const counters = {
    todo: document.getElementById('count-todo'),
    in_progress: document.getElementById('count-in_progress'),
    review: document.getElementById('count-review'),
    completed: document.getElementById('count-completed')
  };

  let draggedTaskId = null;

  function init() {
    setupDragAndDrop();
    setupColumnAddButtons();
  }

  function setupColumnAddButtons() {
    document.querySelectorAll('.btn-add-column-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status || 'todo';
        taskModal.openCreateModal(status);
      });
    });
  }

  function setupDragAndDrop() {
    document.querySelectorAll('.kanban-column').forEach(col => {
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

    // Optimistic DOM move
    const targetContainer = columns[newStatus];
    if (targetContainer) {
      card.dataset.status = newStatus;
      targetContainer.prepend(card);
      updateCounters();
    }

    try {
      const res = await api.updateTask(taskId, { status: newStatus });
      toast.info(`Moved to ${newStatus.replace('_', ' ')}`);
      window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
    } catch (err) {
      toast.error('Failed to move task. Reverting...');
      // Revert card back to original container
      const originalContainer = columns[currentStatus];
      if (originalContainer) {
        card.dataset.status = currentStatus;
        originalContainer.prepend(card);
        updateCounters();
      }
    }
  }

  function render(tasks) {
    // Clear all columns
    Object.values(columns).forEach(col => {
      if (col) col.innerHTML = '';
    });

    const counts = { todo: 0, in_progress: 0, review: 0, completed: 0 };
    const today = new Date().toISOString().split('T')[0];

    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (counts[status] !== undefined) counts[status]++;

      const col = columns[status];
      if (col) {
        const cardEl = createTaskCard(task, today);
        col.appendChild(cardEl);
      }
    });

    // Update column badge counters
    Object.keys(counters).forEach(key => {
      if (counters[key]) {
        counters[key].textContent = counts[key] || 0;
      }
    });

    // Show empty placeholder if no cards in column
    Object.keys(columns).forEach(status => {
      const col = columns[status];
      if (col && col.children.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'empty-column-placeholder';
        emptyEl.style.cssText = 'padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);';
        emptyEl.textContent = 'No tasks in this stage';
        col.appendChild(emptyEl);
      }
    });
  }

  function createTaskCard(task, today) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.dataset.status = task.status;

    // Drag events
    card.addEventListener('dragstart', (e) => {
      draggedTaskId = task.id;
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      draggedTaskId = null;
      card.classList.remove('dragging');
    });

    // Click card opens detail modal (unless clicking an action button)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn') || e.target.closest('.mobile-move-select')) {
        return;
      }
      taskModal.openDetailModal(task.id);
    });

    const isOverdue = task.status !== 'completed' && task.dueDate && task.dueDate < today;
    const assignee = task.assignee || { name: 'Unassigned', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=none' };

    // Subtasks progress bar
    const totalSub = task.totalSubtasks || (task.subtasks ? task.subtasks.length : 0);
    const completedSub = task.completedSubtasks || (task.subtasks ? task.subtasks.filter(s => s.completed).length : 0);
    const progressPct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

    let subtasksHtml = '';
    if (totalSub > 0) {
      subtasksHtml = `
        <div class="card-progress-wrapper">
          <div class="card-progress-header">
            <span>Subtasks</span>
            <span>${completedSub}/${totalSub} (${progressPct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>
      `;
    }

    // Tags HTML
    let tagsHtml = '';
    if (task.tags && task.tags.length > 0) {
      tagsHtml = `
        <div class="card-tags">
          ${task.tags.slice(0, 3).map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}
          ${task.tags.length > 3 ? `<span class="tag-badge">+${task.tags.length - 3}</span>` : ''}
        </div>
      `;
    }

    // Comments count
    const commentCount = (task.comments || []).length;

    card.innerHTML = `
      <div class="card-top">
        <span class="priority-pill ${task.priority}">${task.priority}</span>
        <div class="card-actions-menu">
          <button class="card-action-btn btn-edit-card" title="Edit task" aria-label="Edit task">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="card-action-btn btn-delete-card" title="Delete task" aria-label="Delete task">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      <h3 class="card-title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="card-desc">${escapeHtml(task.description)}</p>` : ''}
      
      ${tagsHtml}
      ${subtasksHtml}

      <div class="card-footer">
        <div class="card-assignee" title="Assigned to ${escapeHtml(assignee.name)}">
          <img src="${assignee.avatar}" alt="${escapeHtml(assignee.name)}">
          <span>${escapeHtml(assignee.name.split(' ')[0])}</span>
        </div>

        <div class="card-meta-right">
          ${task.dueDate ? `
            <span class="due-badge ${isOverdue ? 'overdue' : ''}" title="Due date: ${task.dueDate}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${formatDueDate(task.dueDate)}</span>
            </span>
          ` : ''}

          ${commentCount > 0 ? `
            <span class="comment-counter" title="${commentCount} comments">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>${commentCount}</span>
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Mobile quick status dropdown -->
      <select class="mobile-move-select" aria-label="Change status">
        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
        <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
        <option value="review" ${task.status === 'review' ? 'selected' : ''}>Under Review</option>
        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
      </select>
    `;

    // Action button listeners
    const editBtn = card.querySelector('.btn-edit-card');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      taskModal.openEditModal(task);
    });

    const deleteBtn = card.querySelector('.btn-delete-card');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete task "${task.title}"?`)) {
        try {
          await api.deleteTask(task.id);
          toast.success('Task deleted');
          card.remove();
          updateCounters();
          window.dispatchEvent(new CustomEvent('task:deleted', { detail: { id: task.id } }));
        } catch (err) {
          toast.error('Failed to delete task');
        }
      }
    });

    // Mobile select change listener
    const mobileSelect = card.querySelector('.mobile-move-select');
    mobileSelect.addEventListener('change', async (e) => {
      e.stopPropagation();
      await handleTaskMove(task.id, mobileSelect.value);
    });

    return card;
  }

  function updateCounters() {
    Object.keys(columns).forEach(status => {
      const col = columns[status];
      const count = col.querySelectorAll('.task-card').length;
      if (counters[status]) {
        counters[status].textContent = count;
      }
    });
  }

  function formatDueDate(dStr) {
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
