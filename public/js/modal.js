/**
 * Minimal Task Modal Controller
 */
const taskModal = (() => {
  const overlay = document.getElementById('taskModalOverlay');
  const titleHeading = document.getElementById('taskModalTitle');
  const form = document.getElementById('taskForm');
  const formId = document.getElementById('taskFormId');
  const titleInput = document.getElementById('taskTitleInput');
  const descInput = document.getElementById('taskDescInput');
  const statusSelect = document.getElementById('taskStatusSelect');
  const prioritySelect = document.getElementById('taskPrioritySelect');
  const dueDateInput = document.getElementById('taskDueDateInput');
  const assigneeSelect = document.getElementById('taskAssigneeSelect');
  const btnClose = document.getElementById('btnTaskModalClose');
  const btnCancel = document.getElementById('btnCancelTaskModal');
  const btnSaveText = document.getElementById('btnSaveTaskText');

  function init() {
    document.getElementById('btnNewTask')?.addEventListener('click', () => {
      openCreateModal();
    });

    btnClose?.addEventListener('click', close);
    btnCancel?.addEventListener('click', close);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = formId.value;
      const title = titleInput.value.trim();
      const description = descInput.value.trim();
      const status = statusSelect.value;
      const priority = prioritySelect.value;
      const dueDate = dueDateInput.value;
      const assigneeId = assigneeSelect.value;

      const payload = { title, description, status, priority, dueDate, assigneeId };

      try {
        if (id) {
          await api.updateTask(id, payload);
          toast.success('Task updated');
        } else {
          await api.createTask(payload);
          toast.success('Task created');
        }
        close();
        window.dispatchEvent(new CustomEvent('task:saved'));
      } catch (err) {
        toast.error(err.message || 'Failed to save');
      }
    });
  }

  function openCreateModal(prefillStatus = 'todo') {
    titleHeading.textContent = 'Create Task';
    btnSaveText.textContent = 'Create Task';
    formId.value = '';
    titleInput.value = '';
    descInput.value = '';
    statusSelect.value = prefillStatus;
    prioritySelect.value = 'medium';

    const d = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    dueDateInput.value = d;

    const current = auth.getCurrentUser();
    if (current && assigneeSelect) assigneeSelect.value = current.id;

    overlay.classList.add('open');
    setTimeout(() => titleInput.focus(), 100);
  }

  function openEditModal(task) {
    titleHeading.textContent = 'Edit Task';
    btnSaveText.textContent = 'Save Changes';
    formId.value = task.id;
    titleInput.value = task.title || '';
    descInput.value = task.description || '';
    statusSelect.value = task.status === 'review' ? 'in_progress' : (task.status || 'todo');
    prioritySelect.value = task.priority || 'medium';
    dueDateInput.value = task.dueDate || '';

    if (task.assigneeId && assigneeSelect) assigneeSelect.value = task.assigneeId;

    overlay.classList.add('open');
    setTimeout(() => titleInput.focus(), 100);
  }

  function close() {
    overlay.classList.remove('open');
  }

  return {
    init,
    openCreateModal,
    openEditModal,
    close
  };
})();
