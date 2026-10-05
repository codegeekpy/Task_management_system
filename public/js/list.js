/**
 * Interactive List View Controller
 * Sortable table, inline status change, bulk selection, and actions
 */
const listView = (() => {
  const tableBody = document.getElementById('tasksTableBody');
  const sortSelect = document.getElementById('listSortSelect');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectedCountEl = document.getElementById('selectedCount');

  let currentTasks = [];
  let selectedTaskIds = new Set();

  function init() {
    sortSelect?.addEventListener('change', () => {
      render(currentTasks);
    });

    selectAllCheckbox?.addEventListener('change', () => {
      const isChecked = selectAllCheckbox.checked;
      selectedTaskIds.clear();
      if (isChecked) {
        currentTasks.forEach(t => selectedTaskIds.add(t.id));
      }
      updateCheckboxes();
      updateSelectedCount();
    });
  }

  function render(tasks) {
    currentTasks = [...tasks];
    if (!tableBody) return;

    if (currentTasks.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No tasks match the active filters or search criteria.
          </td>
        </tr>
      `;
      return;
    }

    // Sort tasks
    const sortVal = sortSelect ? sortSelect.value : 'updatedAt-desc';
    sortTasks(currentTasks, sortVal);

    const today = new Date().toISOString().split('T')[0];

    tableBody.innerHTML = currentTasks.map(task => {
      const isChecked = selectedTaskIds.has(task.id);
      const isOverdue = task.status !== 'completed' && task.dueDate && task.dueDate < today;
      const assignee = task.assignee || { name: 'Unassigned', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=none' };

      const totalSub = task.totalSubtasks || (task.subtasks ? task.subtasks.length : 0);
      const completedSub = task.completedSubtasks || (task.subtasks ? task.subtasks.filter(s => s.completed).length : 0);
      const subtaskDisplay = totalSub > 0 ? `${completedSub}/${totalSub}` : '-';

      return `
        <tr data-task-id="${task.id}">
          <td>
            <input type="checkbox" class="task-row-cb" data-task-id="${task.id}" ${isChecked ? 'checked' : ''} aria-label="Select task">
          </td>
          <td>
            <div class="table-task-title" data-task-id="${task.id}">${escapeHtml(task.title)}</div>
            ${task.tags && task.tags.length > 0 ? `
              <div style="display:flex; gap:4px; margin-top:4px;">
                ${task.tags.slice(0, 2).map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}
              </div>
            ` : ''}
          </td>
          <td>
            <select class="table-status-select" data-task-id="${task.id}" aria-label="Change status">
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="review" ${task.status === 'review' ? 'selected' : ''}>Under Review</option>
              <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </td>
          <td>
            <span class="priority-pill ${task.priority}">${task.priority}</span>
          </td>
          <td>
            <div class="table-assignee-cell" title="${escapeHtml(assignee.name)}">
              <img src="${assignee.avatar}" alt="${escapeHtml(assignee.name)}">
              <span>${escapeHtml(assignee.name.split(' ')[0])}</span>
            </div>
          </td>
          <td>
            <span class="${isOverdue ? 'text-rose' : 'text-muted'}" style="font-weight:${isOverdue ? '700' : '500'}; font-size: 0.8rem;">
              ${task.dueDate || '-'}
            </span>
          </td>
          <td>
            <span class="text-muted" style="font-size:0.8rem;">${subtaskDisplay}</span>
          </td>
          <td style="text-align: right;">
            <div style="display:flex; justify-content:flex-end; gap:6px;">
              <button class="card-action-btn btn-view-row" data-task-id="${task.id}" title="View details">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <button class="card-action-btn btn-edit-row" data-task-id="${task.id}" title="Edit task">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="card-action-btn btn-delete-row text-rose" data-task-id="${task.id}" title="Delete task">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    setupRowListeners();
    updateSelectedCount();
  }

  function setupRowListeners() {
    if (!tableBody) return;

    // Checkbox toggles
    tableBody.querySelectorAll('.task-row-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.taskId;
        if (cb.checked) {
          selectedTaskIds.add(id);
        } else {
          selectedTaskIds.delete(id);
        }
        updateSelectedCount();
      });
    });

    // Inline status change
    tableBody.querySelectorAll('.table-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.taskId;
        const newStatus = sel.value;
        try {
          const res = await api.updateTask(id, { status: newStatus });
          toast.info(`Status changed to ${newStatus.replace('_', ' ')}`);
          window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
        } catch (err) {
          toast.error('Failed to change status');
        }
      });
    });

    // Click title opens detail
    tableBody.querySelectorAll('.table-task-title').forEach(titleEl => {
      titleEl.addEventListener('click', () => {
        const id = titleEl.dataset.taskId;
        taskModal.openDetailModal(id);
      });
    });

    // View button
    tableBody.querySelectorAll('.btn-view-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.taskId;
        taskModal.openDetailModal(id);
      });
    });

    // Edit button
    tableBody.querySelectorAll('.btn-edit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.taskId;
        const task = currentTasks.find(t => t.id === id);
        if (task) taskModal.openEditModal(task);
      });
    });

    // Delete button
    tableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.taskId;
        const task = currentTasks.find(t => t.id === id);
        if (confirm(`Delete task "${task ? task.title : 'this task'}"?`)) {
          try {
            await api.deleteTask(id);
            toast.success('Task deleted');
            selectedTaskIds.delete(id);
            window.dispatchEvent(new CustomEvent('task:deleted', { detail: { id } }));
          } catch (err) {
            toast.error('Failed to delete task');
          }
        }
      });
    });
  }

  function sortTasks(tasks, sortVal) {
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };

    tasks.sort((a, b) => {
      switch (sortVal) {
        case 'dueDate-asc':
          return (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1;
        case 'priority-desc':
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'status-asc':
          return (a.status || '').localeCompare(b.status || '');
        case 'updatedAt-desc':
        default:
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      }
    });
  }

  function updateCheckboxes() {
    if (!tableBody) return;
    tableBody.querySelectorAll('.task-row-cb').forEach(cb => {
      cb.checked = selectedTaskIds.has(cb.dataset.taskId);
    });
  }

  function updateSelectedCount() {
    if (selectedCountEl) {
      selectedCountEl.textContent = selectedTaskIds.size;
    }
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = currentTasks.length > 0 && selectedTaskIds.size === currentTasks.length;
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
    render
  };
})();
