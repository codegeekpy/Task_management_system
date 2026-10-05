/**
 * Minimal List View Controller
 */
const listView = (() => {
  const tableBody = document.getElementById('tasksTableBody');

  function init() {}

  function render(tasks) {
    if (!tableBody) return;

    if (!tasks || tasks.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
            No tasks found.
          </td>
        </tr>
      `;
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    tableBody.innerHTML = tasks.map(task => {
      const isOverdue = task.status !== 'completed' && task.dueDate && task.dueDate < today;
      const assignee = task.assignee || { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' };

      return `
        <tr data-task-id="${task.id}">
          <td style="font-weight: 600; cursor: pointer;" class="table-task-click">${escapeHtml(task.title)}</td>
          <td>
            <select class="table-status-pill" data-task-id="${task.id}">
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${task.status === 'in_progress' || task.status === 'review' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </td>
          <td>
            <span style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; text-transform:capitalize;">
              <span class="p-dot ${task.priority}"></span>
              ${task.priority}
            </span>
          </td>
          <td>
            <span style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem;">
              <img src="${assignee.avatar}" style="width:20px; height:20px; border-radius:50%;" alt="${escapeHtml(assignee.name)}">
              ${escapeHtml(assignee.name.split(' ')[0])}
            </span>
          </td>
          <td style="font-size:0.78rem;" class="${isOverdue ? 'text-danger' : 'text-sub'}">
            ${task.dueDate || '-'}
          </td>
          <td style="text-align: right;">
            <button class="card-mini-btn btn-del-row" data-task-id="${task.id}" title="Delete" style="padding:4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.table-task-click').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.closest('tr').dataset.taskId;
        const task = tasks.find(t => t.id === id);
        if (task) taskModal.openEditModal(task);
      });
    });

    tableBody.querySelectorAll('.table-status-pill').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.taskId;
        const newStatus = sel.value;
        try {
          const res = await api.updateTask(id, { status: newStatus });
          toast.info(`Moved to ${newStatus.replace('_', ' ')}`);
          window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
        } catch (err) {
          toast.error('Failed to change status');
        }
      });
    });

    tableBody.querySelectorAll('.btn-del-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.taskId;
        const task = tasks.find(t => t.id === id);
        if (confirm(`Delete "${task ? task.title : 'this task'}"?`)) {
          try {
            await api.deleteTask(id);
            toast.info('Task deleted');
            window.dispatchEvent(new CustomEvent('task:deleted', { detail: { id } }));
          } catch (err) {
            toast.error('Failed to delete');
          }
        }
      });
    });
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
