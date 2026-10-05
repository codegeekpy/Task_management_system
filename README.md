# 🚀 TaskFlow — Real-Time Collaborative Task Management Application

A full-stack, real-time task management web application built with **Node.js, Express, WebSockets, Vanilla JS, and custom Vanilla CSS**.

![TaskFlow Interface](https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

### 1. 🔐 User Authentication & Authorization
- **JWT-based Security**: Secure token signing, 7-day expiration, and bcrypt password hashing.
- **Role-based Team Presence**: Pre-configured demo profiles (`Team Lead`, `Full-Stack Developer`, `Product Designer`, `DevOps Engineer`).
- **⚡ 1-Click Instant Demo Login**: Switch seamlessly between Alex Morgan, Sarah Chen, David Kim, and Elena Rostova to test multi-user collaboration in seconds.
- **User Profile Management**: Edit display name, role, avatar URL, and update passwords.

### 2. 📋 Comprehensive CRUD Operations
- **Create**: Add tasks with title, rich description, priority (`Urgent`, `High`, `Medium`, `Low`), status (`To Do`, `In Progress`, `Under Review`, `Completed`), due dates, assignee, tag chips, and interactive checklists.
- **Read & Views**:
  - 📋 **Kanban Board**: Drag-and-drop columns with column counters, priority badges, tags, and progress bars.
  - 📑 **Interactive List View**: Multi-column sortable table with inline status toggling, quick search, and bulk selection.
  - 📅 **Calendar Schedule**: Monthly grid displaying task cards on their due dates with 1-click creation on any date.
  - 📊 **Metrics & Analytics**: Pure SVG throughput velocity gauges, status breakdown bars, and priority distribution donuts.
- **Update**: Modal edit, quick status and priority dropdowns, and drag-and-drop column transitions.
- **Delete**: Task removal with confirmation and live broadcast.

### 3. ⚡ Bidirectional Real-Time WebSockets
- **Live Sync Engine**: Integrated WebSocket server automatically broadcasts all task actions:
  - `TASK_CREATED`
  - `TASK_UPDATED`
  - `TASK_STATUS_CHANGED`
  - `TASK_DELETED`
  - `COMMENT_ADDED`
  - `USER_TYPING`
  - `PRESENCE_UPDATE`
- **Presence Tracking**: Live indicator badge with active peer count and teammate name tooltips.
- **Live Activity Feed**: Slide-over drawer with real-time stream of all user actions.
- **Toast Notifications**: Non-intrusive alerts when team members create, move, or comment on tasks.

### 4. 🎨 Premium Responsive Design
- **Theme Switcher**: Smooth dark mode (obsidian / indigo neon) and clean light mode.
- **Glassmorphism**: Backdrop blur filters, translucent borders, and ambient glow effects.
- **Mobile Optimized**: Touch-friendly layouts, mobile quick-move selectors, and slide-out navigation.
- **Keyboard Shortcuts**: `Ctrl + K` (Search), `N` (New Task), `Escape` (Close modals).

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, WebSocket (`ws`), JWT (`jsonwebtoken`), Bcrypt (`bcryptjs`), CORS
- **Storage**: Persistent JSON database with atomic writes (no external DB service setup required)
- **Frontend**: HTML5, Vanilla JavaScript (ES modules/modular pattern), Custom Vanilla CSS design system
- **Icons & Fonts**: Google Fonts (*Inter*, *Plus Jakarta Sans*), SVG vector icons

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will boot at: **`http://localhost:3000`**

### 3. Run Automated Tests
```bash
npm test
```

---

## 👥 Demo Accounts (Pre-Seeded)

All demo accounts use password: `password123` (or click their 1-click card in the UI):

| Name | Email | Role |
| :--- | :--- | :--- |
| **Alex Morgan** | `alex@taskflow.dev` | Team Lead |
| **Sarah Chen** | `sarah@taskflow.dev` | Full-Stack Developer |
| **David Kim** | `david@taskflow.dev` | Product Designer |
| **Elena Rostova** | `elena@taskflow.dev` | DevOps Engineer |

---

## 📂 Project Structure

```
Task_management_system/
├── data/
│   └── db.json               # Auto-generated persistent database
├── public/
│   ├── css/
│   │   └── style.css         # Design system & responsive styles
│   ├── js/
│   │   ├── api.js            # Authenticated API client
│   │   ├── app.js            # Master application controller
│   │   ├── auth.js           # Authentication & user sessions
│   │   ├── calendar.js       # Calendar view controller
│   │   ├── kanban.js         # Drag-and-drop Kanban controller
│   │   ├── list.js           # Interactive table controller
│   │   ├── modal.js          # Task creation & detail modals
│   │   ├── toast.js          # Modern toast notifications
│   │   └── ws.js             # WebSocket real-time client
│   └── index.html            # Single Page Application
├── server/
│   ├── auth.js               # JWT signing & verify middleware
│   ├── db.js                 # Atomic JSON database & seed data
│   ├── routes/
│   │   ├── authRoutes.js     # Auth & team endpoints
│   │   └── taskRoutes.js     # Task CRUD & analytics endpoints
│   ├── server.js             # Express & WebSocket entrypoint
│   └── websocket.js          # Real-time event broadcasting
├── package.json
├── test_e2e.js               # Full integration test suite
└── README.md
```
