const { WebSocketServer, WebSocket } = require('ws');
const { verifyToken } = require('./auth');
const db = require('./db');

let wss = null;
const clients = new Map(); // ws -> { userId, name, avatar, role, lastSeen }

function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    clients.set(ws, { userId: null, lastSeen: Date.now() });

    ws.on('pong', () => {
      ws.isAlive = true;
      const clientInfo = clients.get(ws);
      if (clientInfo) clientInfo.lastSeen = Date.now();
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(ws, data);
      } catch (err) {
        console.error('Invalid WS message received:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastPresence();
    });

    ws.on('error', (err) => {
      console.warn('WS Client error:', err.message);
      clients.delete(ws);
    });

    // Send welcome message
    sendTo(ws, 'CONNECTED', {
      message: 'Connected to TaskFlow Real-time Engine',
      timestamp: new Date().toISOString()
    });

    broadcastPresence();
  });

  // Heartbeat interval to check alive clients
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        clients.delete(ws);
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  return wss;
}

function handleClientMessage(ws, data) {
  const { type, payload } = data;

  switch (type) {
    case 'IDENTIFY': {
      // Client identifies themselves using their JWT token or user profile
      if (payload && payload.token) {
        const decoded = verifyToken(payload.token);
        if (decoded) {
          const user = db.findUserById(decoded.id);
          if (user) {
            clients.set(ws, {
              userId: user.id,
              name: user.name,
              avatar: user.avatar,
              role: user.role,
              lastSeen: Date.now()
            });
            broadcastPresence();
          }
        }
      }
      break;
    }

    case 'TYPING': {
      // Broadcast user typing or viewing a task
      broadcast('USER_TYPING', {
        taskId: payload.taskId,
        userId: payload.userId,
        userName: payload.userName
      }, ws);
      break;
    }

    case 'PING': {
      sendTo(ws, 'PONG', { time: Date.now() });
      break;
    }

    default:
      break;
  }
}

function sendTo(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type, payload }));
    } catch (err) {
      console.error('Error sending WS message:', err);
    }
  }
}

function broadcast(type, payload, excludeWs = null) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });

  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Error broadcasting WS message:', err);
      }
    }
  });
}

function broadcastPresence() {
  const onlineMap = new Map();
  clients.forEach((info) => {
    if (info.userId) {
      onlineMap.set(info.userId, {
        userId: info.userId,
        name: info.name,
        avatar: info.avatar,
        role: info.role
      });
    }
  });

  const onlineUsers = Array.from(onlineMap.values());
  broadcast('PRESENCE_UPDATE', {
    totalConnections: clients.size,
    onlineUsers,
    count: Math.max(onlineUsers.length, clients.size)
  });
}

module.exports = {
  setupWebSocket,
  broadcast,
  broadcastPresence,
  sendTo
};
