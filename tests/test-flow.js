/**
 * Automated Verification Script for Palle Praja End-to-End Workflow
 */

const http = require('http');

// Helper to make local HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- 🧪 STARTING PALLE PRAJA END-TO-END WORKFLOW TESTS ---');

  // Step 1: Check initial complaints
  const res1 = await request('GET', '/api/complaints');
  console.log(`[TEST 1] GET /api/complaints: Status ${res1.status}, Count: ${res1.body.count}`);
  if (res1.status !== 200 || res1.body.count < 6) {
    throw new Error('Initial seed complaints failed to load');
  }

  // Step 2: Register new damaged-road complaint (Villager Workflow)
  const newGrievance = {
    category: 'Roads & Culverts',
    categoryKey: 'roads',
    categoryTe: 'రహదారులు',
    title: 'Severe potholes near bus stop causing tractor accidents',
    titleTe: 'బస్టాండ్ వద్ద పెద్ద గుంతలు, ట్రాక్టర్లు బోల్తా పడే ప్రమాదం',
    description: 'The main road near the bus shelter has eroded into deep 2-foot trenches after yesterday rains.',
    descriptionTe: 'బస్టాండ్ వద్ద మెయిన్ రోడ్డు భారీ వర్షాలకు కోతకు గురైంది.',
    voiceTranscript: 'బస్టాండ్ దగ్గర రోడ్డు పూర్తిగా పాడైంది వెంటనే రిపేర్ చేయించండి.',
    citizenName: 'Rama Rao (రామారావు)',
    citizenPhone: '+91 98480 23114',
    village: 'Ramapuram (రామాపురం)',
    ward: 'Ward 4 (వార్డు 4)',
    landmark: 'Near RTC Bus Shelter, Main Center',
    gpsCoordinates: '16.5062° N, 80.6480° E',
    citizenPhoto: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'
  };

  const res2 = await request('POST', '/api/complaints', newGrievance);
  console.log(`[TEST 2] POST /api/complaints: Status ${res2.status}, Generated ID: ${res2.body.data.id}`);
  const createdId = res2.body.data.id;
  if (!createdId.startsWith('PP-')) {
    throw new Error('Complaint ID format invalid');
  }

  // Step 3: Fetch by generated ID (Villager Tracking Workflow)
  const res3 = await request('GET', `/api/complaints/${createdId}`);
  console.log(`[TEST 3] GET /api/complaints/${createdId}: Status ${res3.status}, Status is: ${res3.body.data.status}`);
  if (res3.body.data.status !== 'Submitted') {
    throw new Error('Expected status to be Submitted');
  }

  // Step 4: Village Official assigns department and moves to In Progress
  const update1 = {
    assignedDepartment: 'Panchayat Raj Engineering Dept (PRED)',
    assignedOfficer: 'K. Venkateshwarlu (AEE)',
    officerContact: '+91 89781 44520',
    status: 'In Progress',
    officialRemarks: 'Site inspection done with Sarpanch. Bitumen patch mix truck and roller dispatched.',
    actionActor: 'Panchayat Secretary (V. Srikanth)'
  };
  const res4 = await request('PATCH', `/api/complaints/${createdId}`, update1);
  console.log(`[TEST 4] PATCH /api/complaints/${createdId} -> In Progress: Status ${res4.status}, Current Status: ${res4.body.data.status}`);
  if (res4.body.data.status !== 'In Progress' || res4.body.data.timeline.length < 2) {
    throw new Error('Status transition to In Progress failed');
  }

  // Step 5: Village Official uploads resolution photo and marks Resolved
  const update2 = {
    status: 'Resolved',
    resolutionPhoto: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    resolutionRemarks: 'Bitumen levelling and gravel compacting finished. Inspected by Ward Member.',
    actionActor: 'Panchayat Secretary (V. Srikanth)'
  };
  const res5 = await request('PATCH', `/api/complaints/${createdId}`, update2);
  console.log(`[TEST 5] PATCH /api/complaints/${createdId} -> Resolved: Status ${res5.status}, Current Status: ${res5.body.data.status}`);
  if (res5.body.data.status !== 'Resolved' || !res5.body.data.resolutionPhoto) {
    throw new Error('Status transition to Resolved with photo proof failed');
  }

  // Step 6: Citizen Resolution Verification (Citizen rates 5 stars)
  const feedbackPayload = {
    rating: 5,
    comment: 'Potholes filled cleanly within 48 hours. Excellent work by Grama Sachivalayam!',
    isSatisfied: true,
    citizenName: 'Rama Rao (రామారావు)'
  };
  const res6 = await request('POST', `/api/complaints/${createdId}/feedback`, feedbackPayload);
  console.log(`[TEST 6] POST /api/complaints/${createdId}/feedback: Status ${res6.status}, Rating: ${res6.body.data.citizenFeedback.rating}`);
  if (!res6.body.data.citizenFeedback || res6.body.data.citizenFeedback.rating !== 5) {
    throw new Error('Citizen feedback verification failed');
  }

  // Step 7: Citizen Reopen Grievance Test on PP-2025-SN-5120
  const reopenPayload = {
    isSatisfied: false,
    reopenReason: 'Market waste cleared on main road but corner heap left behind.',
    citizenName: 'M. Padmavathi (ఎం. పద్మావతి)'
  };
  const res7 = await request('POST', '/api/complaints/PP-2025-SN-5120/feedback', reopenPayload);
  console.log(`[TEST 7] POST /api/complaints/PP-2025-SN-5120/feedback (Reopen): Status ${res7.status}, New Status: ${res7.body.data.status}`);
  if (res7.body.data.status !== 'Reopened') {
    throw new Error('Reopening grievance failed');
  }

  // Step 8: Higher Authority Escalation Test on Overdue Complaint PP-2025-WT-2081
  const escalatePayload = {
    authorityName: 'District Collector (Dr. Ananya Reddy, IAS)',
    escalationReason: 'Emergency intervention ordered under Section 42 of Panchayati Raj Act. Supply drinking water tankers immediately and replace pipeline within 24 hours.'
  };
  const res8 = await request('POST', '/api/complaints/PP-2025-WT-2081/escalate', escalatePayload);
  console.log(`[TEST 8] POST /api/complaints/PP-2025-WT-2081/escalate: Status ${res8.status}, New Status: ${res8.body.data.status}`);
  if (res8.body.data.status !== 'Escalated' || res8.body.data.priority !== 'Critical') {
    throw new Error('Higher Authority escalation failed');
  }

  // Step 9: Public Statistics Verification
  const res9 = await request('GET', '/api/stats');
  console.log(`[TEST 9] GET /api/stats: Status ${res9.status}, Total: ${res9.body.data.total}, Resolved: ${res9.body.data.resolved}, Escalated: ${res9.body.data.escalated}`);
  if (res9.status !== 200 || typeof res9.body.data.resolutionRate !== 'number') {
    throw new Error('Public stats calculation failed');
  }

  // Step 10: Reset sample data back to clean state
  const res10 = await request('POST', '/api/reset');
  console.log(`[TEST 10] POST /api/reset: Status ${res10.status}, Complaints Count restored to: ${res10.body.data.length}`);
  if (res10.body.data.length !== 6) {
    throw new Error('Reset failed');
  }

  console.log('--- ✅ ALL 10 END-TO-END WORKFLOW TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

// Start server child process for testing
const { fork } = require('child_process');
const serverProc = fork('./server.js', [], { stdio: 'inherit' });

setTimeout(() => {
  runTests().catch(err => {
    console.error('❌ Test failed with error:', err);
    serverProc.kill();
    process.exit(1);
  }).finally(() => {
    serverProc.kill();
  });
}, 1500);
