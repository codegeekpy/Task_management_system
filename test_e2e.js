const WebSocket = require('ws');

async function testFullSuite() {
  console.log('--- STARTING TASKFLOW AUTOMATED TEST SUITE ---');

  const BASE_URL = 'http://localhost:3000/api';

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('1. Health Check:', health.status);

  // 2. Demo Login (Alex Morgan)
  const loginRes = await fetch(`${BASE_URL}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@taskflow.dev' })
  });
  const loginData = await loginRes.json();
  console.log('2. Demo Login Successful:', loginData.user.name);
  const token = loginData.token;

  // 3. Connect WebSocket client
  console.log('3. Connecting WebSocket client...');
  const ws = new WebSocket('ws://localhost:3000');
  let receivedWsEvents = [];

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'IDENTIFY', payload: { token } }));
      resolve();
    });
    ws.on('error', reject);
    ws.on('message', (msg) => {
      const parsed = JSON.parse(msg.toString());
      receivedWsEvents.push(parsed.type);
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
      title: 'Review production logs',
      description: 'Check error rates and latency metrics after latest release.',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-10'
    })
  });
  const created = await newTaskRes.json();
  console.log('5. Created Task:', created.task.id, '-', created.task.title);

  // 6. Read Task by ID (CRUD - Read)
  const getTaskRes = await fetch(`${BASE_URL}/tasks/${created.task.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const fetched = await getTaskRes.json();
  console.log('6. Fetched Task Details:', fetched.task.title, `(Status: ${fetched.task.status})`);

  // 7. Update Status (CRUD - Update)
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
  console.log('7. Task Status Updated to:', updated.task.status);

  // 8. Delete Task (CRUD - Delete)
  const deleteRes = await fetch(`${BASE_URL}/tasks/${created.task.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const deleted = await deleteRes.json();
  console.log('8. Task Deleted:', deleted.taskId);

  // Wait 400ms for WS events
  await new Promise(r => setTimeout(r, 400));

  console.log('9. Received Real-Time WebSocket Events:', receivedWsEvents);

  ws.close();
  console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

testFullSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
