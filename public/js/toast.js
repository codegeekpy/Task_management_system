/**
 * Modern Toast Notification System
 */
const toast = (() => {
  const container = document.getElementById('toastContainer');

  function show(message, type = 'info', duration = 3500) {
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;

    let iconSvg = '';
    switch (type) {
      case 'success':
        iconSvg = '<svg class="toast-icon text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        break;
      case 'error':
        iconSvg = '<svg class="toast-icon text-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        break;
      case 'warning':
        iconSvg = '<svg class="toast-icon text-high" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        break;
      default:
        iconSvg = '<svg class="toast-icon text-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        break;
    }

    toastEl.innerHTML = `
      ${iconSvg}
      <div class="toast-message">${escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismiss(toastEl));

    container.appendChild(toastEl);

    if (duration > 0) {
      setTimeout(() => dismiss(toastEl), duration);
    }

    return toastEl;
  }

  function dismiss(toastEl) {
    if (!toastEl) return;
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 200);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    show,
    success: (msg, duration) => show(msg, 'success', duration),
    error: (msg, duration) => show(msg, 'error', duration),
    warning: (msg, duration) => show(msg, 'warning', duration),
    info: (msg, duration) => show(msg, 'info', duration)
  };
})();
