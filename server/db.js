const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbData = null;

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Minimal, clean initial seed data
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
      role: 'Product Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      createdAt: now.toISOString()
    },
    {
      id: 'usr_sarah',
      name: 'Sarah Chen',
      email: 'sarah@taskflow.dev',
      password: hashPassword('password123'),
      role: 'Developer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      createdAt: now.toISOString()
    }
  ];

  const tasks = [
    {
      id: 'tsk_1',
      title: 'Design clean mobile interface',
      description: 'Create a clean, minimalist layout with plenty of whitespace and easy navigation.',
      status: 'in_progress',
      priority: 'high',
      dueDate: d(2),
      assigneeId: 'usr_alex',
      creatorId: 'usr_alex',
      tags: ['design'],
      subtasks: [],
      comments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'tsk_2',
      title: 'Launch landing page',
      description: 'Finalize copy and publish the project landing page.',
      status: 'todo',
      priority: 'medium',
      dueDate: d(4),
      assigneeId: 'usr_sarah',
      creatorId: 'usr_alex',
      tags: ['marketing'],
      subtasks: [],
      comments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'tsk_3',
      title: 'Project setup & authentication',
      description: 'Setup initial codebase, JWT auth, and database persistence.',
      status: 'completed',
      priority: 'low',
      dueDate: d(-1),
      assigneeId: 'usr_sarah',
      creatorId: 'usr_alex',
      tags: ['setup'],
      subtasks: [],
      comments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  const activities = [
    {
      id: 'act_1',
      userId: 'usr_alex',
      action: 'started_task',
      taskTitle: 'Design clean mobile interface',
      taskId: 'tsk_1',
      details: 'Started working on mobile interface',
      timestamp: now.toISOString()
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

function findUserByEmail(email) {
  const db = loadDb();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  const db = loadDb();
  const u = db.users.find(u => u.id === id);
  if (!u) return null;
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
    id: 'usr_' + crypto.randomBytes(4).toString('hex'),
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
    id: 'tsk_' + crypto.randomBytes(4).toString('hex'),
    title: taskData.title ? taskData.title.trim() : 'Untitled Task',
    description: taskData.description ? taskData.description.trim() : '',
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    assigneeId: taskData.assigneeId || creatorId,
    creatorId: creatorId,
    tags: Array.isArray(taskData.tags) ? taskData.tags : [],
    subtasks: [],
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
    details: 'Created task'
  });

  return newTask;
}

function updateTask(id, updates, userId) {
  const db = loadDb();
  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) return null;

  const current = db.tasks[index];
  const oldStatus = current.status;

  if (updates.title !== undefined) current.title = updates.title.trim();
  if (updates.description !== undefined) current.description = updates.description.trim();
  if (updates.status !== undefined) current.status = updates.status;
  if (updates.priority !== undefined) current.priority = updates.priority;
  if (updates.dueDate !== undefined) current.dueDate = updates.dueDate;
  if (updates.assigneeId !== undefined) current.assigneeId = updates.assigneeId;

  current.updatedAt = new Date().toISOString();
  saveDb();

  if (updates.status && updates.status !== oldStatus) {
    logActivity({
      userId: userId || current.assigneeId,
      action: 'moved_task',
      taskTitle: current.title,
      taskId: current.id,
      details: `Moved to ${updates.status.replace('_', ' ')}`
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
  return deleted;
}

function logActivity({ userId, action, taskTitle, taskId, details }) {
  const db = loadDb();
  const act = {
    id: 'act_' + crypto.randomBytes(4).toString('hex'),
    userId,
    action,
    taskTitle,
    taskId,
    details,
    timestamp: new Date().toISOString()
  };

  db.activities.unshift(act);
  if (db.activities.length > 50) {
    db.activities = db.activities.slice(0, 50);
  }
  saveDb();
  return act;
}

function getActivities(limit = 15) {
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
  logActivity,
  getActivities,
  resetDatabase
};
