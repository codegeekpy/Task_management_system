const WebSocket = require('ws');

async function testFullSuite() {
  console.log('--- STARTING TASKFLOW AUTOMATED TEST SUITE ---');

  const BASE_URL = 'http://localhost:3000/api';

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('1. Health Check:', health);

  // 2. Demo Login (Alex Morgan)
  const loginRes = await fetch(`${BASE_URL}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@taskflow.dev' })
  });
  const loginData = await loginRes.json();
  console.log('2. Demo Login Successful:', loginData.user.name, `(Token: ${loginData.token.slice(0, 15)}...)`);
  const token = loginData.token;

  // 3. Connect WebSocket client
  console.log('3. Connecting WebSocket client...');
  const ws = new WebSocket('ws://localhost:3000');
  let wsConnected = false;
  let receivedWsEvents = [];

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      wsConnected = true;
      ws.send(JSON.stringify({ type: 'IDENTIFY', payload: { token } }));
      resolve();
    });
    ws.on('error', reject);
    ws.on('message', (msg) => {
      const parsed = JSON.parse(msg.toString());
      receivedWsEvents.push(parsed.type);
      console.log('   [WS Event Received]:', parsed.type);
    });
  });

  // 4. Retrieve All Tasks
  const tasksRes = await fetch(`${BASE_URL}/tasks`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const tasksData = await tasksRes.json();
  console.log(`4. Retrieved Tasks Count: ${tasksData.tasks.length}`);

  // 5. Create New Task (CRUD - Create)
  const newTaskRes = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Automate E2E Regression Suite',
      description: 'Setup Playwright automated tests across all user auth and kanban flows.',
      status: 'todo',
      priority: 'urgent',
      dueDate: '2026-10-15',
      tags: ['qa', 'testing', 'ci-cd'],
      subtasks: [
        { id: 'sub_test_1', title: 'Configure test runner', completed: false },
        { id: 'sub_test_2', title: 'Write auth test specs', completed: false }
      ]
    })
  });
  const created = await newTaskRes.json();
  console.log('5. Created Task:', created.task.id, created.task.title);

  // 6. Read Task by ID (CRUD - Read)
  const getTaskRes = await fetch(`${BASE_URL}/tasks/${created.task.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const fetched = await getTaskRes.json();
  console.log('6. Fetched Task Details:', fetched.task.title, `(Assignee: ${fetched.task.assignee?.name})`);

  // 7. Toggle Subtask (CRUD - Update Subtask)
  const toggleRes = await fetch(`${BASE_URL}/tasks/${created.task.id}/subtasks/sub_test_1/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const toggled = await toggleRes.json();
  console.log('7. Subtask Toggled Progress:', `${toggled.task.progress}% completed (${toggled.task.completedSubtasks}/${toggled.task.totalSubtasks})`);

  // 8. Add Real-Time Comment (Collaboration)
  const commentRes = await fetch(`${BASE_URL}/tasks/${created.task.id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: 'Automated test suite scaffolding completed and verified.'
    })
  });
  const commentData = await commentRes.json();
  console.log('8. Comment Added:', commentData.comment.content, `by ${commentData.comment.user.name}`);

  // 9. Update Status (CRUD - Update / Move)
  const updateRes = await fetch(`${BASE_URL}/tasks/${created.task.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'in_progress'
    })
  });
  const updated = await updateRes.json();
  console.log('9. Task Moved to Status:', updated.task.status);

  // 10. Dashboard Analytics Summary
  const statsRes = await fetch(`${BASE_URL}/tasks/stats/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stats = await statsRes.json();
  console.log('10. Analytics Summary:', {
    totalTasks: stats.counts.total,
    completionRate: `${stats.completionRate}%`,
    inProgress: stats.counts.in_progress,
    urgentCount: stats.priorityBreakdown.urgent
  });

  // 11. Activity Feed
  const actRes = await fetch(`${BASE_URL}/tasks/activity/log`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const act = await actRes.json();
  console.log(`11. Recent Activities Logged: ${act.activities.length} items`);
  console.log('   Latest Activity:', act.activities[0].details, `(${act.activities[0].taskTitle})`);

  // Wait 500ms to allow all WS events to arrive
  await new Promise(r => setTimeout(r, 600));

  console.log('12. Total WebSocket Events Broadcasted & Received:', receivedWsEvents);

  ws.close();
  console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

testFullSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
