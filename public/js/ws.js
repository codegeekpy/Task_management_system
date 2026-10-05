/**
 * TaskFlow Real-Time WebSocket Client
 * Bidirectional event synchronization, heartbeat, presence tracking, and auto-reconnect
 */
const wsClient = (() => {
  let socket = null;
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  const maxReconnectDelay = 10000;
  const listeners = new Map(); // event -> Set of callbacks

  const statusBadge = document.getElementById('liveStatusBadge');
  const onlineCountEl = document.getElementById('onlineCount');
  const onlinePill = document.getElementById('onlinePill');

  function getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      socket = new WebSocket(getWsUrl());

      socket.onopen = () => {
        reconnectAttempts = 0;
        updateBadgeStatus(true);
        // Identify ourselves if logged in
        identify();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        updateBadgeStatus(false);
        scheduleReconnect();
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        socket.close();
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), maxReconnectDelay);
    reconnectAttempts++;
    reconnectTimeout = setTimeout(() => {
      connect();
    }, delay);
  }

  function updateBadgeStatus(connected) {
    if (!statusBadge) return;
    const dot = statusBadge.querySelector('.status-dot');
    const label = statusBadge.querySelector('.status-label');

    if (connected) {
      statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      statusBadge.style.color = '#34d399';
      if (dot) {
        dot.style.backgroundColor = '#10b981';
        dot.classList.add('pulsing');
      }
      if (label) label.textContent = 'Live Sync';
    } else {
      statusBadge.style.borderColor = 'rgba(244, 63, 94, 0.25)';
      statusBadge.style.color = '#f43f5e';
      if (dot) {
        dot.style.backgroundColor = '#f43f5e';
        dot.classList.remove('pulsing');
      }
      if (label) label.textContent = 'Reconnecting...';
    }
  }

  function identify() {
    const token = api.getToken();
    if (token && socket && socket.readyState === WebSocket.OPEN) {
      send('IDENTIFY', { token });
    }
  }

  function send(type, payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  }

  function handleMessage(data) {
    const { type, payload } = data;

    // Internal presence handler
    if (type === 'PRESENCE_UPDATE') {
      if (onlineCountEl && payload) {
        onlineCountEl.textContent = payload.count || 1;
      }
      if (onlinePill && payload && payload.onlineUsers) {
        const names = payload.onlineUsers.map(u => u.name).join(', ');
        onlinePill.title = `Active teammates: ${names || 'Just you'}`;
      }
    }

    // Trigger registered event callbacks
    if (listeners.has(type)) {
      listeners.get(type).forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in WS listener for ${type}:`, e);
        }
      });
    }

    // Also dispatch on window for broad decoupled listeners
    window.dispatchEvent(new CustomEvent(`ws:${type}`, { detail: payload }));
  }

  function on(eventType, callback) {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    listeners.get(eventType).add(callback);
    return () => off(eventType, callback);
  }

  function off(eventType, callback) {
    if (listeners.has(eventType)) {
      listeners.get(eventType).delete(callback);
    }
  }

  function emitTyping(taskId, userId, userName) {
    send('TYPING', { taskId, userId, userName });
  }

  return {
    connect,
    identify,
    send,
    on,
    off,
    emitTyping
  };
})();
