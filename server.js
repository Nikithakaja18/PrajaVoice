const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.PALLE_PRAJA_DATA_DIR || path.join(__dirname, 'data');
const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const OFFICERS_FILE = path.join(DATA_DIR, 'officers.json');
const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
const MAX_INSPECTION_NOTES_LENGTH = 4000;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AUTHORIZED_ROLES = ['OFFICER', 'ADMIN', 'GRAMA_SACHIVALAYAM', 'DISTRICT_AUTHORITY'];
const SCRYPT_HASH_PATTERN = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt.toString('hex')}$${hash}`;
}

function verifyPassword(password, encodedHash) {
  const match = typeof encodedHash === 'string' ? encodedHash.match(SCRYPT_HASH_PATTERN) : null;
  if (!match) return false;
  const suppliedHash = crypto.scryptSync(password, Buffer.from(match[1], 'hex'), 64);
  const expectedHash = Buffer.from(match[2], 'hex');
  return crypto.timingSafeEqual(suppliedHash, expectedHash);
}

function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

function loadLegacyAuthUsers() {
  const configured = process.env.AUTH_USERS;
  if (!configured) return [];

  let users;
  try {
    users = JSON.parse(configured);
  } catch {
    throw new Error('AUTH_USERS must be a JSON object mapping usernames to roles and password hashes.');
  }

  if (!users || Array.isArray(users) || typeof users !== 'object') {
    throw new Error('AUTH_USERS must be a JSON object mapping usernames to roles and password hashes.');
  }

  return Object.entries(users).map(([username, account]) => {
    const match = account && typeof account.passwordHash === 'string'
      ? account.passwordHash.match(SCRYPT_HASH_PATTERN)
      : null;
    const role = account && typeof account.role === 'string' ? account.role.toUpperCase() : '';
    if (!username.trim() || username.length > 100 || !match || !AUTHORIZED_ROLES.includes(role)) {
      throw new Error('Each AUTH_USERS account must have a username, an authorized role, and a scrypt password hash.');
    }
    return {
      username,
      role,
      salt: match[1],
      tokenVersion: 0,
      passwordHash: match[2]
    };
  });
}

const authTokenSecret = process.env.AUTH_TOKEN_SECRET || '';
if (authTokenSecret && Buffer.byteLength(authTokenSecret, 'utf8') < 32) {
  throw new Error('AUTH_TOKEN_SECRET must be at least 32 bytes long.');
}

function persistOfficers() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${OFFICERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(officers, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryFile, OFFICERS_FILE);
}

function loadOfficers() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(OFFICERS_FILE)) {
    const migratedUsers = loadLegacyAuthUsers().map(user => ({
      username: user.username,
      role: user.role,
      department: null,
      active: true,
      tokenVersion: 0,
      passwordHash: `scrypt$${user.salt}$${user.passwordHash}`
    }));
    if (migratedUsers.length > 0) {
      officers = migratedUsers;
      persistOfficers();
    }
    return migratedUsers;
  }

  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(OFFICERS_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to load persisted officer identities: ${error.message}`);
  }
  if (!Array.isArray(stored)) throw new Error('Officer identity database must contain an array.');
  return stored.map(account => {
    const passwordHash = account && typeof account.passwordHash === 'string'
      ? account.passwordHash.match(SCRYPT_HASH_PATTERN)
      : null;
    const role = account && typeof account.role === 'string' ? account.role.toUpperCase() : '';
    const username = account && typeof account.username === 'string' ? account.username.trim() : '';
    const department = account && typeof account.department === 'string' ? account.department.trim() : null;
    const activeRecordIsValid = account.active === undefined || typeof account.active === 'boolean';
    const tokenVersionRecordIsValid = account.tokenVersion === undefined ||
      (Number.isInteger(account.tokenVersion) && account.tokenVersion >= 0);
    if (!username || username.length > 100 || !passwordHash || !AUTHORIZED_ROLES.includes(role) ||
        (department && department.length > 120) || !activeRecordIsValid || !tokenVersionRecordIsValid) {
      throw new Error('Officer identity database contains an invalid account record.');
    }
    return {
      username,
      role,
      department,
      active: account.active !== false,
      tokenVersion: Number.isInteger(account.tokenVersion) && account.tokenVersion >= 0
        ? account.tokenVersion
        : 0,
      passwordHash: `scrypt$${passwordHash[1]}$${passwordHash[2]}`
    };
  });
}

let officers = [];
officers = loadOfficers();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new ApiError(415, 'Unsupported image type. Upload a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Realistic Initial Sample Dataset
function createDistrictDashboardSamples() {
  const now = Date.now();
  const definitions = [
    {
      id: 'PP-2026-SN-9002',
      title: 'Overflowing drainage near Government Primary School',
      description: 'The drain beside Government Primary School is overflowing into the pedestrian path, creating unsanitary conditions for students and nearby residents.',
      category: 'Sanitation and Drainage',
      categoryKey: 'sanitation',
      department: 'Panchayat Sanitation & Public Health',
      landmark: 'Near Government Primary School',
      ward: 'School vicinity',
      createdHoursAgo: 5.5,
      forwardingMinutes: 42,
      priority: 'High',
      status: 'FORWARDED_TO_DISTRICT'
    },
    {
      id: 'PP-2026-WT-9003',
      title: 'Damaged drinking water pipeline near the village main road',
      description: 'A damaged drinking-water pipeline is leaking beside the village main road, reducing water pressure and leaving nearby households with an unreliable supply.',
      category: 'Drinking Water Supply',
      categoryKey: 'water',
      department: 'Rural Water Supply & Sanitation (RWSS)',
      landmark: 'Village main road',
      ward: 'Ward 2',
      createdHoursAgo: 4.25,
      forwardingMinutes: 37,
      priority: 'High',
      status: 'FORWARDED_TO_DISTRICT'
    },
    {
      id: 'PP-2026-EL-9005',
      title: 'Non-functional streetlights near the village bus stand',
      description: 'Streetlights around the village bus stand have not been working for several nights, leaving commuters and pedestrians with poor visibility after dark.',
      category: 'Electricity',
      categoryKey: 'electricity',
      department: 'APCPDCL / TSSPDCL Rural Operations',
      landmark: 'Village bus stand',
      ward: 'Bus stand vicinity',
      createdHoursAgo: 2.75,
      forwardingMinutes: 29,
      priority: 'Medium',
      status: 'FORWARDED_TO_DISTRICT'
    }
  ];

  return definitions.map(definition => {
    const createdAt = new Date(now - definition.createdHoursAgo * 60 * 60 * 1000).toISOString();
    const forwardedAt = new Date(Date.parse(createdAt) + definition.forwardingMinutes * 60 * 1000).toISOString();
    const complaint = {
      id: definition.id,
      category: definition.category,
      categoryKey: definition.categoryKey,
      title: definition.title,
      description: definition.description,
      citizenName: 'SAMPLE / HACKATHON TEST DATA',
      citizenPhone: 'Not applicable - sample data',
      village: 'Ramapuram Village',
      ward: definition.ward,
      landmark: definition.landmark,
      createdAt,
      source: 'Grama Sachivalayam',
      isHackathonSample: true,
      sampleLabel: 'SAMPLE / HACKATHON TEST DATA',
      districtReviewReason: 'The village-level department was notified; District Authority review is requested for timely action.',
      forwardedAt,
      slaHours: 72,
      status: definition.status,
      assignedDepartment: definition.department,
      assignedOfficer: 'Pending District Assignment',
      officerContact: null,
      priority: definition.priority,
      isOverdue: false,
      evidence: [],
      inspectionNotes: null,
      officialRemarks: null,
      districtAuthorityRemarks: definition.districtRemarks || null,
      districtEscalatedAt: null,
      resolutionRemarks: null,
      citizenFeedback: null,
      urgentEscalation: null,
      timeline: [
        {
          status: 'Submitted',
          timestamp: createdAt,
          actor: 'SAMPLE / HACKATHON TEST DATA',
          note: 'Hackathon demonstration complaint; no citizen evidence is attached.'
        },
        {
          status: 'FORWARDED_TO_DISTRICT',
          timestamp: forwardedAt,
          actor: 'Grama Sachivalayam',
          note: 'Forwarded for District Authority review.'
        }
      ]
    };

    return complaint;
  });
}

const getInitialSeedComplaints = () => [
  {
    id: 'PP-2025-RD-1042',
    category: 'Roads',
    categoryKey: 'roads',
    categoryTe: 'రహదారులు',
    title: 'Severe potholes and waterlogging near ZP High School',
    titleTe: 'జడ్పీ హైస్కూల్ వద్ద ప్రమాదకర గుంతలు, నిలిచిన వర్షపు నీరు',
    description: 'The main road in front of the school is deeply eroded with large craters. School buses and daily commuters are facing severe hazards. Two school students on cycles slipped and got injured yesterday.',
    descriptionTe: 'పాఠశాల ముందు ప్రధాన రహదారి తీవ్రంగా దెబ్బతిని పెద్ద గుంతలు ఏర్పడ్డాయి. సైకిళ్లపై వెళ్లే విద్యార్థులు జారిపడి గాయపడుతున్నారు.',
    voiceTranscript: 'జడ్పీ హైస్కూల్ ముందు రోడ్డు చాలా దెబ్బతింది, పిల్లలు పడిపోతున్నారు వెంటనే బాగు చేయండి.',
    citizenName: 'Rama Rao (రామారావు)',
    citizenPhone: '+91 98480 23114',
    village: 'Ramapuram (రామాపురం)',
    ward: 'Ward 4 (వార్డు 4)',
    landmark: 'Opposite Zilla Parishad High School Gate',
    gpsCoordinates: '16.5062° N, 80.6480° E',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    slaHours: 72,
    status: 'In Progress', // Submitted, Assigned, In Progress, Resolved, Reopened, Escalated
    assignedDepartment: 'Panchayat Raj Engineering Dept (PRED)',
    assignedOfficer: 'K. Venkateshwarlu (Asst. Executive Engineer)',
    officerContact: '+91 89781 44520',
    priority: 'High',
    isOverdue: false,
    evidence: [],
    officialRemarks: 'Inspected on-site with sarpanch. Material requisition for gravel and bitumen filling approved. Road levelling work underway.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        actor: 'Citizen Rama Rao',
        note: 'Grievance submitted via Voice-First Registration.'
      },
      {
        status: 'Assigned',
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        actor: 'Grama Sachivalayam Secretary',
        note: 'Assigned to Panchayat Raj Engineering Dept. Target SLA: 72 hours.'
      },
      {
        status: 'In Progress',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        actor: 'AEE K. Venkateshwarlu',
        note: 'Site inspection completed. Road roller and patch mix material deployed to site.'
      }
    ]
  },
  {
    id: 'PP-2025-WT-2081',
    category: 'Water Supply',
    categoryKey: 'water',
    categoryTe: 'తాగునీరు',
    title: 'Drinking water pipeline burst causing contamination in Ward 3',
    titleTe: 'వార్డు 3 వద్ద మెయిన్ పైప్‌లైన్ పగిలి మురుగునీరు కలుస్తోంది',
    description: 'The main drinking water transmission line near Gandhi Bomma Center burst 4 days ago. Potable water is mixing with stagnant drain water. Over 180 families have not received drinking water for 3 consecutive days.',
    descriptionTe: 'గాంధీ బొమ్మ సెంటర్ వద్ద తాగునీటి పైపు పగిలి మురుగునీరు కలుస్తోంది. 180 కుటుంబాలకు 3 రోజులుగా నీరు రావడం లేదు.',
    voiceTranscript: 'వార్డు 3 గాంధీ సెంటర్ వద్ద మంచి నీళ్ల పైపు పగిలిపోయింది. మూడు రోజుల నుండి నీళ్లు లేక ఇబ్బంది పడుతున్నాం.',
    citizenName: 'B. Lakshmi (బి. లక్ష్మి)',
    citizenPhone: '+91 94401 58219',
    village: 'Ramapuram (రామాపురం)',
    ward: 'Ward 3 (వార్డు 3)',
    landmark: 'Near Gandhi Statue & Milk Collection Center',
    gpsCoordinates: '16.5085° N, 80.6442° E',
    createdAt: new Date(Date.now() - 98 * 3600 * 1000).toISOString(), // > 72 hours ago
    slaHours: 48,
    status: 'In Progress',
    assignedDepartment: 'Rural Water Supply & Sanitation (RWSS)',
    assignedOfficer: 'M. Sridhar (Sub-Engineer RWSS)',
    officerContact: '+91 94901 88231',
    priority: 'Critical',
    isOverdue: true, // Overdue SLA! Ready for Authority Escalation demonstration!
    evidence: [],
    officialRemarks: 'Trench digging completed, replacement HDPE pipe coupling awaited from Mandal warehouse.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 98 * 3600 * 1000).toISOString(),
        actor: 'Citizen B. Lakshmi',
        note: 'Emergency complaint registered regarding drinking water contamination.'
      },
      {
        status: 'Assigned',
        timestamp: new Date(Date.now() - 86 * 3600 * 1000).toISOString(),
        actor: 'Panchayat Secretary',
        note: 'Assigned to Rural Water Supply engineering wing.'
      },
      {
        status: 'In Progress',
        timestamp: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
        actor: 'RWSS Sub-Engineer',
        note: 'Excavation initiated. Replacement pipe requested.'
      },
      {
        status: 'SLA Overdue',
        timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
        actor: 'System Automation',
        note: 'Statutory 48hr SLA deadline breached. Flagged for Higher Authority escalation.'
      }
    ]
  },
  {
    id: 'PP-2025-EL-3119',
    category: 'Electricity',
    categoryKey: 'electricity',
    categoryTe: 'విద్యుత్',
    title: 'Damaged 25kVA transformer sparks and power outage for 40 houses',
    titleTe: '25kVA ట్రాన్స్‌ఫార్మర్ పేలి 40 ఇళ్లకు విద్యుత్ సరఫరా నిలిచింది',
    description: 'Distribution transformer burnt down with high voltage surge. Heavy sparks observed. Cattle and farmers near the fields are in immediate danger.',
    descriptionTe: 'పొలాల సమీపంలో ట్రాన్స్‌ఫార్మర్ కాలిపోయి మంటలు వచ్చాయి. లైన్లు కిందకు వేలాడుతున్నాయి, తక్షణమే రీప్లేస్ చేయాలి.',
    voiceTranscript: 'రైతుల పొలాల దగ్గర ట్రాన్స్‌ఫార్మర్ పేలింది, వైర్లు కింద పడ్డాయి ప్రమాదం జరిగేలా ఉంది.',
    citizenName: 'N. Anji Reddy (ఎన్. అంజిరెడ్డి)',
    citizenPhone: '+91 97012 34567',
    village: 'Krishnapuram (కృష్ణాపురం)',
    ward: 'Ward 6 (వార్డు 6)',
    landmark: 'Survey No. 142, North Agricultural Feeder',
    gpsCoordinates: '16.5210° N, 80.6590° E',
    createdAt: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
    slaHours: 24,
    status: 'Escalated', // Authority Escalated!
    assignedDepartment: 'APCPDCL / TSSPDCL Rural Operations',
    assignedOfficer: 'G. Suresh Babu (Line Inspector)',
    officerContact: '+91 94408 15200',
    priority: 'Critical',
    isOverdue: true,
    evidence: [],
    officialRemarks: 'Collectorate issued direct intervention order. New transformer dispatched from Divisional Store.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
        actor: 'Citizen N. Anji Reddy',
        note: 'Reported transformer burn and loose agricultural electric lines.'
      },
      {
        status: 'Assigned',
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        actor: 'Panchayat Secretary',
        note: 'Notified Rural Electricity Operations.'
      },
      {
        status: 'Escalated',
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        actor: 'District Collector (Dr. Ananya Reddy, IAS)',
        note: 'Special Collectorate Escalation: Priority notice served to DISCOM SE under Disaster Preparedness norms.'
      }
    ]
  },
  {
    id: 'PP-2025-DR-4055',
    category: 'Drainage',
    categoryKey: 'drainage',
    categoryTe: 'మురుగు కాలువలు',
    title: 'Clogged main open drain overflowing into Shiva Temple street',
    titleTe: 'శివాలయం వీధిలో మురుగు కాలువ పూడిక నిండి రోడ్డుపై ప్రవహిస్తోంది',
    description: 'Plastic bags and silt have completely blocked the 100-meter open drain section. Foul stench and mosquito breeding are intolerable. Devotees cannot access temple.',
    descriptionTe: 'శివాలయం వీధిలో ప్లాస్టిక్ వ్యర్థాలతో కాలువ నిండి మురుగు రోడ్డుపై పారుతోంది. దోమల బెడద ఎక్కువైంది.',
    voiceTranscript: 'శివాలయం గుడి రోడ్డులో మురుగు కాలువ పొంగి రోడ్డు మీద పారుతుంది. దోమలు ఎక్కువయ్యాయి వెంటనే క్లీన్ చేయించండి.',
    citizenName: 'Ch. Subbaiah (సిహెచ్. సుబ్బయ్య)',
    citizenPhone: '+91 99890 11223',
    village: 'Ramapuram (రామాపురం)',
    ward: 'Ward 2 (వార్డు 2)',
    landmark: 'Behind Shiva Temple, Near Grama Chavadi',
    gpsCoordinates: '16.5041° N, 80.6499° E',
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    slaHours: 48,
    status: 'Assigned',
    assignedDepartment: 'Panchayat Sanitation & Public Health',
    assignedOfficer: 'P. Sambasiva Rao (Sanitation Supervisor)',
    officerContact: '+91 88860 99124',
    priority: 'Medium',
    isOverdue: false,
    evidence: [],
    officialRemarks: 'Desilting gang of 5 sanitary workers scheduled for clearance tomorrow 8:00 AM.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        actor: 'Citizen Ch. Subbaiah',
        note: 'Voice grievance submitted by the citizen.'
      },
      {
        status: 'Assigned',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        actor: 'Panchayat Secretary',
        note: 'Assigned to Sanitation Wing with instruction for immediate desilting.'
      }
    ]
  },
  {
    id: 'PP-2025-SN-5120',
    category: 'Sanitation',
    categoryKey: 'sanitation',
    categoryTe: 'పారిశుధ్యం',
    title: 'Solid waste dumping at weekly Rythu Bazaar ground',
    titleTe: 'రైతు బజార్ మైదానంలో పేరుకుపోయిన చెత్త',
    description: 'Rotting vegetable matter and garbage accumulated over two market days. Stray cattle and dogs feeding on waste created health hazards.',
    descriptionTe: 'రైతు బజార్ మైదానంలో చెత్త పేరుకుపోయింది. పందులు, కుక్కలు చేరి దుర్గంధం వస్తోంది.',
    voiceTranscript: 'రైతు బజార్ మైదానంలో చెత్త ఎత్తకపోవడంతో దుర్గంధం వస్తోంది, వ్యాధులు ప్రబలే ప్రమాదం ఉంది.',
    citizenName: 'M. Padmavathi (ఎం. పద్మావతి)',
    citizenPhone: '+91 93910 44556',
    village: 'Gandhipuram (గాంధీపురం)',
    ward: 'Ward 1 (వార్డు 1)',
    landmark: 'Rythu Bazaar Market Yard, South Gate',
    gpsCoordinates: '16.5120° N, 80.6380° E',
    createdAt: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    slaHours: 48,
    status: 'In Progress',
    assignedDepartment: 'Panchayat Sanitation & Public Health',
    assignedOfficer: 'K. Tirupathi Rao (Health Inspector)',
    officerContact: '+91 91770 12345',
    priority: 'Medium',
    isOverdue: false,
    evidence: [],
    officialRemarks: 'Site inspection and clearance are pending. Resolution evidence has not been submitted.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
        actor: 'Citizen M. Padmavathi',
        note: 'Complaint registered regarding market yard waste.'
      },
      {
        status: 'Assigned',
        timestamp: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
        actor: 'Grama Sachivalayam Secretary',
        note: 'Assigned to Sanitation Wing.'
      },
      {
        status: 'In Progress',
        timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
        actor: 'Health Inspector K. Tirupathi Rao',
        note: 'Site inspection and clearance are pending.'
      }
    ]
  },
  {
    id: 'PP-2025-RD-6078',
    category: 'Roads',
    categoryKey: 'roads',
    categoryTe: 'రహదారులు',
    title: 'Culvert sidewall collapsed on canal bridge, night accidents risk',
    titleTe: 'కాలువ బ్రిడ్జి వద్ద కల్వర్టు గోడ కూలిపోయింది, రాత్రి పూట ప్రమాదం',
    description: 'Due to recent canal overflow, the protective brick sidewall of the narrow culvert broke down. Autos and tractors risk falling into the 12-foot canal during night hours.',
    descriptionTe: 'కాలువ బ్రిడ్జి రక్షణ గోడ కూలిపోయింది. రాత్రి పూట వాహనాలు కాలువలో పడే ప్రమాదం ఉంది.',
    voiceTranscript: 'కాలువ బ్రిడ్జి కల్వర్టు గోడ కూలిపోయింది వెంటనే రక్షణ రెయిలింగ్ వేయించండి.',
    citizenName: 'S. Ramana Murthy (ఎస్. రమణమూర్తి)',
    citizenPhone: '+91 98850 77889',
    village: 'Gandhipuram (గాంధీపురం)',
    ward: 'Ward 5 (వార్డు 5)',
    landmark: 'Canal Crossing Culvert, Near Pumping Station',
    gpsCoordinates: '16.5165° N, 80.6412° E',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    slaHours: 72,
    status: 'Submitted',
    assignedDepartment: 'Pending Assignment',
    assignedOfficer: 'Unassigned',
    officerContact: null,
    priority: 'High',
    isOverdue: false,
    evidence: [],
    officialRemarks: null,
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        actor: 'Citizen S. Ramana Murthy',
        note: 'Fresh complaint registered via Praja Voice.'
      }
    ]
  },
  ...createDistrictDashboardSamples()
];

function persistComplaints() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${COMPLAINTS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(complaints, null, 2));
  fs.renameSync(temporaryFile, COMPLAINTS_FILE);
}

function loadComplaints() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  if (!fs.existsSync(COMPLAINTS_FILE)) return getInitialSeedComplaints();

  try {
    const stored = JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf8'));
    if (!Array.isArray(stored)) throw new Error('Complaint data must be an array.');
    return stored.map(complaint => ({
      ...complaint,
      evidence: Array.isArray(complaint.evidence) ? complaint.evidence : []
    }));
  } catch (error) {
    throw new Error(`Unable to load persisted complaints: ${error.message}`);
  }
}

let complaints = loadComplaints();
let complaintDataChanged = false;
for (const complaint of complaints) {
  if (complaint.status === 'Resolved' && !complaint.resolvedAt && Array.isArray(complaint.timeline)) {
    const resolvedEvent = complaint.timeline.slice().reverse().find(item => item.status === 'Resolved');
    if (resolvedEvent && resolvedEvent.timestamp) {
      complaint.resolvedAt = resolvedEvent.timestamp;
      complaintDataChanged = true;
    }
  }
}
const obsoletePendingSampleIds = new Set(['PP-2026-SN-9001']);
for (const complaint of complaints) {
  if (obsoletePendingSampleIds.has(complaint.id.toUpperCase()) &&
      complaint.isHackathonSample &&
      complaint.status === 'FORWARDED_TO_DISTRICT') {
    complaint.status = 'SAMPLE_ARCHIVED';
    complaintDataChanged = true;
  }
}

for (const sample of createDistrictDashboardSamples()) {
  const existing = complaints.find(item => item.id.toUpperCase() === sample.id.toUpperCase());
  if (!existing) {
    complaints.push(sample);
    complaintDataChanged = true;
    continue;
  }

  if (existing.isHackathonSample &&
      existing.status === 'FORWARDED_TO_DISTRICT' &&
      existing.title !== sample.title) {
    const createdAt = Number.isFinite(Date.parse(existing.createdAt)) ? existing.createdAt : sample.createdAt;
    const forwardedAt = Number.isFinite(Date.parse(existing.forwardedAt)) &&
      Date.parse(existing.forwardedAt) > Date.parse(createdAt)
      ? existing.forwardedAt
      : sample.forwardedAt;
    Object.assign(existing, sample, {
      createdAt,
      forwardedAt,
      timeline: sample.timeline.map(item => ({
        ...item,
        timestamp: item.status === 'Submitted' ? createdAt : forwardedAt
      }))
    });
    complaintDataChanged = true;
  }
}

if (complaintDataChanged || !fs.existsSync(COMPLAINTS_FILE)) {
  persistComplaints();
}

function authenticationConfigured(res) {
  if (officers.length === 0 || !authTokenSecret) {
    res.status(503).json({
      success: false,
      message: 'Officer authentication is not initialized. Run npm run setup:auth to create the first ADMIN account.'
    });
    return false;
  }
  return true;
}

function signAccessToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signedContent = `${header}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', authTokenSecret).update(signedContent).digest('base64url');
  return `${signedContent}.${signature}`;
}

function getRequestToken(req) {
  const authorization = req.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer ([^\s]+)$/);
  if (bearerMatch) return bearerMatch[1];
  const cookie = (req.get('cookie') || '').split(';')
    .map(value => value.trim())
    .find(value => value.startsWith('pv_session='));
  return cookie ? cookie.slice('pv_session='.length) : '';
}

function verifyAccessToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, suppliedSignature] = parts;
  if (![encodedHeader, encodedPayload, suppliedSignature].every(value => /^[A-Za-z0-9_-]+$/.test(value))) return null;
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac('sha256', authTokenSecret).update(signedContent).digest();
  let suppliedSignatureBytes;
  let header;
  let payload;
  try {
    suppliedSignatureBytes = Buffer.from(suppliedSignature, 'base64url');
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT' ||
      suppliedSignatureBytes.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(suppliedSignatureBytes, expectedSignature) ||
      !payload || typeof payload.sub !== 'string' ||
      !AUTHORIZED_ROLES.includes(payload.role) ||
      !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000) ||
      (payload.ver !== undefined && !Number.isInteger(payload.ver))) {
    return null;
  }
  const account = officers.find(item => normalizeUsername(item.username) === normalizeUsername(payload.sub));
  const tokenVersion = payload.ver === undefined ? 0 : payload.ver;
  if (!account || !account.active || account.role !== payload.role ||
      !Number.isInteger(tokenVersion) || account.tokenVersion !== tokenVersion) return null;
  return {
    username: account.username,
    role: account.role,
    department: account.department
  };
}

function authorizeRequest(req, res, roles) {
  res.set('Cache-Control', 'no-store');
  if (!authenticationConfigured(res)) return null;

  const user = verifyAccessToken(getRequestToken(req));
  if (!user) {
    res.status(401).json({ success: false, message: 'A valid officer access token is required.' });
    return null;
  }
  if (!roles.includes(user.role)) {
    res.status(403).json({ success: false, message: 'Your account is not authorized for this action.' });
    return null;
  }
  return user;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `pv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ACCESS_TOKEN_TTL_SECONDS}${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `pv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

function requireRoles(...roles) {
  return (req, res, next) => {
    const user = authorizeRequest(req, res, roles);
    if (!user) return;
    req.auth = user;
    next();
  };
}

function officerCanAccessComplaint(user, complaint, res) {
  if (user.role === 'ADMIN' ||
      user.role === 'GRAMA_SACHIVALAYAM' ||
      user.department === complaint.assignedDepartment) return true;
  res.status(403).json({
    success: false,
    message: 'This complaint is not assigned to your department.'
  });
  return false;
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  return null;
}

function evidenceForResponse(complaint) {
  return complaint.evidence
    .filter(item => fs.existsSync(path.join(EVIDENCE_DIR, item.fileName)))
    .map(item => ({
      id: item.id,
      complaintId: item.complaintId,
      uploaderId: item.uploaderId,
      uploadedAt: item.uploadedAt,
      type: item.type,
      inspectionNotes: item.inspectionNotes || null,
      mimeType: item.mimeType,
      size: item.size,
      url: `/api/evidence/${encodeURIComponent(item.id)}`
    }));
}

// Helper to check and mark SLA overdue
function refreshOverdueStatus() {
  const now = Date.now();
  complaints.forEach(item => {
    if (item.status !== 'Resolved') {
      const districtDeadline = item.urgentEscalation && Date.parse(item.urgentEscalation.deadlineAt);
      const deadline = Number.isFinite(districtDeadline)
        ? districtDeadline
        : Date.parse(item.createdAt) + item.slaHours * 60 * 60 * 1000;
      item.isOverdue = now > deadline;
    } else {
      item.isOverdue = false;
    }
  });
}

// API Routes
app.post('/api/auth/login', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!authenticationConfigured(res)) return;

  const { username, password, portalRole } = req.body || {};
  const normalizedUsername = normalizeUsername(username);
  const user = normalizedUsername
    ? officers.find(account => normalizeUsername(account.username) === normalizedUsername)
    : null;
  if (!user || !user.active || typeof password !== 'string' || password.length === 0 || password.length > 256) {
    return res.status(401).json({ success: false, message: 'Username or password is incorrect.' });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Username or password is incorrect.' });
  }
  if (portalRole && !['GRAMA_SACHIVALAYAM', 'DISTRICT_AUTHORITY'].includes(portalRole)) {
    return res.status(400).json({ success: false, message: 'The requested portal is not supported.' });
  }
  if (portalRole && user.role !== portalRole) {
    const portalName = portalRole === 'GRAMA_SACHIVALAYAM' ? 'Grama Sachivalayam' : 'District Authority';
    return res.status(403).json({ success: false, message: `This account is not authorized for the ${portalName} portal.` });
  }

  const now = Math.floor(Date.now() / 1000);
  const accessToken = signAccessToken({
    sub: user.username,
    role: user.role,
    department: user.department,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
    ver: user.tokenVersion
  });
  if (portalRole) setSessionCookie(res, accessToken);
  res.json({
    success: true,
    ...(portalRole
      ? { sessionType: 'cookie', expiresIn: ACCESS_TOKEN_TTL_SECONDS }
      : { accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS }),
    user: { username: user.username, role: user.role, department: user.department }
  });
});

app.get('/api/auth/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!authenticationConfigured(res)) return;
  const user = verifyAccessToken(getRequestToken(req));
  if (!user) return res.status(401).json({ success: false, message: 'No active session.' });
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const token = getRequestToken(req);
  const parts = token.split('.');
  if (parts.length === 3 && verifyAccessToken(token)) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const account = officers.find(item => normalizeUsername(item.username) === normalizeUsername(payload.sub));
      if (account) {
        account.tokenVersion += 1;
        try {
          persistOfficers();
        } catch (error) {
          account.tokenVersion -= 1;
          console.error('Unable to revoke the sign-in session:', error.message);
          return res.status(500).json({ success: false, message: 'The sign-in session could not be revoked.' });
        }
      }
    } catch {
      // An invalid token still has its browser cookie cleared below.
    }
  }
  clearSessionCookie(res);
  res.json({ success: true, message: 'You have been signed out.' });
});

app.get('/api/auth/accounts', requireRoles('ADMIN'), (req, res) => {
  res.json({
    success: true,
    data: officers.map(({ username, role, department, active }) => ({ username, role, department, active }))
  });
});

app.patch('/api/auth/accounts/:username/status', requireRoles('ADMIN'), (req, res) => {
  const account = officers.find(item => normalizeUsername(item.username) === normalizeUsername(req.params.username));
  if (!account) return res.status(404).json({ success: false, message: 'Account not found.' });
  if (typeof req.body.active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Account active status must be true or false.' });
  }
  if (!req.body.active && account.role === 'ADMIN' &&
      officers.filter(item => item.role === 'ADMIN' && item.active).length <= 1) {
    return res.status(409).json({ success: false, message: 'The last active ADMIN account cannot be disabled.' });
  }
  const previousActive = account.active;
  const previousTokenVersion = account.tokenVersion;
  account.active = req.body.active;
  if (account.active !== previousActive) account.tokenVersion += 1;
  try {
    persistOfficers();
  } catch (error) {
    account.active = previousActive;
    account.tokenVersion = previousTokenVersion;
    console.error('Unable to update account status:', error.message);
    return res.status(500).json({ success: false, message: 'Account status could not be updated.' });
  }
  res.json({
    success: true,
    data: { user: { username: account.username, role: account.role, department: account.department, active: account.active } }
  });
});

app.patch('/api/auth/accounts/:username/password', requireRoles('ADMIN'), (req, res) => {
  const account = officers.find(item => normalizeUsername(item.username) === normalizeUsername(req.params.username));
  if (!account) return res.status(404).json({ success: false, message: 'Account not found.' });
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (password.length < 12 || password.length > 256) {
    return res.status(400).json({ success: false, message: 'Password must be between 12 and 256 characters.' });
  }

  const previousPasswordHash = account.passwordHash;
  const previousTokenVersion = account.tokenVersion;
  account.passwordHash = hashPassword(password);
  account.tokenVersion += 1;
  try {
    persistOfficers();
  } catch (error) {
    account.passwordHash = previousPasswordHash;
    account.tokenVersion = previousTokenVersion;
    console.error('Unable to reset officer password:', { username: account.username, error: error.message });
    return res.status(500).json({ success: false, message: 'Password could not be reset.' });
  }
  res.json({
    success: true,
    message: 'Password reset successfully.',
    data: { username: account.username, role: account.role, active: account.active }
  });
});

app.post('/api/auth/register', requireRoles('ADMIN'), (req, res) => {
  const { username, password, role = 'OFFICER', department, active = true } = req.body || {};
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const cleanRole = typeof role === 'string' ? role.toUpperCase() : '';
  const cleanDepartment = typeof department === 'string' ? department.trim() : '';
  if (!cleanUsername || cleanUsername.length > 100) {
    return res.status(400).json({ success: false, message: 'Username is required and must be at most 100 characters.' });
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    return res.status(400).json({ success: false, message: 'Password must be between 12 and 256 characters.' });
  }
  if (!AUTHORIZED_ROLES.includes(cleanRole)) {
    return res.status(400).json({ success: false, message: 'Role must be OFFICER, ADMIN, GRAMA_SACHIVALAYAM, or DISTRICT_AUTHORITY.' });
  }
  if (typeof active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Account active status must be true or false.' });
  }
  if (cleanRole === 'OFFICER' && (!cleanDepartment || cleanDepartment.length > 120)) {
    return res.status(400).json({ success: false, message: 'An officer department is required and must be at most 120 characters.' });
  }
  if (cleanDepartment.length > 120) {
    return res.status(400).json({ success: false, message: 'Department must be at most 120 characters.' });
  }
  if (officers.some(account => normalizeUsername(account.username) === normalizeUsername(cleanUsername))) {
    return res.status(409).json({ success: false, message: 'That username is already registered.' });
  }

  const account = {
    username: cleanUsername,
    role: cleanRole,
    department: cleanDepartment || null,
    active,
    tokenVersion: 0,
    passwordHash: hashPassword(password)
  };
  officers.push(account);
  try {
    persistOfficers();
  } catch (error) {
    officers.pop();
    console.error('Unable to store officer identity:', {
      username: account.username,
      role: account.role,
      error: error.message
    });
    return res.status(500).json({ success: false, message: 'Officer account could not be stored.' });
  }
  res.status(201).json({
    success: true,
    message: 'Account registered successfully.',
    user: { username: account.username, role: account.role, department: account.department, active: account.active }
  });
});

app.get('/api/complaints', (req, res) => {
  refreshOverdueStatus();
  const { category, status, village, search } = req.query;
  let filtered = [...complaints];

  if (category && category !== 'all') {
    filtered = filtered.filter(c => c.categoryKey.toLowerCase() === category.toLowerCase());
  }
  if (status && status !== 'all') {
    if (status === 'overdue') {
      filtered = filtered.filter(c => c.isOverdue && c.status !== 'Resolved');
    } else {
      filtered = filtered.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }
  }
  if (village && village !== 'all') {
    filtered = filtered.filter(c => c.village.toLowerCase().includes(village.toLowerCase()));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c => 
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.titleTe && c.titleTe.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q) ||
      c.citizenName.toLowerCase().includes(q) ||
      c.landmark.toLowerCase().includes(q)
    );
  }

  // Sort: newest first
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({
    success: true,
    count: filtered.length,
    data: filtered.map(complaint => ({ ...complaint, evidence: evidenceForResponse(complaint) }))
  });
});

app.get('/api/grama/dashboard', requireRoles('GRAMA_SACHIVALAYAM'), (req, res) => {
  refreshOverdueStatus();
  res.json({
    success: true,
    user: { username: req.auth.username, role: req.auth.role },
    data: complaints.map(complaint => ({ ...complaint, evidence: evidenceForResponse(complaint) }))
  });
});

app.get('/api/district/dashboard', requireRoles('DISTRICT_AUTHORITY'), (req, res) => {
  refreshOverdueStatus();
  res.json({
    success: true,
    user: { username: req.auth.username, role: req.auth.role },
    data: complaints.map(complaint => ({ ...complaint, evidence: evidenceForResponse(complaint) }))
  });
});

app.post('/api/grama/complaints/:id/forward', requireRoles('GRAMA_SACHIVALAYAM'), (req, res) => {
  const complaint = complaints.find(item => item.id.toUpperCase() === req.params.id.toUpperCase());
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }
  if (['FORWARDED_TO_DISTRICT', 'DISTRICT_ESCALATED', 'URGENT_ESCALATION', 'Resolved'].includes(complaint.status)) {
    return res.status(409).json({ success: false, message: 'This complaint cannot be forwarded in its current status.' });
  }
  if (!complaint.assignedDepartment || complaint.assignedDepartment === 'Pending Assignment') {
    return res.status(409).json({ success: false, message: 'Assign the complaint to a department before forwarding it.' });
  }

  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason || reason.length > 4000) {
    return res.status(400).json({
      success: false,
      message: 'A forwarding reason is required and must be at most 4000 characters.'
    });
  }

  const previousStatus = complaint.status;
  const previousSource = complaint.source;
  const previousReason = complaint.districtReviewReason;
  const previousForwardedAt = complaint.forwardedAt;
  const previousTimelineLength = complaint.timeline.length;
  const forwardedAt = new Date().toISOString();
  complaint.status = 'FORWARDED_TO_DISTRICT';
  complaint.source = 'Grama Sachivalayam';
  complaint.districtReviewReason = reason;
  complaint.forwardedAt = forwardedAt;
  complaint.timeline.push({
    status: 'FORWARDED_TO_DISTRICT',
    timestamp: forwardedAt,
    actor: req.auth.username,
    note: reason
  });

  try {
    persistComplaints();
  } catch (error) {
    complaint.status = previousStatus;
    complaint.source = previousSource;
    complaint.districtReviewReason = previousReason;
    complaint.forwardedAt = previousForwardedAt;
    complaint.timeline.length = previousTimelineLength;
    console.error('Unable to persist Grama Sachivalayam forwarding:', error.message);
    return res.status(500).json({ success: false, message: 'The complaint could not be forwarded to District Authority.' });
  }

  res.json({
    success: true,
    message: 'Complaint forwarded to District Authority.',
    data: { ...complaint, evidence: evidenceForResponse(complaint) }
  });
});

app.get('/api/complaints/:id', (req, res) => {
  refreshOverdueStatus();
  const complaint = complaints.find(c => c.id.toUpperCase() === req.params.id.toUpperCase());
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint ID not found' });
  }
  res.json({ success: true, data: { ...complaint, evidence: evidenceForResponse(complaint) } });
});

app.get('/api/district/reviews', requireRoles('DISTRICT_AUTHORITY', 'ADMIN'), (req, res) => {
  const pendingReviews = complaints.filter(complaint => complaint.status === 'FORWARDED_TO_DISTRICT');
  res.json({
    success: true,
    count: pendingReviews.length,
    data: pendingReviews.map(complaint => ({ ...complaint, evidence: evidenceForResponse(complaint) }))
  });
});

app.get('/api/district/reviews/:id', requireRoles('DISTRICT_AUTHORITY', 'ADMIN'), (req, res) => {
  const complaint = complaints.find(item => item.id.toUpperCase() === req.params.id.toUpperCase());
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }
  if (!complaint.forwardedAt && !complaint.districtReviewReceivedAt) {
    return res.status(409).json({ success: false, message: 'This complaint has not been forwarded to District Authority.' });
  }
  res.json({ success: true, data: { ...complaint, evidence: evidenceForResponse(complaint) } });
});

app.post('/api/district/reviews/:id/return', requireRoles('DISTRICT_AUTHORITY', 'ADMIN'), (req, res) => {
  const complaint = complaints.find(item => item.id.toUpperCase() === req.params.id.toUpperCase());
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }
  if (complaint.status !== 'FORWARDED_TO_DISTRICT') {
    return res.status(409).json({ success: false, message: 'This complaint is no longer pending District Authority review.' });
  }

  const instructions = typeof req.body.instructions === 'string' ? req.body.instructions.trim() : '';
  if (!instructions || instructions.length > 4000) {
    return res.status(400).json({
      success: false,
      message: 'District instructions are required and must be at most 4000 characters.'
    });
  }

  const now = new Date();
  const returnedAt = now.toISOString();
  const deadlineAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const previousStatus = complaint.status;
  const previousUrgentEscalation = complaint.urgentEscalation;
  const previousDistrictRemarks = complaint.districtAuthorityRemarks;
  const previousDistrictEscalatedAt = complaint.districtEscalatedAt;
  const previousIsOverdue = complaint.isOverdue;
  const previousTimelineLength = complaint.timeline.length;

  complaint.status = 'DISTRICT_ESCALATED';
  complaint.districtAuthorityRemarks = instructions;
  complaint.districtEscalatedAt = returnedAt;
  complaint.isOverdue = false;
  complaint.urgentEscalation = {
    source: 'District Authority',
    assignedTo: 'Grama Sachivalayam',
    instructions,
    returnedAt,
    deadlineAt,
    status: 'OPEN'
  };
  complaint.timeline.push({
    status: 'DISTRICT_ESCALATED',
    timestamp: returnedAt,
    actor: req.auth.username,
    note: `Returned to Grama Sachivalayam with a 24-hour deadline. Instructions: ${instructions}`
  });

  try {
    persistComplaints();
  } catch (error) {
    complaint.status = previousStatus;
    complaint.urgentEscalation = previousUrgentEscalation;
    complaint.districtAuthorityRemarks = previousDistrictRemarks;
    complaint.districtEscalatedAt = previousDistrictEscalatedAt;
    complaint.isOverdue = previousIsOverdue;
    complaint.timeline.length = previousTimelineLength;
    console.error('Unable to persist District Authority return:', error.message);
    return res.status(500).json({ success: false, message: 'The complaint could not be returned to Grama Sachivalayam.' });
  }

  res.json({
    success: true,
    message: 'Complaint returned to Grama Sachivalayam with a 24-hour deadline.',
    data: { ...complaint, evidence: evidenceForResponse(complaint) }
  });
});

app.get('/api/official/urgent-escalations', requireRoles('GRAMA_SACHIVALAYAM', 'OFFICER', 'ADMIN'), (req, res) => {
  const urgentEscalations = complaints.filter(complaint =>
    complaint.urgentEscalation && complaint.status !== 'Resolved' &&
    (req.auth.role === 'ADMIN' ||
      req.auth.role === 'GRAMA_SACHIVALAYAM' ||
      complaint.assignedDepartment === req.auth.department)
  );
  res.json({
    success: true,
    count: urgentEscalations.length,
    data: urgentEscalations.map(complaint => ({ ...complaint, evidence: evidenceForResponse(complaint) }))
  });
});

app.post('/api/complaints', (req, res) => {
  const {
    category,
    categoryKey,
    categoryTe,
    title,
    titleTe,
    description,
    descriptionTe,
    voiceTranscript,
    citizenName,
    citizenPhone,
    village,
    ward,
    landmark,
    gpsCoordinates
  } = req.body;

  if (!category || !description) {
    return res.status(400).json({ success: false, message: 'Category and description are required' });
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'citizenPhoto')) {
    return res.status(400).json({
      success: false,
      message: 'Upload complaint photographs through the complaint evidence upload endpoint.'
    });
  }

  // Auto-generate clean unique ID e.g. PP-2025-RD-8492
  const catCodeMap = {
    roads: 'RD',
    water: 'WT',
    electricity: 'EL',
    drainage: 'DR',
    sanitation: 'SN',
    other: 'OT'
  };
  const code = catCodeMap[categoryKey ? categoryKey.toLowerCase() : 'other'] || 'GR';
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newId = `PP-${year}-${code}-${randomSuffix}`;

  const nowIso = new Date().toISOString();

  const newComplaint = {
    id: newId,
    category: category || 'Roads',
    categoryKey: categoryKey || 'roads',
    categoryTe: categoryTe || 'రహదారులు',
    title: title || `${category} issue reported at ${landmark || ward || village}`,
    titleTe: titleTe || `${categoryTe || category} సమస్య - ${landmark || ward || village}`,
    description: description,
    descriptionTe: descriptionTe || description,
    voiceTranscript: voiceTranscript || null,
    citizenName: citizenName || 'Anonymous Villager (గ్రామస్థుడు)',
    citizenPhone: citizenPhone || '+91 98480 00000',
    village: village || 'Ramapuram (రామాపురం)',
    ward: ward || 'Ward 1 (వార్డు 1)',
    landmark: landmark || 'Village Main Center',
    gpsCoordinates: gpsCoordinates || '16.5062° N, 80.6480° E',
    createdAt: nowIso,
    slaHours: 72,
    status: 'Submitted',
    assignedDepartment: 'Pending Assignment',
    assignedOfficer: 'Unassigned',
    officerContact: null,
    priority: 'Medium',
    isOverdue: false,
    evidence: [],
    inspectionNotes: null,
    officialRemarks: null,
    resolutionRemarks: null,
    resolvedAt: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: nowIso,
        actor: citizenName || 'Villager',
        note: 'Grievance submitted. Complaint ID generated; photo evidence can be uploaded separately.'
      }
    ]
  };

  complaints.unshift(newComplaint);
  persistComplaints();
  res.status(201).json({
    success: true,
    message: 'Complaint registered successfully',
    data: { ...newComplaint, evidence: evidenceForResponse(newComplaint) }
  });
});

app.post('/api/complaints/:id/evidence', evidenceUpload.single('file'), (req, res) => {
  const complaint = complaints.find(item => item.id.toUpperCase() === req.params.id.toUpperCase());
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found.' });
  }

  const { type } = req.body;
  if (!['complaint', 'resolution', 'inspection', 'progress'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Evidence type must be "complaint", "inspection", "progress", or "resolution".'
    });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Select an image file to upload.' });
  }

  const detectedType = detectImageType(req.file.buffer);
  if (!detectedType || detectedType.mimeType !== req.file.mimetype) {
    return res.status(415).json({
      success: false,
      message: 'The file contents do not match a supported JPEG, PNG, or WebP MIME type.'
    });
  }

  let uploaderId;
  let inspectionNotes = '';
  if (type === 'resolution' || type === 'inspection' || type === 'progress') {
    const user = authorizeRequest(req, res, ['GRAMA_SACHIVALAYAM', 'OFFICER', 'ADMIN']);
    if (!user) return;
    if (!officerCanAccessComplaint(user, complaint, res)) return;
    uploaderId = user.username;
    if (type === 'inspection') {
      inspectionNotes = typeof req.body.inspectionNotes === 'string' ? req.body.inspectionNotes.trim() : '';
      if (!inspectionNotes || inspectionNotes.length > MAX_INSPECTION_NOTES_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Inspection notes are required and must be no more than ${MAX_INSPECTION_NOTES_LENGTH} characters.`
        });
      }
    }
    if (complaint.status === 'Resolved') {
      return res.status(409).json({
        success: false,
        message: 'Reopen this complaint before adding official evidence.'
      });
    }
  } else {
    if (complaint.status !== 'Submitted') {
      return res.status(409).json({
        success: false,
        message: 'Original complaint evidence can only be added before the complaint is assigned.'
      });
    }
    if (complaint.evidence.some(item => item.type === 'complaint')) {
      return res.status(409).json({
        success: false,
        message: 'Original complaint evidence already exists and cannot be replaced.'
      });
    }
    uploaderId = `citizen:${complaint.id}`;
  }

  const evidence = {
    id: crypto.randomUUID(),
    complaintId: complaint.id,
    uploaderId,
    uploadedAt: new Date().toISOString(),
    type,
    inspectionNotes: type === 'inspection' ? inspectionNotes : null,
    mimeType: detectedType.mimeType,
    size: req.file.size,
    fileName: `${crypto.randomUUID()}${detectedType.extension}`
  };
  const destination = path.join(EVIDENCE_DIR, evidence.fileName);
  const previousInspectionNotes = complaint.inspectionNotes || null;

  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(destination, req.file.buffer, { flag: 'wx' });
    complaint.evidence.push(evidence);
    if (type === 'inspection') complaint.inspectionNotes = inspectionNotes;
    complaint.timeline.push({
      status: complaint.status,
      timestamp: evidence.uploadedAt,
      actor: uploaderId,
      note: type === 'complaint'
        ? `Original complaint evidence uploaded (${evidence.mimeType}, ${evidence.size} bytes).`
        : type === 'inspection'
          ? `Official field inspection evidence uploaded: ${inspectionNotes}`
          : type === 'progress'
            ? `Official work-in-progress evidence uploaded (${evidence.mimeType}, ${evidence.size} bytes).`
            : `Official resolution evidence uploaded (${evidence.mimeType}, ${evidence.size} bytes).`
    });
    try {
      persistComplaints();
    } catch (error) {
      complaint.evidence.pop();
      complaint.timeline.pop();
      if (type === 'inspection') complaint.inspectionNotes = previousInspectionNotes;
      fs.unlinkSync(destination);
      throw error;
    }
  } catch (error) {
    console.error('Unable to store complaint evidence:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Evidence could not be stored. Please try again or contact support.'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Evidence uploaded and recorded successfully.',
    data: evidenceForResponse(complaint).find(item => item.id === evidence.id)
  });
});

app.get('/api/evidence/:id', (req, res, next) => {
  const evidence = complaints
    .flatMap(complaint => complaint.evidence)
    .find(item => item.id === req.params.id);
  if (!evidence) {
    return res.status(404).json({ success: false, message: 'Evidence not found.' });
  }

  const filePath = path.join(EVIDENCE_DIR, evidence.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Evidence file is unavailable.' });
  }
  res.type(evidence.mimeType).sendFile(filePath, error => {
    if (error) next(error);
  });
});

// Update complaint assignment, status, and remarks.
app.patch('/api/complaints/:id', requireRoles('GRAMA_SACHIVALAYAM', 'OFFICER', 'ADMIN'), (req, res) => {
  const index = complaints.findIndex(c => c.id.toUpperCase() === req.params.id.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const {
    status,
    assignedDepartment,
    assignedOfficer,
    officerContact,
    officialRemarks,
    resolutionRemarks,
    priority
  } = req.body;

  const current = complaints[index];
  const previousComplaint = JSON.parse(JSON.stringify(current));
  const nowIso = new Date().toISOString();
  const validStatuses = new Set([
    'Submitted',
    'Assigned',
    'In Progress',
    'Resolved',
    'Reopened',
    'Escalated',
    'DISTRICT_ESCALATED',
    'URGENT_ESCALATION'
  ]);
  const firstOfficerAssignment = req.auth.role === 'OFFICER' &&
    current.assignedDepartment === 'Pending Assignment' &&
    assignedDepartment === req.auth.department;

  if (req.auth.role === 'OFFICER') {
    if (assignedDepartment && assignedDepartment !== req.auth.department) {
      return res.status(403).json({
        success: false,
        message: 'Officers can only assign complaints to their registered department.'
      });
    }
    if (current.assignedDepartment !== 'Pending Assignment' &&
        current.assignedDepartment !== req.auth.department) {
      return res.status(403).json({
        success: false,
        message: 'This complaint is not assigned to your department.'
      });
    }
    if (!firstOfficerAssignment && !officerCanAccessComplaint(req.auth, current, res)) return;
  }
  if (req.auth.role === 'GRAMA_SACHIVALAYAM' && current.status === 'FORWARDED_TO_DISTRICT') {
    return res.status(403).json({ success: false, message: 'This complaint is under District Authority review.' });
  }

  if (status && !validStatuses.has(status)) {
    return res.status(400).json({ success: false, message: 'Status value is not supported.' });
  }
  if (status === 'Escalated' && req.auth.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Only an ADMIN account can escalate a complaint.' });
  }
  if (status === 'URGENT_ESCALATION' && current.status !== 'URGENT_ESCALATION') {
    return res.status(403).json({ success: false, message: 'Only the District Authority return workflow can create an urgent escalation.' });
  }
  if (status === 'DISTRICT_ESCALATED' && current.status !== 'DISTRICT_ESCALATED') {
    return res.status(403).json({ success: false, message: 'Only the District Authority review workflow can escalate a complaint to Grama Sachivalayam.' });
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'resolutionPhoto')) {
    return res.status(400).json({
      success: false,
      message: 'Resolution images must be uploaded as evidence before changing the status.'
    });
  }
  if (status === 'Resolved') {
    const isDistrictReturned = current.status === 'DISTRICT_ESCALATED' || current.status === 'URGENT_ESCALATION';
    if (isDistrictReturned &&
        req.auth.role !== 'GRAMA_SACHIVALAYAM' &&
        req.auth.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Grama Sachivalayam can resolve a complaint returned by District Authority.' });
    }
    if (isDistrictReturned &&
        (typeof resolutionRemarks !== 'string' || !resolutionRemarks.trim() || resolutionRemarks.trim().length > MAX_INSPECTION_NOTES_LENGTH)) {
      return res.status(400).json({
        success: false,
        message: 'Resolution remarks are required and must be at most 4000 characters for District-returned complaints.'
      });
    }
    const lastReopen = current.timeline.slice().reverse().find(item => item.status === 'Reopened');
    const lastReopenTime = lastReopen ? new Date(lastReopen.timestamp).getTime() : 0;
    const districtReturnTime = isDistrictReturned
      ? Date.parse(current.districtEscalatedAt || (current.urgentEscalation && current.urgentEscalation.returnedAt))
      : 0;
    const requiredEvidenceTime = Math.max(lastReopenTime, Number.isFinite(districtReturnTime) ? districtReturnTime : 0);
    const hasStoredResolutionEvidence = current.evidence.some(item =>
      item.type === 'resolution' &&
      new Date(item.uploadedAt).getTime() > requiredEvidenceTime &&
      fs.existsSync(path.join(EVIDENCE_DIR, item.fileName))
    );
    if (!hasStoredResolutionEvidence) {
      return res.status(422).json({
        success: false,
        message: 'Upload official resolution evidence before marking this complaint as resolved.'
      });
    }
  }

  if (assignedDepartment) current.assignedDepartment = assignedDepartment;
  if (firstOfficerAssignment) current.assignedOfficer = req.auth.username;
  if (assignedOfficer && req.auth.role === 'ADMIN') current.assignedOfficer = assignedOfficer;
  if (officerContact) current.officerContact = officerContact;
  if (officialRemarks) current.officialRemarks = officialRemarks;
  if (resolutionRemarks) current.resolutionRemarks = resolutionRemarks;
  if (priority) current.priority = priority;

  // Status transition handling
  if (status && status !== current.status) {
    const oldStatus = current.status;
    current.status = status;
    if (status === 'Resolved' && current.urgentEscalation) {
      current.urgentEscalation.status = 'CLOSED';
    }
    if (status === 'Resolved') {
      current.resolvedAt = nowIso;
    }

    let noteText = `Status transitioned from ${oldStatus} to ${status}.`;
    if (status === 'Assigned') {
      noteText = `Assigned to ${current.assignedDepartment} (${current.assignedOfficer || 'Field Team'}).`;
    } else if (status === 'In Progress') {
      noteText = `Official field work started: ${officialRemarks || 'Repair team mobilized to location.'}`;
    } else if (status === 'Resolved') {
      noteText = `Grievance resolved after resolution evidence was uploaded. Remarks: ${resolutionRemarks || officialRemarks || 'Repairs completed.'}`;
      current.isOverdue = false;
    }

    current.timeline.push({
      status: status,
      timestamp: nowIso,
      actor: req.auth.username,
      note: noteText
    });
  } else if (officialRemarks && !status) {
    current.timeline.push({
      status: current.status,
      timestamp: nowIso,
      actor: req.auth.username,
      note: `Official Remark added: ${officialRemarks}`
    });
  }

  try {
    persistComplaints();
  } catch (error) {
    complaints[index] = previousComplaint;
    console.error('Unable to persist complaint update:', error.message);
    return res.status(500).json({ success: false, message: 'The complaint update could not be saved.' });
  }
  res.json({
    success: true,
    message: 'Complaint updated successfully',
    data: { ...current, evidence: evidenceForResponse(current) }
  });
});

// Higher Authority Escalation
app.post('/api/complaints/:id/escalate', requireRoles('ADMIN'), (req, res) => {
  const index = complaints.findIndex(c => c.id.toUpperCase() === req.params.id.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const { escalationReason } = req.body;
  const current = complaints[index];
  const nowIso = new Date().toISOString();

  current.status = 'Escalated';
  current.priority = 'Critical';
  const reason = escalationReason || 'Statutory SLA deadline breached. Collectorate direct intervention ordered.';

  current.timeline.push({
    status: 'Escalated',
    timestamp: nowIso,
    actor: req.auth.username,
    note: `HIGHER AUTHORITY ESCALATION NOTICE: ${reason}`
  });

  persistComplaints();
  res.json({
    success: true,
    message: 'Complaint escalated successfully',
    data: { ...current, evidence: evidenceForResponse(current) }
  });
});

// Citizen Feedback or Reopen
app.post('/api/complaints/:id/feedback', (req, res) => {
  const index = complaints.findIndex(c => c.id.toUpperCase() === req.params.id.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const { rating, comment, isSatisfied, reopenReason, citizenName } = req.body;
  const current = complaints[index];
  const nowIso = new Date().toISOString();

  if (isSatisfied === false || reopenReason) {
    // Reopen complaint!
    current.status = 'Reopened';
    current.priority = 'High';
    current.citizenFeedback = {
      rating: rating || 1,
      comment: reopenReason || comment || 'Citizen reported the issue was not properly solved.',
      verifiedAt: nowIso,
      isSatisfied: false
    };

    current.timeline.push({
      status: 'Reopened',
      timestamp: nowIso,
      actor: citizenName || current.citizenName || 'Citizen',
      note: `CITIZEN REOPENED GRIEVANCE: "${reopenReason || comment || 'Problem persists on site.'}" Resolution rejected.`
    });

    persistComplaints();
    return res.json({
      success: true,
      message: 'Complaint reopened and flagged for official review',
      data: { ...current, evidence: evidenceForResponse(current) }
    });
  }

  // Satisfied resolution
  current.citizenFeedback = {
    rating: rating || 5,
    comment: comment || 'Verified and satisfied with resolution.',
    verifiedAt: nowIso,
    isSatisfied: true
  };

  current.timeline.push({
    status: 'Citizen Verified',
    timestamp: nowIso,
    actor: citizenName || current.citizenName || 'Citizen',
    note: `Citizen verified resolution. Rating: ${rating || 5}/5. Note: "${comment || 'Satisfied'}"`
  });

  persistComplaints();
  res.json({
    success: true,
    message: 'Feedback recorded and complaint officially closed',
    data: { ...current, evidence: evidenceForResponse(current) }
  });
});

// Aggregate Statistics for Transparency and Authority Dashboards
app.get('/api/stats', (req, res) => {
  refreshOverdueStatus();

  const reportableComplaints = complaints.filter(c => !c.isHackathonSample);
  const total = reportableComplaints.length;
  const resolved = reportableComplaints.filter(c => c.status === 'Resolved').length;
  const inProgress = reportableComplaints.filter(c => c.status === 'In Progress').length;
  const assigned = reportableComplaints.filter(c => c.status === 'Assigned').length;
  const submitted = reportableComplaints.filter(c => c.status === 'Submitted').length;
  const overdue = reportableComplaints.filter(c => c.isOverdue && c.status !== 'Resolved').length;
  const escalated = reportableComplaints.filter(c => c.status === 'Escalated').length;
  const reopened = reportableComplaints.filter(c => c.status === 'Reopened').length;

  // Category breakdown
  const categoryStats = {
    roads: reportableComplaints.filter(c => c.categoryKey === 'roads').length,
    water: reportableComplaints.filter(c => c.categoryKey === 'water').length,
    electricity: reportableComplaints.filter(c => c.categoryKey === 'electricity').length,
    drainage: reportableComplaints.filter(c => c.categoryKey === 'drainage').length,
    sanitation: reportableComplaints.filter(c => c.categoryKey === 'sanitation').length,
    other: reportableComplaints.filter(c => c.categoryKey === 'other').length,
  };

  // Village performance
  const villageStats = {
    Ramapuram: {
      total: reportableComplaints.filter(c => c.village.includes('Ramapuram')).length,
      resolved: reportableComplaints.filter(c => c.village.includes('Ramapuram') && c.status === 'Resolved').length,
      overdue: reportableComplaints.filter(c => c.village.includes('Ramapuram') && c.isOverdue && c.status !== 'Resolved').length,
    },
    Gandhipuram: {
      total: reportableComplaints.filter(c => c.village.includes('Gandhipuram')).length,
      resolved: reportableComplaints.filter(c => c.village.includes('Gandhipuram') && c.status === 'Resolved').length,
      overdue: reportableComplaints.filter(c => c.village.includes('Gandhipuram') && c.isOverdue && c.status !== 'Resolved').length,
    },
    Krishnapuram: {
      total: reportableComplaints.filter(c => c.village.includes('Krishnapuram')).length,
      resolved: reportableComplaints.filter(c => c.village.includes('Krishnapuram') && c.status === 'Resolved').length,
      overdue: reportableComplaints.filter(c => c.village.includes('Krishnapuram') && c.isOverdue && c.status !== 'Resolved').length,
    }
  };

  // Calculate resolution rate
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const slaAdherenceRate = (total - overdue) > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

  res.json({
    success: true,
    data: {
      total,
      resolved,
      inProgress,
      assigned,
      submitted,
      overdue,
      escalated,
      reopened,
      resolutionRate,
      slaAdherenceRate,
      avgResolutionDays: '2.8',
      categoryStats,
      villageStats
    }
  });
});

// Reset endpoint for hackathon judges
app.post('/api/reset', requireRoles('ADMIN'), (req, res) => {
  complaints = getInitialSeedComplaints();
  persistComplaints();
  res.json({ success: true, message: 'Sample dataset reset to initial demonstration state', data: complaints });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      message: `Image is too large. Maximum upload size is ${MAX_EVIDENCE_SIZE / (1024 * 1024)} MB.`
    });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({ success: false, message: 'Upload one image file at a time.' });
    return;
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request is too large.' });
    return;
  }

  console.error('Unhandled request error:', error.message);
  res.status(500).json({ success: false, message: 'The request could not be completed.' });
});

function servePortalPage(role, portal) {
  return (req, res) => {
    const user = authenticationConfigured(res) ? verifyAccessToken(getRequestToken(req)) : null;
    if (!user) {
      if (!res.headersSent) res.redirect(`/?portal=${portal}`);
      return;
    }
    if (user.role !== role) {
      return res.status(403).send('Your account is not authorized to access this portal.');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  };
}

app.get(
  ['/grama-sachivalayam', '/grama-sachivalayam/dashboard', '/grama-sachivalayam/*'],
  servePortalPage('GRAMA_SACHIVALAYAM', 'grama')
);
app.get(
  ['/district-authority', '/district-authority/dashboard', '/district-authority/*'],
  servePortalPage('DISTRICT_AUTHORITY', 'district')
);

// Fallback all routes to index.html for single-page app support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌾 PRAJA VOICE - Smart Village Grievance System 🌾`);
  console.log(`🚀 Prototype Server running at: http://localhost:${PORT}`);
  console.log(`🏛️ Modules: Villager Portal | Official Dashboard | Authority Console`);
  console.log(`====================================================`);
});
