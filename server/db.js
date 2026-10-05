const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbData = null;

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function getInitialData() {
  const now = new Date();
  const d = (offsetDays) => {
    const date = new Date(now.getTime() + offsetDays * 86400000);
    return date.toISOString().split('T')[0];
  };

  const users = [
    {
      id: 'usr_alex',
      name: 'Alex Morgan',
      email: 'alex@taskflow.dev',
      password: hashPassword('password123'),
      role: 'Team Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString()
    },
    {
      id: 'usr_sarah',
      name: 'Sarah Chen',
      email: 'sarah@taskflow.dev',
      password: hashPassword('password123'),
      role: 'Full-Stack Developer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      createdAt: new Date(now.getTime() - 25 * 86400000).toISOString()
    },
    {
      id: 'usr_david',
      name: 'David Kim',
      email: 'david@taskflow.dev',
      password: hashPassword('password123'),
      role: 'Product Designer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      createdAt: new Date(now.getTime() - 20 * 86400000).toISOString()
    },
    {
      id: 'usr_elena',
      name: 'Elena Rostova',
      email: 'elena@taskflow.dev',
      password: hashPassword('password123'),
      role: 'DevOps Engineer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      createdAt: new Date(now.getTime() - 15 * 86400000).toISOString()
    }
  ];

  const tasks = [
    {
      id: 'tsk_1',
      title: 'Real-time WebSocket Gateway',
      description: 'Implement bidirectional real-time event broadcasting for live task board syncing, member presence, and live notifications.',
      status: 'in_progress', // 'todo' | 'in_progress' | 'review' | 'completed'
      priority: 'urgent',    // 'low' | 'medium' | 'high' | 'urgent'
      dueDate: d(1),
      assigneeId: 'usr_sarah',
      creatorId: 'usr_alex',
      tags: ['backend', 'websockets', 'architecture'],
      subtasks: [
        { id: 'sub_1_1', title: 'Heartbeat ping-pong monitoring', completed: true },
        { id: 'sub_1_2', title: 'Live message broadcasting handler', completed: true },
        { id: 'sub_1_3', title: 'Client auto-reconnect backoff', completed: false },
        { id: 'sub_1_4', title: 'Stress test 100 concurrent streams', completed: false }
      ],
      comments: [
        {
          id: 'cm_1',
          userId: 'usr_alex',
          content: 'Keep payload sizes compact to minimize overhead on low-bandwidth mobile devices.',
          createdAt: new Date(now.getTime() - 12 * 3600000).toISOString()
        },
        {
          id: 'cm_2',
          userId: 'usr_sarah',
          content: 'Heartbeat protocol is implemented and reconnection backoff is in progress now!',
          createdAt: new Date(now.getTime() - 4 * 3600000).toISOString()
        }
      ],
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 3600000).toISOString()
    },
    {
      id: 'tsk_2',
      title: 'Interactive Analytics & Metrics Dashboard',
      description: 'Design intuitive visual widgets showing task distribution by priority, velocity completion rate, and workload balance.',
      status: 'in_progress',
      priority: 'high',
      dueDate: d(2),
      assigneeId: 'usr_alex',
      creatorId: 'usr_alex',
      tags: ['frontend', 'metrics', 'charts'],
      subtasks: [
        { id: 'sub_2_1', title: 'Throughput velocity SVG chart', completed: true },
        { id: 'sub_2_2', title: 'Priority distribution donut widget', completed: false },
        { id: 'sub_2_3', title: 'Team member workload breakdown', completed: false }
      ],
      comments: [
        {
          id: 'cm_3',
          userId: 'usr_david',
          content: 'I provided color variables for the chart accents in the design system.',
          createdAt: new Date(now.getTime() - 8 * 3600000).toISOString()
        }
      ],
      createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 3600000).toISOString()
    },
    {
      id: 'tsk_3',
      title: 'Design System & Micro-Interactions',
      description: 'Build a cohesive theme system with dark/light mode toggle, glassmorphism cards, responsive typography, and tactile drag states.',
      status: 'todo',
      priority: 'high',
      dueDate: d(3),
      assigneeId: 'usr_david',
      creatorId: 'usr_alex',
      tags: ['design', 'css', 'ui/ux'],
      subtasks: [
        { id: 'sub_3_1', title: 'CSS variable tokens for light & dark palettes', completed: true },
        { id: 'sub_3_2', title: 'Smooth drag-and-drop indicator styling', completed: false },
        { id: 'sub_3_3', title: 'Mobile drawer navigation animations', completed: false },
        { id: 'sub_3_4', title: 'Custom priority and status badges', completed: true }
      ],
      comments: [],
      createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 86400000).toISOString()
    },
    {
      id: 'tsk_4',
      title: 'Database Query Optimization & Safety',
      description: 'Implement atomic disk writing, backup snapshots, and benchmark query latencies under multi-user concurrent loads.',
      status: 'todo',
      priority: 'medium',
      dueDate: d(5),
      assigneeId: 'usr_elena',
      creatorId: 'usr_alex',
      tags: ['backend', 'database', 'performance'],
      subtasks: [
        { id: 'sub_4_1', title: 'Atomic file rename write strategy', completed: true },
        { id: 'sub_4_2', title: 'In-memory index caching', completed: false },
        { id: 'sub_4_3', title: 'Automated seed reset endpoint for demo', completed: true }
      ],
      comments: [],
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 86400000).toISOString()
    },
    {
      id: 'tsk_5',
      title: 'User Profile & Settings Modal',
      description: 'Allow team members to update their display names, avatar image URLs, notification preferences, and change passwords securely.',
      status: 'review',
      priority: 'medium',
      dueDate: d(2),
      assigneeId: 'usr_david',
      creatorId: 'usr_sarah',
      tags: ['frontend', 'auth', 'settings'],
      subtasks: [
        { id: 'sub_5_1', title: 'Avatar preview with immediate local fallback', completed: true },
        { id: 'sub_5_2', title: 'Current password verification on change', completed: true },
        { id: 'sub_5_3', title: 'Responsive slide-over panel on mobile', completed: true }
      ],
      comments: [
        {
          id: 'cm_4',
          userId: 'usr_sarah',
          content: 'Password update API endpoint is tested and ready for review.',
          createdAt: new Date(now.getTime() - 6 * 3600000).toISOString()
        }
      ],
      createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 5 * 3600000).toISOString()
    },
    {
      id: 'tsk_6',
      title: 'JWT Authentication & Role Authorization',
      description: 'Implement secure login, registration, JWT token signing, verification middleware, and role-based permissions.',
      status: 'completed',
      priority: 'high',
      dueDate: d(-1),
      assigneeId: 'usr_sarah',
      creatorId: 'usr_alex',
      tags: ['backend', 'security', 'auth'],
      subtasks: [
        { id: 'sub_6_1', title: 'Bcrypt password hashing', completed: true },
        { id: 'sub_6_2', title: 'JWT token signing and expiration', completed: true },
        { id: 'sub_6_3', title: 'Bearer token authorization middleware', completed: true },
        { id: 'sub_6_4', title: 'Pre-seeded demo user credentials', completed: true }
      ],
      comments: [
        {
          id: 'cm_5',
          userId: 'usr_alex',
          content: 'Verified with all 4 demo team members. Working smoothly.',
          createdAt: new Date(now.getTime() - 24 * 3600000).toISOString()
        }
      ],
      createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 24 * 3600000).toISOString()
    },
    {
      id: 'tsk_7',
      title: 'Server Scaffolding & Production Pipeline',
      description: 'Configure Express server, static asset bundling, CORS headers, error boundaries, and environment configurations.',
      status: 'completed',
      priority: 'low',
      dueDate: d(-3),
      assigneeId: 'usr_elena',
      creatorId: 'usr_alex',
      tags: ['devops', 'express', 'setup'],
      subtasks: [
        { id: 'sub_7_1', title: 'Express application bootstrap', completed: true },
        { id: 'sub_7_2', title: 'Static frontend routing', completed: true },
        { id: 'sub_7_3', title: 'Cross-origin resource sharing configuration', completed: true }
      ],
      comments: [],
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString()
    }
  ];

  const activities = [
    {
      id: 'act_1',
      userId: 'usr_sarah',
      action: 'updated_subtask',
      taskTitle: 'Real-time WebSocket Gateway',
      taskId: 'tsk_1',
      details: 'Marked "Live message broadcasting handler" as completed',
      timestamp: new Date(now.getTime() - 4 * 3600000).toISOString()
    },
    {
      id: 'act_2',
      userId: 'usr_david',
      action: 'moved_task',
      taskTitle: 'User Profile & Settings Modal',
      taskId: 'tsk_5',
      details: 'Moved task from "In Progress" to "Review"',
      timestamp: new Date(now.getTime() - 5 * 3600000).toISOString()
    },
    {
      id: 'act_3',
      userId: 'usr_alex',
      action: 'created_task',
      taskTitle: 'Interactive Analytics & Metrics Dashboard',
      taskId: 'tsk_2',
      details: 'Created new task assigned to Alex Morgan',
      timestamp: new Date(now.getTime() - 18 * 3600000).toISOString()
    },
    {
      id: 'act_4',
      userId: 'usr_sarah',
      action: 'completed_task',
      taskTitle: 'JWT Authentication & Role Authorization',
      taskId: 'tsk_6',
      details: 'Marked task as Completed',
      timestamp: new Date(now.getTime() - 24 * 3600000).toISOString()
    }
  ];

  return { users, tasks, activities };
}

function loadDb() {
  if (dbData) return dbData;

  if (!fs.existsSync(DB_FILE)) {
    dbData = getInitialData();
    saveDb();
  } else {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(raw);
    } catch (err) {
      console.error('Error reading db.json, generating default data:', err);
      dbData = getInitialData();
      saveDb();
    }
  }
  return dbData;
}

function saveDb() {
  if (!dbData) return;
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// User Helpers
function findUserByEmail(email) {
  const db = loadDb();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  const db = loadDb();
  const u = db.users.find(u => u.id === id);
  if (!u) return null;
  // Return safe representation without password
  const { password, ...safeUser } = u;
  return safeUser;
}

function getAllUsers() {
  const db = loadDb();
  return db.users.map(({ password, ...safeUser }) => safeUser);
}

function createUser({ name, email, password, role, avatar }) {
  const db = loadDb();
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error('A user with this email already exists');
  }

  const newUser = {
    id: 'usr_' + crypto.randomBytes(6).toString('hex'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashPassword(password),
    role: role || 'Member',
    avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDb();

  const { password: _, ...safeUser } = newUser;
  return safeUser;
}

function updateUser(userId, updates) {
  const db = loadDb();
  const index = db.users.findIndex(u => u.id === userId);
  if (index === -1) return null;

  if (updates.name) db.users[index].name = updates.name.trim();
  if (updates.role) db.users[index].role = updates.role.trim();
  if (updates.avatar) db.users[index].avatar = updates.avatar.trim();
  if (updates.password) db.users[index].password = hashPassword(updates.password);

  saveDb();
  const { password: _, ...safeUser } = db.users[index];
  return safeUser;
}

// Task Helpers
function getAllTasks(filter = {}) {
  const db = loadDb();
  let tasks = [...db.tasks];

  if (filter.status && filter.status !== 'all') {
    tasks = tasks.filter(t => t.status === filter.status);
  }
  if (filter.priority && filter.priority !== 'all') {
    tasks = tasks.filter(t => t.priority === filter.priority);
  }
  if (filter.assigneeId && filter.assigneeId !== 'all') {
    tasks = tasks.filter(t => t.assigneeId === filter.assigneeId);
  }
  if (filter.tag && filter.tag !== 'all') {
    tasks = tasks.filter(t => t.tags && t.tags.includes(filter.tag));
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  return tasks;
}

function getTaskById(id) {
  const db = loadDb();
  return db.tasks.find(t => t.id === id) || null;
}

function createTask(taskData, creatorId) {
  const db = loadDb();
  const newTask = {
    id: 'tsk_' + crypto.randomBytes(6).toString('hex'),
    title: taskData.title ? taskData.title.trim() : 'Untitled Task',
    description: taskData.description ? taskData.description.trim() : '',
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    assigneeId: taskData.assigneeId || creatorId,
    creatorId: creatorId,
    tags: Array.isArray(taskData.tags) ? taskData.tags : (taskData.tags ? taskData.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []),
    subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks.map((st, i) => ({
      id: st.id || `sub_${Date.now()}_${i}`,
      title: st.title || 'Subtask',
      completed: !!st.completed
    })) : [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.tasks.unshift(newTask);
  saveDb();

  logActivity({
    userId: creatorId,
    action: 'created_task',
    taskTitle: newTask.title,
    taskId: newTask.id,
    details: `Created task with priority "${newTask.priority}"`
  });

  return newTask;
}

function updateTask(id, updates, userId) {
  const db = loadDb();
  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) return null;

  const current = db.tasks[index];
  const oldStatus = current.status;
  const oldPriority = current.priority;

  if (updates.title !== undefined) current.title = updates.title.trim();
  if (updates.description !== undefined) current.description = updates.description.trim();
  if (updates.status !== undefined) current.status = updates.status;
  if (updates.priority !== undefined) current.priority = updates.priority;
  if (updates.dueDate !== undefined) current.dueDate = updates.dueDate;
  if (updates.assigneeId !== undefined) current.assigneeId = updates.assigneeId;
  if (updates.tags !== undefined) {
    current.tags = Array.isArray(updates.tags) 
      ? updates.tags 
      : updates.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  if (updates.subtasks !== undefined && Array.isArray(updates.subtasks)) {
    current.subtasks = updates.subtasks;
  }

  current.updatedAt = new Date().toISOString();
  saveDb();

  // Log activity
  if (updates.status && updates.status !== oldStatus) {
    logActivity({
      userId: userId || current.assigneeId,
      action: 'moved_task',
      taskTitle: current.title,
      taskId: current.id,
      details: `Changed status from ${oldStatus.replace('_', ' ')} to ${updates.status.replace('_', ' ')}`
    });
  } else if (updates.priority && updates.priority !== oldPriority) {
    logActivity({
      userId: userId || current.assigneeId,
      action: 'updated_priority',
      taskTitle: current.title,
      taskId: current.id,
      details: `Changed priority to ${updates.priority}`
    });
  } else {
    logActivity({
      userId: userId || current.assigneeId,
      action: 'updated_task',
      taskTitle: current.title,
      taskId: current.id,
      details: `Updated task details`
    });
  }

  return current;
}

function deleteTask(id, userId) {
  const db = loadDb();
  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) return false;

  const deleted = db.tasks.splice(index, 1)[0];
  saveDb();

  logActivity({
    userId: userId || deleted.creatorId,
    action: 'deleted_task',
    taskTitle: deleted.title,
    taskId: deleted.id,
    details: `Task removed`
  });

  return deleted;
}

function addComment(taskId, { content, userId }) {
  const db = loadDb();
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return null;

  if (!task.comments) task.comments = [];
  const comment = {
    id: 'cm_' + crypto.randomBytes(4).toString('hex'),
    userId,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  task.comments.push(comment);
  task.updatedAt = new Date().toISOString();
  saveDb();

  logActivity({
    userId,
    action: 'added_comment',
    taskTitle: task.title,
    taskId: task.id,
    details: `Commented: "${comment.content.slice(0, 40)}${comment.content.length > 40 ? '...' : ''}"`
  });

  return { comment, task };
}

function toggleSubtask(taskId, subtaskId, userId) {
  const db = loadDb();
  const task = db.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks) return null;

  const sub = task.subtasks.find(s => s.id === subtaskId);
  if (!sub) return null;

  sub.completed = !sub.completed;
  task.updatedAt = new Date().toISOString();
  saveDb();

  logActivity({
    userId: userId || task.assigneeId,
    action: 'updated_subtask',
    taskTitle: task.title,
    taskId: task.id,
    details: `${sub.completed ? 'Completed' : 'Unchecked'} subtask: "${sub.title}"`
  });

  return task;
}

// Activity Helpers
function logActivity({ userId, action, taskTitle, taskId, details }) {
  const db = loadDb();
  const act = {
    id: 'act_' + crypto.randomBytes(6).toString('hex'),
    userId,
    action,
    taskTitle,
    taskId,
    details,
    timestamp: new Date().toISOString()
  };

  db.activities.unshift(act);
  // Keep latest 100 activities
  if (db.activities.length > 100) {
    db.activities = db.activities.slice(0, 100);
  }
  saveDb();
  return act;
}

function getActivities(limit = 25) {
  const db = loadDb();
  return db.activities.slice(0, limit);
}

function resetDatabase() {
  dbData = getInitialData();
  saveDb();
  return dbData;
}

module.exports = {
  loadDb,
  saveDb,
  findUserByEmail,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  toggleSubtask,
  logActivity,
  getActivities,
  resetDatabase
};
