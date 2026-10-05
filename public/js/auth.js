/**
 * Minimal Authentication Controller
 */
const auth = (() => {
  let currentUser = null;
  let allUsers = [];

  const modal = document.getElementById('authModalOverlay');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');

  const navAvatar = document.getElementById('navUserAvatar');
  const navName = document.getElementById('navUserName');
  const profileBtn = document.getElementById('userProfileBtn');
  const dropdown = document.getElementById('profileDropdown');
  const dropdownName = document.getElementById('dropdownUserName');
  const dropdownEmail = document.getElementById('dropdownUserEmail');
  const demoList = document.getElementById('demoSwitchList');
  const btnReset = document.getElementById('btnResetData');
  const btnLogout = document.getElementById('btnLogout');

  function init() {
    setupListeners();
    checkSession();
  }

  function setupListeners() {
    // 1-Click Login buttons in modal
    document.querySelectorAll('.quick-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.demoEmail;
        if (email) await handleDemoLogin(email);
      });
    });

    // Login Form Submit
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await api.login(loginEmail.value.trim(), loginPassword.value);
        api.setToken(res.token);
        setCurrentUser(res.user);
        closeModal();
        toast.success(`Welcome, ${res.user.name}`);
        wsClient.identify();
        window.dispatchEvent(new CustomEvent('auth:login_success'));
      } catch (err) {
        toast.error(err.message || 'Login failed');
      }
    });

    // Profile Dropdown Toggle
    profileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown?.contains(e.target) && !profileBtn?.contains(e.target)) {
        dropdown?.classList.remove('show');
      }
    });

    // Reset Data
    btnReset?.addEventListener('click', async () => {
      if (confirm('Reset workspace to clean demo state?')) {
        dropdown.classList.remove('show');
        try {
          await api.resetDatabase();
          toast.success('Reset to clean initial state');
          window.dispatchEvent(new CustomEvent('data:refreshed'));
        } catch (err) {
          toast.error('Failed to reset');
        }
      }
    });

    // Logout
    btnLogout?.addEventListener('click', () => {
      api.setToken(null);
      currentUser = null;
      dropdown.classList.remove('show');
      openModal();
    });

    window.addEventListener('auth:unauthorized', () => {
      api.setToken(null);
      openModal();
    });
  }

  async function checkSession() {
    const token = api.getToken();
    if (!token) {
      await handleDemoLogin('alex@taskflow.dev', true);
      return;
    }

    try {
      const res = await api.getMe();
      setCurrentUser(res.user);
      wsClient.identify();
      window.dispatchEvent(new CustomEvent('auth:login_success'));
    } catch (err) {
      api.setToken(null);
      await handleDemoLogin('alex@taskflow.dev', true);
    }
  }

  async function handleDemoLogin(email, silent = false) {
    try {
      const res = await api.demoLogin(email);
      api.setToken(res.token);
      setCurrentUser(res.user);
      closeModal();
      if (!silent) toast.success(`Active user: ${res.user.name}`);
      wsClient.identify();
      window.dispatchEvent(new CustomEvent('auth:login_success'));
    } catch (err) {
      openModal();
    }
  }

  function setCurrentUser(user) {
    currentUser = user;
    if (!user) return;

    if (navAvatar) navAvatar.src = user.avatar;
    if (navName) navName.textContent = user.name;
    if (dropdownName) dropdownName.textContent = user.name;
    if (dropdownEmail) dropdownEmail.textContent = user.email;

    loadUsers();
  }

  async function loadUsers() {
    try {
      const res = await api.getTeamUsers();
      allUsers = res.users || [];
      renderDemoUsers();
      populateAssigneeSelect();
    } catch (err) {}
  }

  function renderDemoUsers() {
    if (!demoList) return;
    demoList.innerHTML = allUsers.map(u => `
      <button class="demo-user-item" data-email="${u.email}">
        <img src="${u.avatar}" alt="${u.name}">
        <span>${u.name}</span>
        ${currentUser && currentUser.id === u.id ? '<span style="margin-left:auto; color:var(--primary);">&#10003;</span>' : ''}
      </button>
    `).join('');

    demoList.querySelectorAll('.demo-user-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.remove('show');
        const email = btn.dataset.email;
        if (email && (!currentUser || currentUser.email !== email)) {
          await handleDemoLogin(email);
        }
      });
    });
  }

  function populateAssigneeSelect() {
    const sel = document.getElementById('taskAssigneeSelect');
    if (!sel) return;
    sel.innerHTML = allUsers.map(u => `
      <option value="${u.id}">${u.name}</option>
    `).join('');
  }

  function openModal() { modal?.classList.add('open'); }
  function closeModal() { modal?.classList.remove('open'); }

  return {
    init,
    getCurrentUser: () => currentUser,
    getAllUsers: () => allUsers
  };
})();
