/**
 * Authentication & User Session Controller
 */
const auth = (() => {
  let currentUser = null;
  let allUsers = [];

  // DOM Elements
  const authModalOverlay = document.getElementById('authModalOverlay');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');

  const navUserAvatar = document.getElementById('navUserAvatar');
  const navUserName = document.getElementById('navUserName');
  const navUserRole = document.getElementById('navUserRole');
  const userProfileBtn = document.getElementById('userProfileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const demoSwitchList = document.getElementById('demoSwitchList');

  const btnEditProfile = document.getElementById('btnEditProfile');
  const btnResetData = document.getElementById('btnResetData');
  const btnLogout = document.getElementById('btnLogout');

  const profileModalOverlay = document.getElementById('profileModalOverlay');
  const profileForm = document.getElementById('profileForm');
  const profileNameInput = document.getElementById('profileNameInput');
  const profileRoleInput = document.getElementById('profileRoleInput');
  const profileAvatarInput = document.getElementById('profileAvatarInput');
  const profileCurrentPassword = document.getElementById('profileCurrentPassword');
  const profileNewPassword = document.getElementById('profileNewPassword');
  const btnProfileModalClose = document.getElementById('btnProfileModalClose');
  const btnCancelProfileModal = document.getElementById('btnCancelProfileModal');

  function init() {
    setupEventListeners();
    checkSession();
  }

  function setupEventListeners() {
    // Auth Tabs
    tabLoginBtn?.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
    });

    tabRegisterBtn?.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
    });

    // 1-Click Demo Profiles inside Auth Modal
    document.querySelectorAll('.demo-card').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.demoEmail;
        if (email) {
          await handleDemoLogin(email);
        }
      });
    });

    // Login Form Submit
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      const submitBtn = document.getElementById('btnLoginSubmit');
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        const res = await api.login(email, password);
        api.setToken(res.token);
        setCurrentUser(res.user);
        closeAuthModal();
        toast.success(`Welcome back, ${res.user.name}!`);
        wsClient.identify();
        window.dispatchEvent(new CustomEvent('auth:login_success'));
      } catch (err) {
        toast.error(err.message || 'Login failed. Please check credentials.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to TaskFlow';
      }
    });

    // Register Form Submit
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const role = document.getElementById('regRole').value;
      const submitBtn = document.getElementById('btnRegisterSubmit');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        const res = await api.register({ name, email, password, role });
        api.setToken(res.token);
        setCurrentUser(res.user);
        closeAuthModal();
        toast.success(`Welcome to TaskFlow, ${res.user.name}!`);
        wsClient.identify();
        window.dispatchEvent(new CustomEvent('auth:login_success'));
      } catch (err) {
        toast.error(err.message || 'Registration failed.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });

    // User Profile Dropdown Toggle
    userProfileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('show');
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!profileDropdown?.contains(e.target) && !userProfileBtn?.contains(e.target)) {
        profileDropdown?.classList.remove('show');
      }
    });

    // Edit Profile Modal
    btnEditProfile?.addEventListener('click', () => {
      profileDropdown.classList.remove('show');
      openProfileModal();
    });

    btnProfileModalClose?.addEventListener('click', closeProfileModal);
    btnCancelProfileModal?.addEventListener('click', closeProfileModal);
    profileModalOverlay?.addEventListener('click', (e) => {
      if (e.target === profileModalOverlay) closeProfileModal();
    });

    // Profile Form Submit
    profileForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updates = {
        name: profileNameInput.value.trim(),
        role: profileRoleInput.value.trim(),
        avatar: profileAvatarInput.value.trim()
      };

      if (profileNewPassword.value) {
        updates.currentPassword = profileCurrentPassword.value;
        updates.newPassword = profileNewPassword.value;
      }

      try {
        const res = await api.updateProfile(updates);
        setCurrentUser(res.user);
        closeProfileModal();
        toast.success('Profile updated successfully');
        wsClient.identify();
        window.dispatchEvent(new CustomEvent('auth:profile_updated'));
      } catch (err) {
        toast.error(err.message || 'Failed to update profile');
      }
    });

    // Reset Demo Data
    btnResetData?.addEventListener('click', async () => {
      if (confirm('Reset workspace database to initial demo state? All demo tasks and activities will be restored.')) {
        profileDropdown.classList.remove('show');
        try {
          await api.resetDatabase();
          toast.success('Workspace reset to default demo data');
          window.dispatchEvent(new CustomEvent('data:refreshed'));
        } catch (err) {
          toast.error('Failed to reset database');
        }
      }
    });

    // Logout
    btnLogout?.addEventListener('click', () => {
      logout();
    });

    // Listen for unauthorized 401 events from API
    window.addEventListener('auth:unauthorized', () => {
      logout(false);
      openAuthModal();
    });
  }

  async function checkSession() {
    const token = api.getToken();
    if (!token) {
      // Auto demo-login with Alex Morgan if first visit, or show auth modal
      // Let's perform a smooth demo login for immediate instant delight!
      await handleDemoLogin('alex@taskflow.dev', true);
      return;
    }

    try {
      const res = await api.getMe();
      setCurrentUser(res.user);
      wsClient.identify();
      window.dispatchEvent(new CustomEvent('auth:login_success'));
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      api.setToken(null);
      await handleDemoLogin('alex@taskflow.dev', true);
    }
  }

  async function handleDemoLogin(email, silent = false) {
    try {
      const res = await api.demoLogin(email);
      api.setToken(res.token);
      setCurrentUser(res.user);
      closeAuthModal();
      if (!silent) toast.success(`Signed in as ${res.user.name}`);
      wsClient.identify();
      window.dispatchEvent(new CustomEvent('auth:login_success'));
    } catch (err) {
      console.error('Demo login error:', err);
      openAuthModal();
    }
  }

  function setCurrentUser(user) {
    currentUser = user;
    if (!user) return;

    if (navUserAvatar) navUserAvatar.src = user.avatar;
    if (navUserName) navUserName.textContent = user.name;
    if (navUserRole) navUserRole.textContent = user.role;
    if (dropdownUserName) dropdownUserName.textContent = user.name;
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email;

    const commentAvatar = document.getElementById('commentUserAvatar');
    if (commentAvatar) commentAvatar.src = user.avatar;

    loadTeamUsers();
  }

  async function loadTeamUsers() {
    try {
      const res = await api.getTeamUsers();
      allUsers = res.users || [];
      renderDemoSwitchList();
      renderSidebarTeam();
      populateAssigneeDropdowns();
    } catch (err) {
      console.error('Failed to load team users:', err);
    }
  }

  function renderDemoSwitchList() {
    if (!demoSwitchList) return;
    demoSwitchList.innerHTML = allUsers.map(u => {
      const isActive = currentUser && currentUser.id === u.id;
      return `
        <button class="demo-switch-item ${isActive ? 'active' : ''}" data-email="${u.email}">
          <img src="${u.avatar}" alt="${u.name}">
          <span>${u.name} (${u.role.split(' ')[0]})</span>
          ${isActive ? '<span style="margin-left:auto; color:var(--accent-primary);">&#10003;</span>' : ''}
        </button>
      `;
    }).join('');

    demoSwitchList.querySelectorAll('.demo-switch-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const email = btn.dataset.email;
        profileDropdown.classList.remove('show');
        if (email && (!currentUser || currentUser.email !== email)) {
          await handleDemoLogin(email);
        }
      });
    });
  }

  function renderSidebarTeam() {
    const sidebarTeamList = document.getElementById('sidebarTeamList');
    if (!sidebarTeamList) return;

    sidebarTeamList.innerHTML = allUsers.map(u => `
      <button class="member-item" data-user-id="${u.id}" title="Filter by ${u.name}">
        <img src="${u.avatar}" alt="${u.name}">
        <div class="member-info">
          <span class="member-name">${u.name}</span>
          <span class="member-role">${u.role}</span>
        </div>
      </button>
    `).join('');

    sidebarTeamList.querySelectorAll('.member-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.userId;
        const assigneeSelect = document.getElementById('filterAssigneeSelect');
        if (assigneeSelect) {
          assigneeSelect.value = assigneeSelect.value === userId ? 'all' : userId;
          assigneeSelect.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  function populateAssigneeDropdowns() {
    const taskAssigneeSelect = document.getElementById('taskAssigneeSelect');
    const filterAssigneeSelect = document.getElementById('filterAssigneeSelect');

    if (taskAssigneeSelect) {
      taskAssigneeSelect.innerHTML = allUsers.map(u => `
        <option value="${u.id}">${u.name} (${u.role})</option>
      `).join('');
    }

    if (filterAssigneeSelect) {
      filterAssigneeSelect.innerHTML = `
        <option value="all">All Assignees</option>
        ${allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
      `;
    }
  }

  function openAuthModal() {
    authModalOverlay?.classList.add('open');
  }

  function closeAuthModal() {
    authModalOverlay?.classList.remove('open');
  }

  function openProfileModal() {
    if (!currentUser) return;
    profileNameInput.value = currentUser.name || '';
    profileRoleInput.value = currentUser.role || '';
    profileAvatarInput.value = currentUser.avatar || '';
    profileCurrentPassword.value = '';
    profileNewPassword.value = '';
    profileModalOverlay?.classList.add('open');
  }

  function closeProfileModal() {
    profileModalOverlay?.classList.remove('open');
  }

  function logout(showMessage = true) {
    api.setToken(null);
    currentUser = null;
    profileDropdown?.classList.remove('show');
    if (showMessage) toast.info('Signed out successfully');
    openAuthModal();
  }

  return {
    init,
    getCurrentUser: () => currentUser,
    getAllUsers: () => allUsers,
    openAuthModal,
    closeAuthModal,
    logout,
    loadTeamUsers
  };
})();
