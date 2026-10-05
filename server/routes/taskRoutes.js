const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../auth');
const { broadcast } = require('../websocket');

// All task routes require authentication
router.use(authenticate);

function enrichTask(task) {
  if (!task) return null;
  const assignee = task.assigneeId ? db.findUserById(task.assigneeId) : null;
  const creator = task.creatorId ? db.findUserById(task.creatorId) : null;
  const comments = (task.comments || []).map(cm => ({
    ...cm,
    user: db.findUserById(cm.userId) || { name: 'Unknown User', avatar: '' }
  }));

  const totalSubtasks = (task.subtasks || []).length;
  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (task.status === 'completed' ? 100 : 0);

  return {
    ...task,
    assignee,
    creator,
    comments,
    totalSubtasks,
    completedSubtasks,
    progress
  };
}

// GET /api/tasks - Retrieve all tasks with optional filters
router.get('/', (req, res) => {
  try {
    const { status, priority, assigneeId, tag, search } = req.query;
    const tasks = db.getAllTasks({ status, priority, assigneeId, tag, search });
    const enriched = tasks.map(enrichTask);
    return res.json({ tasks: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/stats/summary - Dashboard analytics
router.get('/stats/summary', (req, res) => {
  try {
    const tasks = db.getAllTasks();
    const today = new Date().toISOString().split('T')[0];

    const counts = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < today).length,
      urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length
    };

    const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

    // Priority breakdown
    const priorityBreakdown = {
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    };

    // Assignee workload
    const users = db.getAllUsers();
    const workload = users.map(user => {
      const userTasks = tasks.filter(t => t.assigneeId === user.id);
      return {
        user,
        total: userTasks.length,
        completed: userTasks.filter(t => t.status === 'completed').length,
        inProgress: userTasks.filter(t => t.status === 'in_progress').length,
        pending: userTasks.filter(t => t.status !== 'completed').length
      };
    });

    return res.json({
      counts,
      completionRate,
      priorityBreakdown,
      workload
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// GET /api/tasks/activity/log - Recent activity feed
router.get('/activity/log', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const activities = db.getActivities(limit);
    const enrichedActivities = activities.map(act => ({
      ...act,
      user: db.findUserById(act.userId) || { name: 'Teammate', avatar: '' }
    }));
    return res.json({ activities: enrichedActivities });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// GET /api/tasks/:id - Single task
router.get('/:id', (req, res) => {
  try {
    const task = db.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.json({ task: enrichTask(task) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create task
router.post('/', (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assigneeId, tags, subtasks } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const newTask = db.createTask(
      { title, description, status, priority, dueDate, assigneeId, tags, subtasks },
      req.user.id
    );

    const enriched = enrichTask(newTask);

    // Broadcast real-time event to all connected clients
    broadcast('TASK_CREATED', {
      task: enriched,
      actor: { id: req.user.id, name: req.user.name }
    });

    return res.status(201).json({
      message: 'Task created successfully',
      task: enriched
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', (req, res) => {
  try {
    const existing = db.getTaskById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldStatus = existing.status;
    const updated = db.updateTask(req.params.id, req.body, req.user.id);
    const enriched = enrichTask(updated);

    // Broadcast event
    const eventType = req.body.status && req.body.status !== oldStatus ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED';
    broadcast(eventType, {
      task: enriched,
      previousStatus: oldStatus,
      newStatus: updated.status,
      actor: { id: req.user.id, name: req.user.name }
    });

    return res.json({
      message: 'Task updated successfully',
      task: enriched
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', (req, res) => {
  try {
    const existing = db.getTaskById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const deleted = db.deleteTask(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete task' });
    }

    // Broadcast event
    broadcast('TASK_DELETED', {
      taskId: req.params.id,
      taskTitle: existing.title,
      actor: { id: req.user.id, name: req.user.name }
    });

    return res.json({
      message: 'Task deleted successfully',
      taskId: req.params.id
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/comments - Add comment
router.post('/:id/comments', (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const result = db.addComment(req.params.id, {
      content,
      userId: req.user.id
    });

    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const enrichedComment = {
      ...result.comment,
      user: db.findUserById(req.user.id)
    };

    // Broadcast event
    broadcast('COMMENT_ADDED', {
      taskId: req.params.id,
      comment: enrichedComment,
      actor: { id: req.user.id, name: req.user.name }
    });

    return res.status(201).json({
      message: 'Comment added',
      comment: enrichedComment
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

// PATCH /api/tasks/:id/subtasks/:subtaskId/toggle
router.patch('/:id/subtasks/:subtaskId/toggle', (req, res) => {
  try {
    const updated = db.toggleSubtask(req.params.id, req.params.subtaskId, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Task or subtask not found' });
    }

    const enriched = enrichTask(updated);

    // Broadcast event
    broadcast('TASK_UPDATED', {
      task: enriched,
      actor: { id: req.user.id, name: req.user.name }
    });

    return res.json({
      message: 'Subtask status toggled',
      task: enriched
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle subtask' });
  }
});

module.exports = router;
