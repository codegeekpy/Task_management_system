/**
 * Analytics & Metrics Dashboard Controller
 * Pure SVG charts, KPI metrics, velocity calculation, and team workload capacity
 */
const analyticsView = (() => {
  const metricTotal = document.getElementById('metricTotal');
  const metricCompletionRate = document.getElementById('metricCompletionRate');
  const metricCompletedCount = document.getElementById('metricCompletedCount');
  const metricInProgress = document.getElementById('metricInProgress');
  const metricOverdue = document.getElementById('metricOverdue');
  const metricUrgentCount = document.getElementById('metricUrgentCount');

  const statusDistributionChart = document.getElementById('statusDistributionChart');
  const priorityDonutChart = document.getElementById('priorityDonutChart');
  const teamWorkloadList = document.getElementById('teamWorkloadList');

  async function render() {
    try {
      const stats = await api.getStatsSummary();
      renderKPIs(stats);
      renderStatusChart(stats.counts);
      renderPriorityChart(stats.priorityBreakdown);
      renderWorkload(stats.workload);
    } catch (err) {
      console.error('Failed to load analytics stats:', err);
    }
  }

  function renderKPIs(stats) {
    const { counts, completionRate } = stats;

    if (metricTotal) metricTotal.textContent = counts.total;
    if (metricCompletionRate) metricCompletionRate.textContent = `${completionRate}%`;
    if (metricCompletedCount) metricCompletedCount.textContent = `${counts.completed} completed`;
    if (metricInProgress) metricInProgress.textContent = counts.in_progress;
    if (metricOverdue) metricOverdue.textContent = counts.overdue;
    if (metricUrgentCount) metricUrgentCount.textContent = `${counts.urgent} urgent pending`;
  }

  function renderStatusChart(counts) {
    if (!statusDistributionChart) return;

    const total = counts.total || 1;
    const items = [
      { label: 'To Do', count: counts.todo, color: 'var(--status-todo)', pct: Math.round((counts.todo / total) * 100) },
      { label: 'In Progress', count: counts.in_progress, color: 'var(--status-inprogress)', pct: Math.round((counts.in_progress / total) * 100) },
      { label: 'Under Review', count: counts.review, color: 'var(--status-review)', pct: Math.round((counts.review / total) * 100) },
      { label: 'Completed', count: counts.completed, color: 'var(--status-completed)', pct: Math.round((counts.completed / total) * 100) }
    ];

    statusDistributionChart.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 14px;">
        ${items.map(it => `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.825rem;">
              <span style="font-weight: 600;">${it.label}</span>
              <span class="text-muted">${it.count} tasks (${it.pct}%)</span>
            </div>
            <div style="height: 10px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
              <div style="width: ${it.pct}%; height: 100%; background: ${it.color}; border-radius: var(--radius-full); transition: width 0.6s ease;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderPriorityChart(breakdown) {
    if (!priorityDonutChart) return;

    const total = (breakdown.urgent + breakdown.high + breakdown.medium + breakdown.low) || 1;
    const urgentPct = (breakdown.urgent / total) * 100;
    const highPct = (breakdown.high / total) * 100;
    const medPct = (breakdown.medium / total) * 100;
    const lowPct = (breakdown.low / total) * 100;

    // SVG Donut calculation
    const radius = 38;
    const circ = 2 * Math.PI * radius; // ~238.76

    const uStroke = (urgentPct / 100) * circ;
    const hStroke = (highPct / 100) * circ;
    const mStroke = (medPct / 100) * circ;
    const lStroke = (lowPct / 100) * circ;

    const uOffset = 0;
    const hOffset = -uStroke;
    const mOffset = -(uStroke + hStroke);
    const lOffset = -(uStroke + hStroke + mStroke);

    priorityDonutChart.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-around; width: 100%; gap: 16px;">
        <svg width="140" height="140" viewBox="0 0 100 100" style="transform: rotate(-90deg); flex-shrink: 0;">
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--bg-tertiary)" stroke-width="14" />
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--p-urgent)" stroke-width="14"
            stroke-dasharray="${uStroke} ${circ - uStroke}" stroke-dashoffset="${uOffset}" stroke-linecap="round" />
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--p-high)" stroke-width="14"
            stroke-dasharray="${hStroke} ${circ - hStroke}" stroke-dashoffset="${hOffset}" />
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--p-medium)" stroke-width="14"
            stroke-dasharray="${mStroke} ${circ - mStroke}" stroke-dashoffset="${mOffset}" />
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--p-low)" stroke-width="14"
            stroke-dasharray="${lStroke} ${circ - lStroke}" stroke-dashoffset="${lOffset}" />
          <text x="50" y="52" fill="var(--text-primary)" font-size="14" font-weight="800" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 50 50)">
            ${total}
          </text>
        </svg>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--p-urgent);"></span>
            <span>Urgent: <strong>${breakdown.urgent}</strong> (${Math.round(urgentPct)}%)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--p-high);"></span>
            <span>High: <strong>${breakdown.high}</strong> (${Math.round(highPct)}%)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--p-medium);"></span>
            <span>Medium: <strong>${breakdown.medium}</strong> (${Math.round(medPct)}%)</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--p-low);"></span>
            <span>Low: <strong>${breakdown.low}</strong> (${Math.round(lowPct)}%)</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderWorkload(workload) {
    if (!teamWorkloadList || !workload) return;

    teamWorkloadList.innerHTML = workload.map(item => {
      const u = item.user;
      const progress = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;

      return `
        <div class="workload-item">
          <div class="workload-header">
            <img src="${u.avatar}" alt="${escapeHtml(u.name)}">
            <div class="workload-user-info">
              <span class="workload-name">${escapeHtml(u.name)}</span>
              <span class="workload-role">${escapeHtml(u.role)}</span>
            </div>
            <span style="margin-left: auto; font-weight: 700; font-size: 0.85rem; color: var(--accent-primary);">
              ${progress}% done
            </span>
          </div>
          <div class="workload-counts">
            <div class="workload-count-item">Total: <strong>${item.total}</strong></div>
            <div class="workload-count-item">Completed: <strong class="text-emerald">${item.completed}</strong></div>
            <div class="workload-count-item">In Progress: <strong class="text-cyan">${item.inProgress}</strong></div>
            <div class="workload-count-item">Pending: <strong>${item.pending}</strong></div>
          </div>
          <div style="height: 6px; background: var(--bg-primary); border-radius: var(--radius-full); overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: var(--accent-gradient); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    render
  };
})();
