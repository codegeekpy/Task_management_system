/**
 * Task Creation, Editing, and Real-Time Details Collaboration Modals
 */
const taskModal = (() => {
  // Task Form Elements
  const taskModalOverlay = document.getElementById('taskModalOverlay');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskForm = document.getElementById('taskForm');
  const taskFormId = document.getElementById('taskFormId');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const taskDescInput = document.getElementById('taskDescInput');
  const taskStatusSelect = document.getElementById('taskStatusSelect');
  const taskPrioritySelect = document.getElementById('taskPrioritySelect');
  const taskDueDateInput = document.getElementById('taskDueDateInput');
  const taskAssigneeSelect = document.getElementById('taskAssigneeSelect');
  const btnTaskModalClose = document.getElementById('btnTaskModalClose');
  const btnCancelTaskModal = document.getElementById('btnCancelTaskModal');
  const btnSaveTaskText = document.getElementById('btnSaveTaskText');

  // Tag Management
  const tagsContainer = document.getElementById('tagsContainer');
  const tagInputField = document.getElementById('tagInputField');
  let currentTags = [];

  // Subtask Builder
  const subtasksBuilderList = document.getElementById('subtasksBuilderList');
  const newSubtaskInput = document.getElementById('newSubtaskInput');
  const btnAddSubtaskRow = document.getElementById('btnAddSubtaskRow');
  const subtaskBuilderCount = document.getElementById('subtaskBuilderCount');
  let currentSubtasks = [];

  // Task Detail Elements
  const taskDetailsOverlay = document.getElementById('taskDetailsOverlay');
  const btnDetailClose = document.getElementById('btnDetailClose');
  const detailStatusBadge = document.getElementById('detailStatusBadge');
  const detailPriorityBadge = document.getElementById('detailPriorityBadge');
  const detailTaskTitle = document.getElementById('detailTaskTitle');
  const detailDescription = document.getElementById('detailDescription');
  const detailTagsList = document.getElementById('detailTagsList');
  const detailProgressText = document.getElementById('detailProgressText');
  const detailProgressBar = document.getElementById('detailProgressBar');
  const detailSubtaskList = document.getElementById('detailSubtaskList');
  const detailCommentsStream = document.getElementById('detailCommentsStream');
  const commentCountBadge = document.getElementById('commentCountBadge');
  const newCommentText = document.getElementById('newCommentText');
  const btnSubmitComment = document.getElementById('btnSubmitComment');
  const peerTypingIndicator = document.getElementById('peerTypingIndicator');
  const detailAssigneeAvatar = document.getElementById('detailAssigneeAvatar');
  const detailAssigneeName = document.getElementById('detailAssigneeName');
  const detailAssigneeRole = document.getElementById('detailAssigneeRole');
  const detailCreatorName = document.getElementById('detailCreatorName');
  const detailDueDate = document.getElementById('detailDueDate');
  const detailQuickStatus = document.getElementById('detailQuickStatus');
  const detailQuickPriority = document.getElementById('detailQuickPriority');
  const detailCreatedAt = document.getElementById('detailCreatedAt');
  const detailUpdatedAt = document.getElementById('detailUpdatedAt');
  const btnEditTaskFromDetail = document.getElementById('btnEditTaskFromDetail');
  const btnDeleteTaskFromDetail = document.getElementById('btnDeleteTaskFromDetail');

  let activeDetailedTask = null;
  let typingTimeout = null;

  function init() {
    setupFormListeners();
    setupDetailListeners();
    setupWebSocketListeners();
  }

  function setupFormListeners() {
    // Open Create Modal from top button
    document.getElementById('btnNewTask')?.addEventListener('click', () => {
      openCreateModal();
    });

    btnTaskModalClose?.addEventListener('click', closeTaskModal);
    btnCancelTaskModal?.addEventListener('click', closeTaskModal);
    taskModalOverlay?.addEventListener('click', (e) => {
      if (e.target === taskModalOverlay) closeTaskModal();
    });

    // Tag Input Handling
    tagInputField?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = tagInputField.value.trim().toLowerCase().replace(/,/g, '');
        if (val && !currentTags.includes(val)) {
          currentTags.push(val);
          renderTags();
        }
        tagInputField.value = '';
      }
    });

    // Suggested Tag Click
    document.querySelectorAll('.tag-chip-suggestion').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        if (tag && !currentTags.includes(tag)) {
          currentTags.push(tag);
          renderTags();
        }
      });
    });

    // Subtask Builder Handling
    btnAddSubtaskRow?.addEventListener('click', addSubtaskRow);
    newSubtaskInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSubtaskRow();
      }
    });

    // Form Submit (Create or Update)
    taskForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = taskFormId.value;
      const title = taskTitleInput.value.trim();
      const description = taskDescInput.value.trim();
      const status = taskStatusSelect.value;
      const priority = taskPrioritySelect.value;
      const dueDate = taskDueDateInput.value;
      const assigneeId = taskAssigneeSelect.value;

      // Extract current subtask input if typed
      if (newSubtaskInput.value.trim()) {
        currentSubtasks.push({
          id: `sub_${Date.now()}`,
          title: newSubtaskInput.value.trim(),
          completed: false
        });
        newSubtaskInput.value = '';
      }

      const payload = {
        title,
        description,
        status,
        priority,
        dueDate,
        assigneeId,
        tags: currentTags,
        subtasks: currentSubtasks
      };

      try {
        const saveBtn = document.getElementById('btnSaveTask');
        saveBtn.disabled = true;

        if (id) {
          // Update Task
          const res = await api.updateTask(id, payload);
          toast.success(`Task "${res.task.title}" updated`);
          if (activeDetailedTask && activeDetailedTask.id === id) {
            renderTaskDetails(res.task);
          }
        } else {
          // Create Task
          const res = await api.createTask(payload);
          toast.success(`Task "${res.task.title}" created`);
        }

        closeTaskModal();
        window.dispatchEvent(new CustomEvent('task:saved'));
      } catch (err) {
        toast.error(err.message || 'Failed to save task');
      } finally {
        document.getElementById('btnSaveTask').disabled = false;
      }
    });
  }

  function setupDetailListeners() {
    btnDetailClose?.addEventListener('click', closeDetailModal);
    taskDetailsOverlay?.addEventListener('click', (e) => {
      if (e.target === taskDetailsOverlay) closeDetailModal();
    });

    // Edit from Detail Modal
    btnEditTaskFromDetail?.addEventListener('click', () => {
      if (activeDetailedTask) {
        closeDetailModal();
        openEditModal(activeDetailedTask);
      }
    });

    // Delete from Detail Modal
    btnDeleteTaskFromDetail?.addEventListener('click', async () => {
      if (activeDetailedTask && confirm(`Are you sure you want to delete "${activeDetailedTask.title}"?`)) {
        try {
          await api.deleteTask(activeDetailedTask.id);
          toast.success('Task deleted');
          closeDetailModal();
          window.dispatchEvent(new CustomEvent('task:deleted', { detail: { id: activeDetailedTask.id } }));
        } catch (err) {
          toast.error('Failed to delete task');
        }
      }
    });

    // Quick Status Dropdown in Detail Modal
    detailQuickStatus?.addEventListener('change', async () => {
      if (!activeDetailedTask) return;
      const newStatus = detailQuickStatus.value;
      try {
        const res = await api.updateTask(activeDetailedTask.id, { status: newStatus });
        renderTaskDetails(res.task);
        toast.info(`Status changed to ${newStatus.replace('_', ' ')}`);
        window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
      } catch (err) {
        toast.error('Failed to change status');
      }
    });

    // Quick Priority Dropdown in Detail Modal
    detailQuickPriority?.addEventListener('change', async () => {
      if (!activeDetailedTask) return;
      const newPriority = detailQuickPriority.value;
      try {
        const res = await api.updateTask(activeDetailedTask.id, { priority: newPriority });
        renderTaskDetails(res.task);
        toast.info(`Priority updated to ${newPriority}`);
        window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
      } catch (err) {
        toast.error('Failed to update priority');
      }
    });

    // Comment submission
    btnSubmitComment?.addEventListener('click', submitComment);
    newCommentText?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitComment();
      } else {
        notifyTyping();
      }
    });
  }

  function setupWebSocketListeners() {
    // Listen for peer typing
    window.addEventListener('ws:USER_TYPING', (e) => {
      const { taskId, userId, userName } = e.detail || {};
      if (activeDetailedTask && activeDetailedTask.id === taskId) {
        const current = auth.getCurrentUser();
        if (current && current.id !== userId) {
          peerTypingIndicator.textContent = `${userName} is typing...`;
          clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => {
            peerTypingIndicator.textContent = '';
          }, 2500);
        }
      }
    });

    // Listen for live comment added
    window.addEventListener('ws:COMMENT_ADDED', (e) => {
      const { taskId, comment } = e.detail || {};
      if (activeDetailedTask && activeDetailedTask.id === taskId) {
        if (!activeDetailedTask.comments) activeDetailedTask.comments = [];
        // Only append if not already in list
        if (!activeDetailedTask.comments.some(c => c.id === comment.id)) {
          activeDetailedTask.comments.push(comment);
          renderComments(activeDetailedTask.comments);
        }
      }
    });

    // Listen for live task updates
    window.addEventListener('ws:TASK_UPDATED', (e) => {
      const { task } = e.detail || {};
      if (activeDetailedTask && task && activeDetailedTask.id === task.id) {
        renderTaskDetails(task);
      }
    });

    // Listen for live task status changes
    window.addEventListener('ws:TASK_STATUS_CHANGED', (e) => {
      const { task } = e.detail || {};
      if (activeDetailedTask && task && activeDetailedTask.id === task.id) {
        renderTaskDetails(task);
      }
    });
  }

  function notifyTyping() {
    if (!activeDetailedTask) return;
    const current = auth.getCurrentUser();
    if (current) {
      wsClient.emitTyping(activeDetailedTask.id, current.id, current.name);
    }
  }

  async function submitComment() {
    if (!activeDetailedTask) return;
    const content = newCommentText.value.trim();
    if (!content) return;

    try {
      btnSubmitComment.disabled = true;
      const res = await api.addComment(activeDetailedTask.id, content);
      newCommentText.value = '';
      if (!activeDetailedTask.comments) activeDetailedTask.comments = [];
      activeDetailedTask.comments.push(res.comment);
      renderComments(activeDetailedTask.comments);
      toast.success('Comment posted');
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      btnSubmitComment.disabled = false;
    }
  }

  function addSubtaskRow() {
    const text = newSubtaskInput.value.trim();
    if (!text) return;

    currentSubtasks.push({
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: text,
      completed: false
    });

    newSubtaskInput.value = '';
    renderSubtasksBuilder();
    newSubtaskInput.focus();
  }

  function renderSubtasksBuilder() {
    if (!subtasksBuilderList) return;
    subtasksBuilderList.innerHTML = currentSubtasks.map((st, i) => `
      <div class="subtask-builder-row">
        <span>&#8226;</span>
        <input type="text" value="${escapeHtml(st.title)}" data-index="${i}">
        <button type="button" class="subtask-delete-btn" data-index="${i}" aria-label="Remove item">&times;</button>
      </div>
    `).join('');

    subtaskBuilderCount.textContent = `${currentSubtasks.length} item${currentSubtasks.length === 1 ? '' : 's'}`;

    subtasksBuilderList.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (currentSubtasks[idx]) {
          currentSubtasks[idx].title = e.target.value;
        }
      });
    });

    subtasksBuilderList.querySelectorAll('.subtask-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.index, 10);
        currentSubtasks.splice(idx, 1);
        renderSubtasksBuilder();
      });
    });
  }

  function renderTags() {
    if (!tagsContainer) return;
    // Clear chips but keep input
    const chips = tagsContainer.querySelectorAll('.tag-badge-removable');
    chips.forEach(c => c.remove());

    currentTags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-badge-removable';
      chip.innerHTML = `#${escapeHtml(tag)} <span class="tag-remove-x" data-tag="${escapeHtml(tag)}">&times;</span>`;
      chip.querySelector('.tag-remove-x').addEventListener('click', (e) => {
        e.stopPropagation();
        currentTags = currentTags.filter(t => t !== tag);
        renderTags();
      });
      tagsContainer.insertBefore(chip, tagInputField);
    });
  }

  function openCreateModal(prefillStatus = 'todo', prefillDueDate = null) {
    taskModalTitle.textContent = 'Create New Task';
    btnSaveTaskText.textContent = 'Create Task';
    taskFormId.value = '';
    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskStatusSelect.value = prefillStatus;
    taskPrioritySelect.value = 'medium';

    const defaultDate = prefillDueDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    taskDueDateInput.value = defaultDate;

    const currentUser = auth.getCurrentUser();
    if (currentUser && taskAssigneeSelect) {
      taskAssigneeSelect.value = currentUser.id;
    }

    currentTags = ['feature'];
    renderTags();

    currentSubtasks = [];
    renderSubtasksBuilder();

    taskModalOverlay.classList.add('open');
    setTimeout(() => taskTitleInput.focus(), 100);
  }

  function openEditModal(task) {
    taskModalTitle.textContent = 'Edit Task Details';
    btnSaveTaskText.textContent = 'Save Changes';
    taskFormId.value = task.id;
    taskTitleInput.value = task.title || '';
    taskDescInput.value = task.description || '';
    taskStatusSelect.value = task.status || 'todo';
    taskPrioritySelect.value = task.priority || 'medium';
    taskDueDateInput.value = task.dueDate || '';

    if (task.assigneeId && taskAssigneeSelect) {
      taskAssigneeSelect.value = task.assigneeId;
    }

    currentTags = Array.isArray(task.tags) ? [...task.tags] : [];
    renderTags();

    currentSubtasks = Array.isArray(task.subtasks) ? JSON.parse(JSON.stringify(task.subtasks)) : [];
    renderSubtasksBuilder();

    taskModalOverlay.classList.add('open');
    setTimeout(() => taskTitleInput.focus(), 100);
  }

  function closeTaskModal() {
    taskModalOverlay.classList.remove('open');
  }

  async function openDetailModal(taskId) {
    try {
      const res = await api.getTaskById(taskId);
      renderTaskDetails(res.task);
      taskDetailsOverlay.classList.add('open');
    } catch (err) {
      toast.error('Failed to load task details');
    }
  }

  function renderTaskDetails(task) {
    activeDetailedTask = task;

    detailTaskTitle.textContent = task.title;
    detailDescription.textContent = task.description || 'No description provided for this task.';

    // Status Badge
    detailStatusBadge.textContent = (task.status || 'todo').replace('_', ' ').toUpperCase();
    detailStatusBadge.className = `status-badge`;
    detailStatusBadge.style.backgroundColor = `var(--status-${task.status.replace('_', '')}-bg)`;
    detailStatusBadge.style.color = `var(--status-${task.status.replace('_', '')})`;

    // Priority Badge
    detailPriorityBadge.textContent = (task.priority || 'medium').toUpperCase();
    detailPriorityBadge.className = `priority-badge`;
    detailPriorityBadge.style.backgroundColor = `var(--p-${task.priority}-bg)`;
    detailPriorityBadge.style.color = `var(--p-${task.priority})`;

    // Tags
    if (task.tags && task.tags.length > 0) {
      detailTagsList.innerHTML = task.tags.map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('');
    } else {
      detailTagsList.innerHTML = '';
    }

    // Subtasks Progress
    renderSubtasksInteractive(task.subtasks || []);

    // Comments
    renderComments(task.comments || []);

    // Assignee
    const assignee = task.assignee || { name: 'Unassigned', role: 'Team Member', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=none' };
    detailAssigneeAvatar.src = assignee.avatar;
    detailAssigneeName.textContent = assignee.name;
    detailAssigneeRole.textContent = assignee.role;

    // Creator & Meta
    detailCreatorName.textContent = task.creator ? task.creator.name : 'Team Lead';
    detailDueDate.textContent = task.dueDate ? formatDate(task.dueDate) : 'No deadline';
    detailQuickStatus.value = task.status || 'todo';
    detailQuickPriority.value = task.priority || 'medium';

    detailCreatedAt.textContent = formatRelative(task.createdAt);
    detailUpdatedAt.textContent = formatRelative(task.updatedAt);
  }

  function renderSubtasksInteractive(subtasks) {
    const total = subtasks.length;
    const completed = subtasks.filter(s => s.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    detailProgressText.textContent = `${pct}% Completed (${completed}/${total})`;
    detailProgressBar.style.width = `${pct}%`;

    if (total === 0) {
      detailSubtaskList.innerHTML = '<p class="text-muted" style="font-size:0.85rem; padding:8px 0;">No checklist items added yet.</p>';
      return;
    }

    detailSubtaskList.innerHTML = subtasks.map(s => `
      <label class="subtask-item ${s.completed ? 'completed' : ''}" data-subtask-id="${s.id}">
        <input type="checkbox" ${s.completed ? 'checked' : ''} data-subtask-id="${s.id}">
        <span>${escapeHtml(s.title)}</span>
      </label>
    `).join('');

    detailSubtaskList.querySelectorAll('input[type="checkbox"]').forEach(box => {
      box.addEventListener('change', async (e) => {
        const subId = box.dataset.subtaskId;
        if (!activeDetailedTask) return;

        try {
          const res = await api.toggleSubtask(activeDetailedTask.id, subId);
          renderTaskDetails(res.task);
          window.dispatchEvent(new CustomEvent('task:updated', { detail: res.task }));
        } catch (err) {
          toast.error('Failed to toggle subtask');
        }
      });
    });
  }

  function renderComments(comments) {
    commentCountBadge.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;

    if (comments.length === 0) {
      detailCommentsStream.innerHTML = '<p class="text-muted" style="font-size:0.85rem; padding:12px 0;">No comments yet. Start the team discussion!</p>';
      return;
    }

    detailCommentsStream.innerHTML = comments.map(cm => {
      const user = cm.user || { name: 'Teammate', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user' };
      return `
        <div class="comment-card">
          <img src="${user.avatar}" alt="${escapeHtml(user.name)}">
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-author">${escapeHtml(user.name)}</span>
              <span class="comment-time">${formatRelative(cm.createdAt)}</span>
            </div>
            <div class="comment-text">${escapeHtml(cm.content)}</div>
          </div>
        </div>
      `;
    }).join('');

    detailCommentsStream.scrollTop = detailCommentsStream.scrollHeight;
  }

  function closeDetailModal() {
    taskDetailsOverlay.classList.remove('open');
    activeDetailedTask = null;
  }

  function formatDate(dStr) {
    try {
      const [y, m, d] = dStr.split('-');
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dStr;
    }
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
    openCreateModal,
    openEditModal,
    openDetailModal,
    closeTaskModal,
    closeDetailModal
  };
})();
