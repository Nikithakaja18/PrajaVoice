/**
 * Evidence and complaint workflow verification.
 */

const assert = require('assert');
const { fork } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pallepraja-test-'));
const OFFICER_ID = 'field-officer-test';
const OFFICER_PASSWORD = 'test-officer-password-123';
const SANITATION_OFFICER_ID = 'sanitation-officer-test';
const SANITATION_OFFICER_PASSWORD = 'test-sanitation-password-123';
const ADMIN_ID = 'district-admin-test';
const ADMIN_PASSWORD = 'test-admin-password-123';
const GRAMA_ID = 'grama-sachivalayam-test';
const GRAMA_PASSWORD = 'test-grama-password-123';
const DISTRICT_ID = 'district-authority-test';
const DISTRICT_PASSWORD = 'test-district-password-123';
const RESET_DISTRICT_PASSWORD = 'test-reset-district-password-123';
const INACTIVE_DISTRICT_ID = 'inactive-district-test';
const INACTIVE_DISTRICT_PASSWORD = 'test-inactive-password-123';
const DISTRICT_SAMPLE_ID = 'PP-2026-SN-9002';
const DISTRICT_DEMO_IDS = [
  'PP-2026-SN-9002',
  'PP-2026-WT-9003',
  'PP-2026-EL-9005'
];
const AUTH_TOKEN_SECRET = crypto.randomBytes(48).toString('hex');
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
  'base64'
);

let serverProcess;
let serverPort;

function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function signedToken(payload) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(signedContent).digest('base64url');
  return `${signedContent}.${signature}`;
}

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const requestHeaders = { ...headers };
    let requestBody = body;
    if (body && !Buffer.isBuffer(body)) {
      requestBody = Buffer.from(JSON.stringify(body));
      requestHeaders['Content-Type'] = 'application/json';
    }
    if (requestBody) requestHeaders['Content-Length'] = requestBody.length;

    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: urlPath,
      method,
      headers: requestHeaders,
      timeout: 10000
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        const isJson = String(res.headers['content-type'] || '').includes('application/json');
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: isJson ? JSON.parse(responseBody.toString('utf8')) : responseBody
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error('Request timed out.')));
    req.on('error', reject);
    if (requestBody) req.write(requestBody);
    req.end();
  });
}

function multipart(type, fileBytes, filename, mimeType, inspectionNotes) {
  const boundary = `----PallePrajaTest${Date.now()}${Math.random().toString(16).slice(2)}`;
  const parts = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${type}\r\n`),
    ...(inspectionNotes ? [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="inspectionNotes"\r\n\r\n${inspectionNotes}\r\n`)
    ] : []),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ];
  return {
    body: Buffer.concat(parts),
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
  };
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function startServer(withAuthentication = true) {
  serverPort = await findAvailablePort();
  const serverEnv = {
    ...process.env,
    PORT: String(serverPort),
    PALLE_PRAJA_DATA_DIR: TEST_DATA_DIR
  };
  if (withAuthentication) {
    serverEnv.AUTH_TOKEN_SECRET = AUTH_TOKEN_SECRET;
  } else {
    serverEnv.AUTH_TOKEN_SECRET = '';
  }

  serverProcess = fork(path.join(__dirname, '..', 'server.js'), [], {
    stdio: 'inherit',
    env: serverEnv
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await request('GET', '/api/complaints');
      if (response.status === 200) return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error('Test server did not start in time.');
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const processToStop = serverProcess;
  await new Promise(resolve => {
    processToStop.once('exit', resolve);
    processToStop.kill();
  });
  serverProcess = null;
}

async function upload(id, type, bytes, filename, mimeType, token, inspectionNotes) {
  const form = multipart(type, bytes, filename, mimeType, inspectionNotes);
  const headers = token ? { ...form.headers, Authorization: `Bearer ${token}` } : form.headers;
  return request('POST', `/api/complaints/${id}/evidence`, form.body, headers);
}

async function runTests() {
  console.log('--- RUNNING PRAJA VOICE EVIDENCE WORKFLOW TESTS ---');
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'officers.json'), JSON.stringify([{
    username: ADMIN_ID,
    role: 'ADMIN',
    department: null,
    passwordHash: passwordHash(ADMIN_PASSWORD)
  }]));
  await startServer();

  const adminLogin = await request('POST', '/api/auth/login', {
    username: ADMIN_ID,
    password: ADMIN_PASSWORD
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.body.user.role, 'ADMIN');
  const adminToken = adminLogin.body.accessToken;
  assert.strictEqual(adminToken.split('.').length, 3);

  const unauthenticatedRegistration = await request('POST', '/api/auth/register', {
    username: OFFICER_ID,
    password: OFFICER_PASSWORD,
    role: 'OFFICER',
    department: 'Panchayat Raj Engineering Dept (PRED)'
  });
  assert.strictEqual(unauthenticatedRegistration.status, 401);
  const registeredOfficer = await request('POST', '/api/auth/register', {
    username: OFFICER_ID,
    password: OFFICER_PASSWORD,
    role: 'OFFICER',
    department: 'Panchayat Raj Engineering Dept (PRED)'
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(registeredOfficer.status, 201);
  assert.strictEqual(registeredOfficer.body.user.department, 'Panchayat Raj Engineering Dept (PRED)');
  const officerRecords = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'officers.json'), 'utf8'));
  assert.strictEqual(officerRecords.length, 2);
  assert(!JSON.stringify(officerRecords).includes(OFFICER_PASSWORD));

  const officerLogin = await request('POST', '/api/auth/login', {
    username: OFFICER_ID,
    password: OFFICER_PASSWORD
  });
  assert.strictEqual(officerLogin.status, 200);
  assert.strictEqual(officerLogin.body.user.username, OFFICER_ID);
  assert.strictEqual(officerLogin.body.user.role, 'OFFICER');
  assert.strictEqual(officerLogin.body.user.department, 'Panchayat Raj Engineering Dept (PRED)');
  const officerToken = officerLogin.body.accessToken;
  assert(officerToken);
  const invalidLogin = await request('POST', '/api/auth/login', {
    username: OFFICER_ID,
    password: 'wrong-password'
  });
  assert.strictEqual(invalidLogin.status, 401);

  const unauthenticatedGramaDashboard = await request('GET', '/api/grama/dashboard');
  const unauthenticatedDistrictDashboard = await request('GET', '/api/district/dashboard');
  assert.strictEqual(unauthenticatedGramaDashboard.status, 401);
  assert.strictEqual(unauthenticatedDistrictDashboard.status, 401);
  const loggedOutGramaPage = await request('GET', '/grama-sachivalayam/dashboard');
  const loggedOutDistrictPage = await request('GET', '/district-authority/dashboard');
  assert.strictEqual(loggedOutGramaPage.status, 302);
  assert.strictEqual(loggedOutDistrictPage.status, 302);
  assert.strictEqual(loggedOutGramaPage.headers.location, '/?portal=grama');
  assert.strictEqual(loggedOutDistrictPage.headers.location, '/?portal=district');

  const gramaAccount = await request('POST', '/api/auth/register', {
    username: GRAMA_ID,
    password: GRAMA_PASSWORD,
    role: 'GRAMA_SACHIVALAYAM'
  }, { Authorization: `Bearer ${adminToken}` });
  const districtAccount = await request('POST', '/api/auth/register', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    role: 'DISTRICT_AUTHORITY'
  }, { Authorization: `Bearer ${adminToken}` });
  const inactiveDistrictAccount = await request('POST', '/api/auth/register', {
    username: INACTIVE_DISTRICT_ID,
    password: INACTIVE_DISTRICT_PASSWORD,
    role: 'DISTRICT_AUTHORITY',
    active: false
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(gramaAccount.status, 201);
  assert.strictEqual(gramaAccount.body.user.role, 'GRAMA_SACHIVALAYAM');
  assert.strictEqual(districtAccount.status, 201);
  assert.strictEqual(inactiveDistrictAccount.status, 201);
  const duplicateGovernmentAccount = await request('POST', '/api/auth/register', {
    username: GRAMA_ID.toUpperCase(),
    password: GRAMA_PASSWORD,
    role: 'GRAMA_SACHIVALAYAM'
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(duplicateGovernmentAccount.status, 409);

  const persistedGovernmentAccounts = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'officers.json'), 'utf8'));
  for (const [username, password, role] of [
    [GRAMA_ID, GRAMA_PASSWORD, 'GRAMA_SACHIVALAYAM'],
    [DISTRICT_ID, DISTRICT_PASSWORD, 'DISTRICT_AUTHORITY']
  ]) {
    const account = persistedGovernmentAccounts.find(item => item.username === username);
    assert(account);
    assert.strictEqual(account.role, role);
    assert.match(account.passwordHash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i);
    assert(!JSON.stringify(account).includes(password));
  }

  await stopServer();
  await startServer();
  const persistedGramaLogin = await request('POST', '/api/auth/login', {
    username: `  ${GRAMA_ID.toUpperCase()}  `,
    password: GRAMA_PASSWORD,
    portalRole: 'GRAMA_SACHIVALAYAM'
  });
  const persistedDistrictLogin = await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(persistedGramaLogin.status, 200);
  assert.strictEqual(persistedGramaLogin.body.user.role, 'GRAMA_SACHIVALAYAM');
  assert.strictEqual(persistedDistrictLogin.status, 200);
  assert.strictEqual(persistedDistrictLogin.body.user.role, 'DISTRICT_AUTHORITY');

  const managedAccounts = await request('GET', '/api/auth/accounts', null, {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(managedAccounts.status, 200);
  assert(managedAccounts.body.data.some(account =>
    account.username === GRAMA_ID && account.active && account.role === 'GRAMA_SACHIVALAYAM'
  ));
  assert(managedAccounts.body.data.every(account => !Object.hasOwn(account, 'passwordHash')));
  const disableLastAdmin = await request('PATCH', `/api/auth/accounts/${encodeURIComponent(ADMIN_ID)}/status`, {
    active: false
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(disableLastAdmin.status, 409);
  const inactiveLogin = await request('POST', '/api/auth/login', {
    username: INACTIVE_DISTRICT_ID,
    password: INACTIVE_DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(inactiveLogin.status, 401);

  const gramaLogin = await request('POST', '/api/auth/login', {
    username: GRAMA_ID,
    password: GRAMA_PASSWORD,
    portalRole: 'GRAMA_SACHIVALAYAM'
  });
  assert.strictEqual(gramaLogin.status, 200);
  const incorrectGramaLogin = await request('POST', '/api/auth/login', {
    username: GRAMA_ID,
    password: 'incorrect-password',
    portalRole: 'GRAMA_SACHIVALAYAM'
  });
  assert.strictEqual(incorrectGramaLogin.status, 401);
  assert.match(incorrectGramaLogin.body.message, /Username or password is incorrect/);
  assert.match(gramaLogin.headers['set-cookie'][0], /HttpOnly/);
  assert.match(gramaLogin.headers['set-cookie'][0], /SameSite=Lax/);
  const gramaCookie = gramaLogin.headers['set-cookie'][0].split(';')[0];
  const gramaHeaders = { Cookie: gramaCookie };
  assert.strictEqual((await request('GET', '/api/auth/session', null, gramaHeaders)).body.user.role, 'GRAMA_SACHIVALAYAM');
  assert.strictEqual((await request('GET', '/api/grama/dashboard', null, gramaHeaders)).status, 200);
  assert.strictEqual((await request('GET', '/grama-sachivalayam/dashboard', null, gramaHeaders)).status, 200);
  assert.strictEqual((await request('GET', '/district-authority/dashboard', null, gramaHeaders)).status, 403);
  assert.strictEqual((await request('GET', '/api/district/dashboard', null, gramaHeaders)).status, 403);
  assert.strictEqual((await request('GET', '/api/district/reviews', null, gramaHeaders)).status, 403);
  assert.strictEqual((await request('GET', '/api/official/urgent-escalations', null, gramaHeaders)).status, 200);
  const gramaUnauthorizedRegistration = await request('POST', '/api/auth/register', {
    username: 'not-an-admin-created-user',
    password: 'some-long-password-123',
    role: 'DISTRICT_AUTHORITY'
  }, gramaHeaders);
  assert.strictEqual(gramaUnauthorizedRegistration.status, 403);
  const gramaAllowedComplaintAction = await request('PATCH', '/api/complaints/PP-2025-RD-1042', {
    status: 'not-a-status'
  }, gramaHeaders);
  assert.strictEqual(gramaAllowedComplaintAction.status, 400);
  const wrongGramaPortalLogin = await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'GRAMA_SACHIVALAYAM'
  });
  assert.strictEqual(wrongGramaPortalLogin.status, 403);

  const gramaLogout = await request('POST', '/api/auth/logout', null, gramaHeaders);
  assert.strictEqual(gramaLogout.status, 200);
  const loggedOutAccount = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'officers.json'), 'utf8'))
    .find(account => account.username === GRAMA_ID);
  assert.strictEqual(loggedOutAccount.tokenVersion, 1);
  assert.strictEqual((await request('GET', '/api/auth/session', null, gramaHeaders)).status, 401);
  assert.strictEqual((await request('GET', '/api/grama/dashboard', null, gramaHeaders)).status, 401);
  assert.strictEqual((await request('GET', '/grama-sachivalayam', null, gramaHeaders)).status, 302);

  const districtLogin = await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(districtLogin.status, 200);
  const districtCookie = districtLogin.headers['set-cookie'][0].split(';')[0];
  const districtHeaders = { Cookie: districtCookie };
  assert.strictEqual((await request('GET', '/api/auth/session', null, districtHeaders)).body.user.role, 'DISTRICT_AUTHORITY');
  assert.strictEqual((await request('GET', '/api/district/dashboard', null, districtHeaders)).status, 200);
  assert.strictEqual((await request('GET', '/district-authority/dashboard', null, districtHeaders)).status, 200);
  assert.strictEqual((await request('GET', '/api/district/dashboard', null, districtHeaders)).status, 200);
  assert.strictEqual((await request('GET', '/grama-sachivalayam/dashboard', null, districtHeaders)).status, 403);
  assert.strictEqual((await request('GET', '/api/grama/dashboard', null, districtHeaders)).status, 403);
  assert.strictEqual((await request('GET', '/api/official/urgent-escalations', null, districtHeaders)).status, 403);
  assert.strictEqual((await request('GET', '/api/district/reviews', null, districtHeaders)).status, 200);
  assert.strictEqual((await request('GET', '/api/auth/accounts', null, districtHeaders)).status, 403);
  const districtWrongAction = await request('PATCH', '/api/complaints/PP-2025-RD-1042', {
    status: 'Resolved'
  }, districtHeaders);
  assert.strictEqual(districtWrongAction.status, 403);
  const districtLogout = await request('POST', '/api/auth/logout', null, districtHeaders);
  assert.strictEqual(districtLogout.status, 200);
  assert.match(districtLogout.headers['set-cookie'][0], /Max-Age=0/);
  assert.strictEqual((await request('GET', '/api/district/dashboard', null, districtHeaders)).status, 401);
  assert.strictEqual((await request('GET', '/district-authority/dashboard', null, districtHeaders)).status, 302);
  const districtRefreshLogin = await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(districtRefreshLogin.status, 200);
  const refreshedDistrictHeaders = {
    Cookie: districtRefreshLogin.headers['set-cookie'][0].split(';')[0]
  };
  const wrongDistrictPortalLogin = await request('POST', '/api/auth/login', {
    username: GRAMA_ID,
    password: GRAMA_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(wrongDistrictPortalLogin.status, 403);
  const deactivatedAccount = await request('PATCH', `/api/auth/accounts/${encodeURIComponent(DISTRICT_ID)}/status`, {
    active: false
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(deactivatedAccount.status, 200);
  assert.strictEqual(deactivatedAccount.body.data.user.active, false);
  assert.strictEqual((await request('GET', '/api/district/dashboard', null, refreshedDistrictHeaders)).status, 401);
  const disabledDistrictLogin = await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(disabledDistrictLogin.status, 401);
  const reactivatedAccount = await request('PATCH', `/api/auth/accounts/${encodeURIComponent(DISTRICT_ID)}/status`, {
    active: true
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(reactivatedAccount.status, 200);
  assert.strictEqual((await request('GET', '/api/district/dashboard', null, refreshedDistrictHeaders)).status, 401);
  assert.strictEqual((await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  })).status, 200);
  const resetPassword = await request('PATCH', `/api/auth/accounts/${encodeURIComponent(DISTRICT_ID)}/password`, {
    password: RESET_DISTRICT_PASSWORD
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(resetPassword.status, 200);
  assert.strictEqual((await request('POST', '/api/auth/login', {
    username: DISTRICT_ID,
    password: DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  })).status, 401);
  const resetLogin = await request('POST', '/api/auth/login', {
    username: DISTRICT_ID.toUpperCase(),
    password: RESET_DISTRICT_PASSWORD,
    portalRole: 'DISTRICT_AUTHORITY'
  });
  assert.strictEqual(resetLogin.status, 200);
  const resetDistrictHeaders = {
    Cookie: resetLogin.headers['set-cookie'][0].split(';')[0]
  };

  const initial = await request('GET', '/api/complaints');
  assert.strictEqual(initial.status, 200);
  assert.strictEqual(initial.body.count, 9);
  assert(initial.body.data.every(item => Array.isArray(item.evidence) && item.evidence.length === 0));
  assert(initial.body.data.every(item => !item.citizenPhoto && !item.resolutionPhoto));
  const internalTestComplaint = initial.body.data.find(item => item.id === DISTRICT_SAMPLE_ID);
  assert(internalTestComplaint);
  assert.strictEqual(internalTestComplaint.isHackathonSample, true);
  assert.strictEqual(internalTestComplaint.sampleLabel, 'SAMPLE / HACKATHON TEST DATA');
  const publicStats = await request('GET', '/api/stats');
  assert.strictEqual(publicStats.status, 200);
  assert.strictEqual(
    publicStats.body.data.total,
    initial.body.data.filter(item => !item.isHackathonSample).length
  );
  const districtDemoComplaints = DISTRICT_DEMO_IDS.map(id =>
    initial.body.data.find(item => item.id === id)
  );
  assert(districtDemoComplaints.every(Boolean));
  assert(districtDemoComplaints.every(item =>
    item.isHackathonSample &&
    item.sampleLabel === 'SAMPLE / HACKATHON TEST DATA' &&
    item.evidence.length === 0
  ));
  assert(districtDemoComplaints.every(item =>
    Date.parse(item.createdAt) < Date.parse(item.forwardedAt)
  ));
  assert.strictEqual(new Set(districtDemoComplaints.map(item => item.createdAt)).size, 3);
  assert.strictEqual(new Set(districtDemoComplaints.map(item => item.forwardedAt)).size, 3);
  assert.deepStrictEqual(
    districtDemoComplaints.map(item => item.title),
    [
      'Overflowing drainage near Government Primary School',
      'Damaged drinking water pipeline near the village main road',
      'Non-functional streetlights near the village bus stand'
    ]
  );
  assert.deepStrictEqual(districtDemoComplaints.map(item => item.priority), ['High', 'High', 'Medium']);
  assert.strictEqual(districtDemoComplaints[0].assignedDepartment, 'Panchayat Sanitation & Public Health');
  assert.strictEqual(districtDemoComplaints[0].status, 'FORWARDED_TO_DISTRICT');
  assert.strictEqual(districtDemoComplaints[1].assignedDepartment, 'Rural Water Supply & Sanitation (RWSS)');
  assert.strictEqual(districtDemoComplaints[1].status, 'FORWARDED_TO_DISTRICT');
  assert.strictEqual(districtDemoComplaints[2].assignedDepartment, 'APCPDCL / TSSPDCL Rural Operations');
  assert.strictEqual(districtDemoComplaints[2].status, 'FORWARDED_TO_DISTRICT');
  const initialDistrictDashboard = await request(
    'GET',
    '/api/district/dashboard',
    null,
    resetDistrictHeaders
  );
  assert.strictEqual(initialDistrictDashboard.status, 200);
  assert.strictEqual(initialDistrictDashboard.body.data.length, initial.body.count);
  assert.strictEqual(
    initialDistrictDashboard.body.data.filter(item => item.forwardedAt || item.districtReviewReceivedAt).length,
    3
  );

  const unauthenticatedDistrictReviews = await request('GET', '/api/district/reviews');
  assert.strictEqual(unauthenticatedDistrictReviews.status, 401);
  const officerDistrictReviews = await request(
    'GET',
    '/api/district/reviews',
    null,
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(officerDistrictReviews.status, 403);
  const pendingDistrictReviews = await request(
    'GET',
    '/api/district/reviews',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(pendingDistrictReviews.status, 200);
  assert.strictEqual(pendingDistrictReviews.body.count, 3);
  assert.deepStrictEqual(
    pendingDistrictReviews.body.data.map(item => item.id).sort(),
    DISTRICT_DEMO_IDS.slice().sort()
  );
  const districtSample = pendingDistrictReviews.body.data.find(item => item.id === DISTRICT_SAMPLE_ID);
  assert(districtSample);
  assert.strictEqual(districtSample.id, DISTRICT_SAMPLE_ID);
  assert.strictEqual(districtSample.title, 'Overflowing drainage near Government Primary School');
  assert.strictEqual(districtSample.category, 'Sanitation and Drainage');
  assert.strictEqual(districtSample.assignedDepartment, 'Panchayat Sanitation & Public Health');
  assert.strictEqual(districtSample.priority, 'High');
  assert.strictEqual(districtSample.source, 'Grama Sachivalayam');
  assert.strictEqual(districtSample.status, 'FORWARDED_TO_DISTRICT');
  assert.strictEqual(districtSample.sampleLabel, 'SAMPLE / HACKATHON TEST DATA');
  assert(Date.parse(districtSample.createdAt) < Date.parse(districtSample.forwardedAt));
  assert.match(districtSample.districtReviewReason, /District Authority review is requested/);

  const unauthenticatedDistrictOrder = await request('GET', `/api/district/reviews/${DISTRICT_SAMPLE_ID}`);
  assert.strictEqual(unauthenticatedDistrictOrder.status, 401);
  const districtReviewDetails = await request(
    'GET',
    `/api/district/reviews/${DISTRICT_SAMPLE_ID}`,
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(districtReviewDetails.status, 200);
  assert(districtReviewDetails.body.data.description.includes('Government Primary School'));

  const unauthenticatedDistrictReturn = await request('POST', `/api/district/reviews/${DISTRICT_SAMPLE_ID}/return`, {
    instructions: 'Complete the work within 24 hours.'
  });
  assert.strictEqual(unauthenticatedDistrictReturn.status, 401);
  const officerDistrictReturn = await request(
    'POST',
    `/api/district/reviews/${DISTRICT_SAMPLE_ID}/return`,
    { instructions: 'Complete the work within 24 hours.' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(officerDistrictReturn.status, 403);
  const missingInstructions = await request(
    'POST',
    `/api/district/reviews/${DISTRICT_SAMPLE_ID}/return`,
    { instructions: '  ' },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(missingInstructions.status, 400);

  const districtInstructions = 'Deploy the sanitation crew, clear and disinfect the overflowing drain, and submit dated site photos and a completion report within 24 hours.';
  const districtReturn = await request(
    'POST',
    `/api/district/reviews/${DISTRICT_SAMPLE_ID}/return`,
    { instructions: districtInstructions },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(districtReturn.status, 200);
  assert.strictEqual(districtReturn.body.data.status, 'DISTRICT_ESCALATED');
  assert.strictEqual(districtReturn.body.data.source, 'Grama Sachivalayam');
  assert.strictEqual(districtReturn.body.data.priority, 'High');
  assert.strictEqual(districtReturn.body.data.districtAuthorityRemarks, districtInstructions);
  assert.strictEqual(districtReturn.body.data.districtEscalatedAt, districtReturn.body.data.urgentEscalation.returnedAt);
  assert.strictEqual(districtReturn.body.data.urgentEscalation.instructions, districtInstructions);
  assert.strictEqual(
    Date.parse(districtReturn.body.data.urgentEscalation.deadlineAt) -
      Date.parse(districtReturn.body.data.urgentEscalation.returnedAt),
    24 * 60 * 60 * 1000
  );
  const duplicateDistrictReturn = await request(
    'POST',
    `/api/district/reviews/${DISTRICT_SAMPLE_ID}/return`,
    { instructions: districtInstructions },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(duplicateDistrictReturn.status, 409);
  const pendingAfterDistrictReturn = await request(
    'GET',
    '/api/district/reviews',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(pendingAfterDistrictReturn.body.count, 2);
  const gramaReviewLogin = await request('POST', '/api/auth/login', {
    username: GRAMA_ID,
    password: GRAMA_PASSWORD,
    portalRole: 'GRAMA_SACHIVALAYAM'
  });
  assert.strictEqual(gramaReviewLogin.status, 200);
  const gramaReviewHeaders = {
    Cookie: gramaReviewLogin.headers['set-cookie'][0].split(';')[0]
  };
  const gramaDashboardAfterDistrictReturn = await request('GET', '/api/grama/dashboard', null, gramaReviewHeaders);
  const returnedSampleInGrama = gramaDashboardAfterDistrictReturn.body.data.find(item => item.id === DISTRICT_SAMPLE_ID);
  assert(returnedSampleInGrama);
  assert.strictEqual(returnedSampleInGrama.status, 'DISTRICT_ESCALATED');
  assert.strictEqual(returnedSampleInGrama.urgentEscalation.instructions, districtInstructions);

  const workflowComplaintResponse = await request('POST', '/api/complaints', {
    category: 'Sanitation and Drainage',
    categoryKey: 'sanitation',
    title: 'Blocked village drain near the anganwadi',
    description: 'Wastewater is backing up near the anganwadi entrance after the local drain became blocked.',
    citizenName: 'Workflow Test Citizen',
    village: 'Ramapuram',
    ward: 'Ward 5',
    landmark: 'Near the anganwadi'
  });
  assert.strictEqual(workflowComplaintResponse.status, 201);
  const workflowComplaintId = workflowComplaintResponse.body.data.id;
  const workflowGramaLogin = await request('POST', '/api/auth/login', {
    username: GRAMA_ID,
    password: GRAMA_PASSWORD
  });
  assert.strictEqual(workflowGramaLogin.status, 200);
  const workflowGramaHeaders = {
    Authorization: `Bearer ${workflowGramaLogin.body.accessToken}`
  };
  const workflowAssignment = await request('PATCH', `/api/complaints/${workflowComplaintId}`, {
    status: 'Assigned',
    assignedDepartment: 'Panchayat Sanitation & Public Health',
    assignedOfficer: GRAMA_ID
  }, workflowGramaHeaders);
  assert.strictEqual(workflowAssignment.status, 200);
  const unauthenticatedForward = await request('POST', `/api/grama/complaints/${workflowComplaintId}/forward`, {
    reason: 'Request District review.'
  });
  assert.strictEqual(unauthenticatedForward.status, 401);
  const missingForwardReason = await request(
    'POST',
    `/api/grama/complaints/${workflowComplaintId}/forward`,
    { reason: '  ' },
    workflowGramaHeaders
  );
  assert.strictEqual(missingForwardReason.status, 400);
  const workflowForward = await request(
    'POST',
    `/api/grama/complaints/${workflowComplaintId}/forward`,
    { reason: 'Village-level clearing is insufficient; request District coordination for a safe clean-up.' },
    workflowGramaHeaders
  );
  assert.strictEqual(workflowForward.status, 200);
  assert.strictEqual(workflowForward.body.data.status, 'FORWARDED_TO_DISTRICT');
  assert.strictEqual(workflowForward.body.data.id, workflowComplaintId);
  assert(Date.parse(workflowForward.body.data.createdAt) < Date.parse(workflowForward.body.data.forwardedAt));
  assert.strictEqual(workflowForward.body.data.timeline.at(-1).status, 'FORWARDED_TO_DISTRICT');
  const duplicateForward = await request(
    'POST',
    `/api/grama/complaints/${workflowComplaintId}/forward`,
    { reason: 'Duplicate should not be accepted.' },
    workflowGramaHeaders
  );
  assert.strictEqual(duplicateForward.status, 409);

  const districtWorkflowHeaders = resetDistrictHeaders;
  const forwardedWorkflowDetails = await request(
    'GET',
    `/api/district/reviews/${workflowComplaintId}`,
    null,
    districtWorkflowHeaders
  );
  assert.strictEqual(forwardedWorkflowDetails.status, 200);
  assert(forwardedWorkflowDetails.body.data.description.toLowerCase().includes('wastewater'));
  const workflowDistrictRemarks = 'Mobilize sanitation staff, clear the blocked drain, and submit a completion report within 24 hours.';
  const workflowDistrictReturn = await request(
    'POST',
    `/api/district/reviews/${workflowComplaintId}/return`,
    { instructions: workflowDistrictRemarks },
    districtWorkflowHeaders
  );
  assert.strictEqual(workflowDistrictReturn.status, 200);
  assert.strictEqual(workflowDistrictReturn.body.data.status, 'DISTRICT_ESCALATED');
  assert.strictEqual(workflowDistrictReturn.body.data.id, workflowComplaintId);
  assert.strictEqual(workflowDistrictReturn.body.data.districtAuthorityRemarks, workflowDistrictRemarks);
  assert.strictEqual(
    workflowDistrictReturn.body.data.districtEscalatedAt,
    workflowDistrictReturn.body.data.urgentEscalation.returnedAt
  );
  assert(Date.parse(workflowDistrictReturn.body.data.forwardedAt) < Date.parse(workflowDistrictReturn.body.data.districtEscalatedAt));
  assert.strictEqual(
    Date.parse(workflowDistrictReturn.body.data.urgentEscalation.deadlineAt) -
      Date.parse(workflowDistrictReturn.body.data.districtEscalatedAt),
    24 * 60 * 60 * 1000
  );
  const workflowGramaDashboard = await request(
    'GET',
    '/api/grama/dashboard',
    null,
    workflowGramaHeaders
  );
  const returnedWorkflowComplaint = workflowGramaDashboard.body.data.find(item => item.id === workflowComplaintId);
  assert(returnedWorkflowComplaint);
  assert.strictEqual(returnedWorkflowComplaint.status, 'DISTRICT_ESCALATED');
  assert.strictEqual(
    returnedWorkflowComplaint.urgentEscalation.deadlineAt,
    workflowDistrictReturn.body.data.urgentEscalation.deadlineAt
  );
  const workflowUrgentReturns = await request(
    'GET',
    '/api/official/urgent-escalations',
    null,
    workflowGramaHeaders
  );
  assert.strictEqual(workflowUrgentReturns.status, 200);
  assert(workflowUrgentReturns.body.data.some(item => item.id === workflowComplaintId));
  const missingResolutionRemarks = await request(
    'PATCH',
    `/api/complaints/${workflowComplaintId}`,
    { status: 'Resolved' },
    workflowGramaHeaders
  );
  assert.strictEqual(missingResolutionRemarks.status, 400);
  const missingResolutionProof = await request(
    'PATCH',
    `/api/complaints/${workflowComplaintId}`,
    { status: 'Resolved', resolutionRemarks: 'Drain cleared and surrounding area cleaned.' },
    workflowGramaHeaders
  );
  assert.strictEqual(missingResolutionProof.status, 422);
  const workflowResolutionProof = await upload(
    workflowComplaintId,
    'resolution',
    PNG_BYTES,
    'workflow-resolution.png',
    'image/png',
    workflowGramaLogin.body.accessToken
  );
  assert.strictEqual(workflowResolutionProof.status, 201);
  const workflowResolved = await request('PATCH', `/api/complaints/${workflowComplaintId}`, {
    status: 'Resolved',
    resolutionRemarks: 'Drain cleared and surrounding area cleaned.'
  }, workflowGramaHeaders);
  assert.strictEqual(workflowResolved.status, 200);
  assert.strictEqual(workflowResolved.body.data.status, 'Resolved');
  assert.strictEqual(workflowResolved.body.data.id, workflowComplaintId);
  assert.strictEqual(workflowResolved.body.data.resolutionRemarks, 'Drain cleared and surrounding area cleaned.');
  assert(workflowResolved.body.data.resolvedAt);
  assert.strictEqual(workflowResolved.body.data.timeline.at(-1).status, 'Resolved');
  assert.strictEqual(workflowResolved.body.data.timeline.at(-1).timestamp, workflowResolved.body.data.resolvedAt);
  assert(workflowResolved.body.data.timeline.at(-1).note.includes(workflowResolved.body.data.resolutionRemarks));
  const resolvedProof = workflowResolved.body.data.evidence.find(item => item.type === 'resolution');
  assert(resolvedProof);
  assert.strictEqual(resolvedProof.complaintId, workflowComplaintId);
  const citizenResolvedList = await request(
    'GET',
    `/api/complaints?search=${encodeURIComponent(workflowComplaintId)}`
  );
  assert.strictEqual(citizenResolvedList.status, 200);
  const citizenResolvedComplaint = citizenResolvedList.body.data.find(item => item.id === workflowComplaintId);
  assert(citizenResolvedComplaint);
  assert(!citizenResolvedComplaint.isHackathonSample);
  assert.strictEqual(citizenResolvedComplaint.status, 'Resolved');
  assert.strictEqual(citizenResolvedComplaint.resolutionRemarks, workflowResolved.body.data.resolutionRemarks);
  assert.strictEqual(citizenResolvedComplaint.resolvedAt, workflowResolved.body.data.resolvedAt);
  assert(citizenResolvedComplaint.evidence.some(item => item.id === resolvedProof.id));
  const citizenResolutionPhoto = await request('GET', resolvedProof.url);
  assert.strictEqual(citizenResolutionPhoto.status, 200);
  assert(citizenResolutionPhoto.body.equals(PNG_BYTES));
  const persistedWorkflowComplaint = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'complaints.json'), 'utf8'))
    .find(item => item.id === workflowComplaintId);
  assert(persistedWorkflowComplaint);
  assert.strictEqual(persistedWorkflowComplaint.status, 'Resolved');
  assert.strictEqual(persistedWorkflowComplaint.resolutionRemarks, workflowResolved.body.data.resolutionRemarks);
  assert.strictEqual(persistedWorkflowComplaint.resolvedAt, workflowResolved.body.data.resolvedAt);
  assert(persistedWorkflowComplaint.evidence.some(item => item.id === resolvedProof.id));
  const districtWorkflowDashboard = await request(
    'GET',
    '/api/district/dashboard',
    null,
    districtWorkflowHeaders
  );
  const resolvedWorkflowComplaint = districtWorkflowDashboard.body.data.find(item => item.id === workflowComplaintId);
  assert(resolvedWorkflowComplaint);
  assert.strictEqual(resolvedWorkflowComplaint.status, 'Resolved');
  const resolvedWorkflowOrder = await request(
    'GET',
    `/api/district/reviews/${workflowComplaintId}`,
    null,
    districtWorkflowHeaders
  );
  assert.strictEqual(resolvedWorkflowOrder.status, 200);
  assert(resolvedWorkflowOrder.body.data.evidence.some(item => item.type === 'resolution'));

  const urgentEscalationsForOtherDepartment = await request(
    'GET',
    '/api/official/urgent-escalations',
    null,
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(urgentEscalationsForOtherDepartment.status, 200);
  assert.strictEqual(urgentEscalationsForOtherDepartment.body.count, 0);

  const sanitationOfficerRegistration = await request('POST', '/api/auth/register', {
    username: SANITATION_OFFICER_ID,
    password: SANITATION_OFFICER_PASSWORD,
    role: 'OFFICER',
    department: 'Panchayat Sanitation & Public Health'
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(sanitationOfficerRegistration.status, 201);
  const sanitationOfficerLogin = await request('POST', '/api/auth/login', {
    username: SANITATION_OFFICER_ID,
    password: SANITATION_OFFICER_PASSWORD
  });
  assert.strictEqual(sanitationOfficerLogin.status, 200);
  const sanitationUrgentEscalations = await request(
    'GET',
    '/api/official/urgent-escalations',
    null,
    { Authorization: `Bearer ${sanitationOfficerLogin.body.accessToken}` }
  );
  assert.strictEqual(sanitationUrgentEscalations.status, 200);
  assert.strictEqual(sanitationUrgentEscalations.body.count, 1);
  const persistedDistrictSample = sanitationUrgentEscalations.body.data.find(item => item.id === DISTRICT_SAMPLE_ID);
  assert(persistedDistrictSample);
  assert.strictEqual(persistedDistrictSample.urgentEscalation.instructions, districtInstructions);

  await stopServer();
  await startServer();
  const persistedUrgentEscalation = await request(
    'GET',
    '/api/official/urgent-escalations',
    null,
    { Authorization: `Bearer ${sanitationOfficerLogin.body.accessToken}` }
  );
  assert.strictEqual(persistedUrgentEscalation.status, 200);
  const persistedDistrictReturn = persistedUrgentEscalation.body.data.find(item => item.id === DISTRICT_SAMPLE_ID);
  assert(persistedDistrictReturn);
  assert.strictEqual(persistedDistrictReturn.urgentEscalation.instructions, districtInstructions);
  const resolvedAfterRestart = await request(
    'GET',
    `/api/complaints/${encodeURIComponent(workflowComplaintId)}`
  );
  assert.strictEqual(resolvedAfterRestart.status, 200);
  assert.strictEqual(resolvedAfterRestart.body.data.status, 'Resolved');
  assert.strictEqual(resolvedAfterRestart.body.data.resolutionRemarks, workflowResolved.body.data.resolutionRemarks);
  assert.strictEqual(resolvedAfterRestart.body.data.resolvedAt, workflowResolved.body.data.resolvedAt);
  assert.strictEqual(
    resolvedAfterRestart.body.data.evidence.find(item => item.type === 'resolution').id,
    resolvedProof.id
  );
  assert.strictEqual(resolvedAfterRestart.body.data.timeline.at(-1).status, 'Resolved');
  const resolutionPhotoAfterRestart = await request('GET', resolvedProof.url);
  assert.strictEqual(resolutionPhotoAfterRestart.status, 200);
  assert(resolutionPhotoAfterRestart.body.equals(PNG_BYTES));

  const districtOrder = await request('GET', '/api/complaints/PP-2025-EL-3119');
  assert.strictEqual(districtOrder.status, 200);
  assert.strictEqual(districtOrder.body.data.id, 'PP-2025-EL-3119');
  assert.strictEqual(districtOrder.body.data.status, 'Escalated');
  assert(districtOrder.body.data.description);
  assert(districtOrder.body.data.assignedDepartment);
  assert(districtOrder.body.data.assignedOfficer);
  assert(districtOrder.body.data.timeline.some(item => item.status === 'Escalated' && item.timestamp));
  const missingDistrictOrder = await request('GET', '/api/complaints/PP-DOES-NOT-EXIST');
  assert.strictEqual(missingDistrictOrder.status, 404);

  const created = await request('POST', '/api/complaints', {
    category: 'Roads & Culverts',
    categoryKey: 'roads',
    title: 'Pothole near the bus stop',
    description: 'The road has a large pothole near the bus stop.',
    citizenName: 'Test Citizen',
    village: 'Ramapuram',
    ward: 'Ward 4',
    landmark: 'Village bus stop'
  });
  assert.strictEqual(created.status, 201);
  const complaintId = created.body.data.id;
  assert.strictEqual(created.body.data.evidence.length, 0);

  const unauthorizedUpdate = await request('PATCH', `/api/complaints/${complaintId}`, {
    status: 'In Progress',
    actionActor: 'Impersonated Admin'
  });
  assert.strictEqual(unauthorizedUpdate.status, 401);
  const [tokenHeader, tokenPayload, tokenSignature] = officerToken.split('.');
  const tamperedSignature = `${tokenSignature[0] === 'a' ? 'b' : 'a'}${tokenSignature.slice(1)}`;
  const tamperedToken = `${tokenHeader}.${tokenPayload}.${tamperedSignature}`;
  const tamperedUpdate = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'In Progress' },
    { Authorization: `Bearer ${tamperedToken}` }
  );
  assert.strictEqual(tamperedUpdate.status, 401);
  const expiredToken = signedToken({
    sub: OFFICER_ID,
    role: 'OFFICER',
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600
  });
  const expiredUpdate = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'In Progress' },
    { Authorization: `Bearer ${expiredToken}` }
  );
  assert.strictEqual(expiredUpdate.status, 401);
  const officerEscalatedStatus = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'Escalated' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(officerEscalatedStatus.status, 403);
  const otherDepartmentAssignment = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { assignedDepartment: 'Rural Water Supply & Sanitation (RWSS)' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(otherDepartmentAssignment.status, 403);

  const originalUpload = await upload(complaintId, 'complaint', PNG_BYTES, 'before.png', 'image/png');
  assert.strictEqual(originalUpload.status, 201);
  const originalEvidence = originalUpload.body.data;
  assert.strictEqual(originalEvidence.complaintId, complaintId);
  assert.strictEqual(originalEvidence.type, 'complaint');
  assert.strictEqual(originalEvidence.uploaderId, `citizen:${complaintId}`);
  assert.strictEqual(originalEvidence.mimeType, 'image/png');
  assert.strictEqual(originalEvidence.size, PNG_BYTES.length);
  assert(originalEvidence.uploadedAt);

  const originalImage = await request('GET', originalEvidence.url);
  assert.strictEqual(originalImage.status, 200);
  assert(originalImage.body.equals(PNG_BYTES));

  const duplicateOriginal = await upload(complaintId, 'complaint', PNG_BYTES, 'replacement.png', 'image/png');
  assert.strictEqual(duplicateOriginal.status, 409);

  const wrongMime = await upload(complaintId, 'complaint', PNG_BYTES, 'mismatch.jpg', 'image/jpeg');
  assert.strictEqual(wrongMime.status, 415);
  const unsupportedMime = await upload(complaintId, 'complaint', PNG_BYTES, 'unsupported.gif', 'image/gif');
  assert.strictEqual(unsupportedMime.status, 415);

  const oversized = await upload(
    complaintId,
    'complaint',
    Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024)]),
    'large.png',
    'image/png'
  );
  assert.strictEqual(oversized.status, 413);

  const assigned = await request('PATCH', `/api/complaints/${complaintId}`, {
    status: 'Assigned',
    assignedDepartment: 'Panchayat Raj Engineering Dept (PRED)',
    assignedOfficer: OFFICER_ID
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(assigned.status, 200);

  const otherDepartmentComplaint = await request('POST', '/api/complaints', {
    category: 'Drinking Water',
    categoryKey: 'water',
    title: 'Water supply interruption',
    description: 'Water supply has been interrupted.',
    citizenName: 'Second Test Citizen',
    village: 'Ramapuram',
    ward: 'Ward 2',
    landmark: 'Community tap'
  });
  assert.strictEqual(otherDepartmentComplaint.status, 201);
  const otherComplaintId = otherDepartmentComplaint.body.data.id;
  const assignedToOtherDepartment = await request('PATCH', `/api/complaints/${otherComplaintId}`, {
    status: 'Assigned',
    assignedDepartment: 'Rural Water Supply & Sanitation (RWSS)'
  }, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(assignedToOtherDepartment.status, 200);
  const wrongDepartmentUpdate = await request('PATCH', `/api/complaints/${otherComplaintId}`, {
    status: 'In Progress'
  }, { Authorization: `Bearer ${officerToken}` });
  assert.strictEqual(wrongDepartmentUpdate.status, 403);
  const wrongDepartmentEvidence = await upload(
    otherComplaintId,
    'progress',
    PNG_BYTES,
    'wrong-department.png',
    'image/png',
    officerToken
  );
  assert.strictEqual(wrongDepartmentEvidence.status, 403);

  const statusUpdate = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'In Progress' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(statusUpdate.status, 200);

  const unauthorizedInspection = await upload(
    complaintId,
    'inspection',
    PNG_BYTES,
    'inspection.png',
    'image/png'
  );
  assert.strictEqual(unauthorizedInspection.status, 401);
  const inspectionNotes = 'Inspected the damaged section; repair materials are on site.';
  const inspectionWithoutNotes = await upload(
    complaintId,
    'inspection',
    PNG_BYTES,
    'inspection.png',
    'image/png',
    officerToken
  );
  assert.strictEqual(inspectionWithoutNotes.status, 400);
  const inspectionUpload = await upload(
    complaintId,
    'inspection',
    PNG_BYTES,
    'inspection.png',
    'image/png',
    officerToken,
    inspectionNotes
  );
  assert.strictEqual(inspectionUpload.status, 201);
  assert.strictEqual(inspectionUpload.body.data.type, 'inspection');
  assert.strictEqual(inspectionUpload.body.data.uploaderId, OFFICER_ID);
  assert.strictEqual(inspectionUpload.body.data.inspectionNotes, inspectionNotes);

  const unauthorizedProgressUpload = await upload(
    complaintId,
    'progress',
    PNG_BYTES,
    'progress.png',
    'image/png'
  );
  assert.strictEqual(unauthorizedProgressUpload.status, 401);
  const progressUpload = await upload(
    complaintId,
    'progress',
    PNG_BYTES,
    'progress.png',
    'image/png',
    officerToken
  );
  assert.strictEqual(progressUpload.status, 201);
  assert.strictEqual(progressUpload.body.data.type, 'progress');
  assert.strictEqual(progressUpload.body.data.uploaderId, OFFICER_ID);

  const unauthorizedUpload = await upload(complaintId, 'resolution', PNG_BYTES, 'after.png', 'image/png');
  assert.strictEqual(unauthorizedUpload.status, 401);
  const invalidTokenUpload = await upload(
    complaintId,
    'resolution',
    PNG_BYTES,
    'after.png',
    'image/png',
    'invalid-token'
  );
  assert.strictEqual(invalidTokenUpload.status, 401);

  const officerEscalation = await request(
    'POST',
    `/api/complaints/${complaintId}/escalate`,
    { escalationReason: 'Test escalation' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(officerEscalation.status, 403);

  const resolveWithoutEvidence = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'Resolved' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(resolveWithoutEvidence.status, 422);
  assert.match(resolveWithoutEvidence.body.message, /resolution evidence/i);

  const resolutionUpload = await upload(
    complaintId,
    'resolution',
    PNG_BYTES,
    'after.png',
    'image/png',
    officerToken
  );
  assert.strictEqual(resolutionUpload.status, 201);
  const firstResolutionEvidence = resolutionUpload.body.data;
  assert.strictEqual(firstResolutionEvidence.complaintId, complaintId);
  assert.strictEqual(firstResolutionEvidence.type, 'resolution');
  assert.strictEqual(firstResolutionEvidence.uploaderId, OFFICER_ID);
  assert(resolutionUpload.body.data.uploadedAt);

  const resolveWithoutToken = await request('PATCH', `/api/complaints/${complaintId}`, { status: 'Resolved' });
  assert.strictEqual(resolveWithoutToken.status, 401);
  const resolved = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'Resolved', resolutionRemarks: 'Repair completed and photographed.' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(resolved.status, 200);
  assert.strictEqual(resolved.body.data.status, 'Resolved');
  assert.strictEqual(resolved.body.data.timeline.at(-1).actor, OFFICER_ID);
  assert(resolved.body.data.timeline.some(item =>
    item.actor === OFFICER_ID && item.note.includes('Official resolution evidence uploaded')
  ));

  const dispute = await request('POST', `/api/complaints/${complaintId}/feedback`, {
    isSatisfied: false,
    reopenReason: 'The pothole is still present.'
  });
  assert.strictEqual(dispute.status, 200);
  assert.strictEqual(dispute.body.data.status, 'Reopened');
  assert.strictEqual(dispute.body.data.evidence.length, 4);
  assert.strictEqual(dispute.body.data.evidence[0].id, originalEvidence.id);

  const resolveWithDisputedEvidence = await request(
    'PATCH',
    `/api/complaints/${complaintId}`,
    { status: 'Resolved' },
    { Authorization: `Bearer ${officerToken}` }
  );
  assert.strictEqual(resolveWithDisputedEvidence.status, 422);

  const replacementResolution = await upload(
    complaintId,
    'resolution',
    PNG_BYTES,
    'after-repair.png',
    'image/png',
    officerToken
  );
  assert.strictEqual(replacementResolution.status, 201);
  assert.notStrictEqual(replacementResolution.body.data.id, firstResolutionEvidence.id);

  const adminEscalation = await request(
    'POST',
    `/api/complaints/${complaintId}/escalate`,
    { escalationReason: 'Authorized district review' },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(adminEscalation.status, 200);
  assert.strictEqual(adminEscalation.body.data.timeline.at(-1).actor, ADMIN_ID);

  await stopServer();
  await startServer();

  const persisted = await request('GET', `/api/complaints/${complaintId}`);
  assert.strictEqual(persisted.status, 200);
  assert.strictEqual(persisted.body.data.evidence.length, 5);
  assert.strictEqual(persisted.body.data.inspectionNotes, inspectionNotes);
  assert.strictEqual(persisted.body.data.evidence[0].id, originalEvidence.id);
  const persistedImage = await request('GET', originalEvidence.url);
  assert.strictEqual(persistedImage.status, 200);
  assert(persistedImage.body.equals(PNG_BYTES));

  const unauthorizedReset = await request('POST', '/api/reset');
  assert.strictEqual(unauthorizedReset.status, 401);
  const reset = await request('POST', '/api/reset', {}, { Authorization: `Bearer ${adminToken}` });
  assert.strictEqual(reset.status, 200);
  assert.strictEqual(reset.body.data.length, 9);
  const resetDistrictSample = reset.body.data.find(item => item.id === DISTRICT_SAMPLE_ID);
  assert.strictEqual(resetDistrictSample.status, 'FORWARDED_TO_DISTRICT');
  assert.strictEqual(resetDistrictSample.sampleLabel, 'SAMPLE / HACKATHON TEST DATA');
  for (const id of DISTRICT_DEMO_IDS) {
    assert.strictEqual(reset.body.data.filter(item => item.id === id).length, 1);
  }

  await stopServer();
  await startServer();
  const afterRestart = await request('GET', '/api/complaints');
  assert.strictEqual(afterRestart.status, 200);
  assert.strictEqual(afterRestart.body.count, 9);
  for (const id of DISTRICT_DEMO_IDS) {
    assert.strictEqual(afterRestart.body.data.filter(item => item.id === id).length, 1);
  }
  const pendingAfterRestart = await request(
    'GET',
    '/api/district/reviews',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(pendingAfterRestart.body.count, 3);

  await stopServer();
  await startServer(false);
  const noConfiguredOfficer = await upload(
    'PP-2025-RD-1042',
    'resolution',
    PNG_BYTES,
    'after.png',
    'image/png',
    officerToken
  );
  assert.strictEqual(noConfiguredOfficer.status, 503);
  const noConfiguredLogin = await request('POST', '/api/auth/login', {
    username: OFFICER_ID,
    password: OFFICER_PASSWORD
  });
  assert.strictEqual(noConfiguredLogin.status, 503);

  console.log('All evidence upload, validation, authorization, resolution, dispute, and persistence checks passed.');
}

runTests()
  .catch(error => {
    console.error('Evidence workflow test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer();
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  });
