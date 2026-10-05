/**
 * Calendar Schedule View Controller
 * Monthly calendar grid, due date chips, deadline highlights, and day-click task creation
 */
const calendarView = (() => {
  const monthTitle = document.getElementById('calendarMonthTitle');
  const daysGrid = document.getElementById('calendarDaysGrid');
  const prevBtn = document.getElementById('calPrevMonth');
  const nextBtn = document.getElementById('calNextMonth');
  const todayBtn = document.getElementById('calTodayBtn');

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-indexed
  let currentTasks = [];

  function init() {
    prevBtn?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      render(currentTasks);
    });

    nextBtn?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      render(currentTasks);
    });

    todayBtn?.addEventListener('click', () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      render(currentTasks);
    });
  }

  function render(tasks) {
    currentTasks = tasks || [];
    if (!daysGrid) return;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayIndex = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (monthTitle) {
      monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    // Map tasks by date YYYY-MM-DD
    const taskMap = {};
    currentTasks.forEach(task => {
      if (task.dueDate) {
        if (!taskMap[task.dueDate]) taskMap[task.dueDate] = [];
        taskMap[task.dueDate].push(task);
      }
    });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    daysGrid.innerHTML = '';

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `
        <div class="day-header">
          <span class="day-number">${dayNum}</span>
        </div>
      `;
      daysGrid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayTasks = taskMap[dateStr] || [];

      const cell = document.createElement('div');
      cell.className = `calendar-day-cell ${isToday ? 'today' : ''}`;
      cell.dataset.date = dateStr;

      cell.innerHTML = `
        <div class="day-header">
          <span class="day-number">${day}</span>
          ${dayTasks.length > 0 ? `<span class="badge-subtle" style="font-size:0.65rem;">${dayTasks.length}</span>` : ''}
        </div>
        <div class="calendar-tasks-container">
          ${dayTasks.slice(0, 3).map(task => `
            <div class="cal-task-chip ${task.priority}" data-task-id="${task.id}" title="${escapeHtml(task.title)} (${task.priority})">
              ${escapeHtml(task.title)}
            </div>
          `).join('')}
          ${dayTasks.length > 3 ? `
            <div class="text-muted" style="font-size:0.68rem; padding-left:4px;">+${dayTasks.length - 3} more</div>
          ` : ''}
        </div>
      `;

      // Click cell to create new task on this date
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.cal-task-chip')) return;
        taskModal.openCreateModal('todo', dateStr);
      });

      // Click chip to open detail
      cell.querySelectorAll('.cal-task-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskId = chip.dataset.taskId;
          taskModal.openDetailModal(taskId);
        });
      });

      daysGrid.appendChild(cell);
    }

    // Next month padding days to fill 7-col grid (up to 35 or 42 cells)
    const filledCells = startDayIndex + totalDays;
    const remainingCells = (7 - (filledCells % 7)) % 7;
    for (let d = 1; d <= remainingCells; d++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `
        <div class="day-header">
          <span class="day-number">${d}</span>
        </div>
      `;
      daysGrid.appendChild(cell);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    render
  };
})();
