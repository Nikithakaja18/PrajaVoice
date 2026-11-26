/**
 * Praja Voice - Unified Client Data Store & Sync Manager
 * Supports: LocalStorage Persistence + Express REST API Sync + Real-time Custom Events
 */

const STORAGE_KEY = 'pallepraja_complaints_v1';
const SAMPLE_COMPLAINT_CREATED_AT = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const SAMPLE_COMPLAINT_FORWARDED_AT = new Date(Date.now() - 30 * 60 * 1000).toISOString();

// Seed Complaints for pristine demonstration
const SEED_COMPLAINTS = [
  {
    id: 'PP-2025-RD-1042',
    category: 'Roads & Culverts',
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
    status: 'In Progress',
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
    category: 'Drinking Water Supply',
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
    createdAt: new Date(Date.now() - 98 * 3600 * 1000).toISOString(),
    slaHours: 48,
    status: 'In Progress',
    assignedDepartment: 'Rural Water Supply & Sanitation (RWSS)',
    assignedOfficer: 'M. Sridhar (Sub-Engineer RWSS)',
    officerContact: '+91 94901 88231',
    priority: 'Critical',
    isOverdue: true,
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
    category: 'Electricity & Power',
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
    status: 'Escalated',
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
    category: 'Drainage & Sewage',
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
    category: 'Sanitation & Waste',
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
    category: 'Roads & Culverts',
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
  {
    id: 'PP-2026-SN-9001',
    category: 'Sanitation and Drainage',
    categoryKey: 'sanitation',
    categoryTe: 'పారిశుధ్యం మరియు మురుగు',
    title: 'Overflowing Drainage and Sewage Near Village School',
    titleTe: 'గ్రామ పాఠశాల సమీపంలో పొంగిపొర్లుతున్న మురుగునీటి కాలువ',
    description: 'An open drainage line near the Government Primary School is overflowing, causing foul smell and unhygienic conditions. Students and residents are facing inconvenience. Immediate action is required.',
    descriptionTe: 'ప్రభుత్వ ప్రాథమిక పాఠశాల సమీపంలోని ఓపెన్ డ్రైనేజీ పొంగిపొర్లుతోంది. దుర్వాసన మరియు అపరిశుభ్ర పరిస్థితుల వల్ల విద్యార్థులు, నివాసితులు ఇబ్బంది పడుతున్నారు. తక్షణ చర్య అవసరం.',
    voiceTranscript: null,
    citizenName: 'SAMPLE / HACKATHON TEST DATA',
    citizenPhone: 'Not applicable - sample data',
    village: 'Ramapuram Village',
    ward: 'School vicinity',
    landmark: 'Near Government Primary School',
    gpsCoordinates: null,
    createdAt: SAMPLE_COMPLAINT_CREATED_AT,
    source: 'Grama Sachivalayam',
    isHackathonSample: true,
    sampleLabel: 'SAMPLE / HACKATHON TEST DATA',
    districtReviewReason: 'The issue remains unresolved despite initial village-level follow-up. District-level intervention is requested.',
    forwardedAt: SAMPLE_COMPLAINT_FORWARDED_AT,
    slaHours: 72,
    status: 'FORWARDED_TO_DISTRICT',
    assignedDepartment: 'Panchayat Sanitation & Public Health',
    assignedOfficer: 'Pending District Review',
    officerContact: null,
    priority: 'High',
    isOverdue: false,
    evidence: [],
    inspectionNotes: null,
    officialRemarks: null,
    resolutionRemarks: null,
    citizenFeedback: null,
    urgentEscalation: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: SAMPLE_COMPLAINT_CREATED_AT,
        actor: 'Grama Sachivalayam',
        note: 'Sample complaint prepared for District Authority hackathon workflow demonstration.'
      },
      {
        status: 'FORWARDED_TO_DISTRICT',
        timestamp: SAMPLE_COMPLAINT_FORWARDED_AT,
        actor: 'Grama Sachivalayam',
        note: 'The issue remains unresolved despite initial village-level follow-up. District-level intervention is requested.'
      }
    ]
  }
];

class DataStore {
  constructor() {
    this.complaints = [];
    this.apiAvailable = true;
    this.authToken = null;
    this.authUser = null;
    this.adminToken = null;
    this.init();
  }

  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.complaints = JSON.parse(raw);
      } catch (e) {
        this.complaints = JSON.parse(JSON.stringify(SEED_COMPLAINTS));
        this.persist();
      }
    } else {
      this.complaints = JSON.parse(JSON.stringify(SEED_COMPLAINTS));
      this.persist();
    }
    this.refreshOverdue();
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.complaints));
    } catch (e) {
      console.warn('LocalStorage save failed (quota or disabled):', e);
    }
  }

  broadcast(eventType, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventType, { detail }));
    window.dispatchEvent(new CustomEvent('pallepraja:data-updated', { detail }));
  }

  refreshOverdue() {
    const now = Date.now();
    let changed = false;
    this.complaints.forEach(item => {
      if (item.status !== 'Resolved') {
        const districtDeadline = item.urgentEscalation && Date.parse(item.urgentEscalation.deadlineAt);
        const deadline = Number.isFinite(districtDeadline)
          ? districtDeadline
          : Date.parse(item.createdAt) + item.slaHours * 3600 * 1000;
        const shouldBeOverdue = now > deadline;
        if (item.isOverdue !== shouldBeOverdue) {
          item.isOverdue = shouldBeOverdue;
          changed = true;
        }
      } else {
        if (item.isOverdue) {
          item.isOverdue = false;
          changed = true;
        }
      }
    });
    if (changed) {
      this.persist();
    }
  }

  async getAllComplaints(filters = {}, localOnly = false) {
    this.refreshOverdue();
    // Try API if running on server
    if (!localOnly) {
      try {
        const params = new URLSearchParams();
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.village && filters.village !== 'all') params.append('village', filters.village);
        if (filters.search) params.append('search', filters.search);

        const res = await fetch(`/api/complaints?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            this.complaints = data.data;
            this.persist();
            return this.complaints;
          }
        }
      } catch (e) {
        // Offline or direct static preview fallback
      }
    }

    // Local filtering
    let result = [...this.complaints];

    if (filters.category && filters.category !== 'all') {
      result = result.filter(c => c.categoryKey.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'overdue') {
        result = result.filter(c => c.isOverdue && c.status !== 'Resolved');
      } else {
        result = result.filter(c => c.status.toLowerCase() === filters.status.toLowerCase());
      }
    }
    if (filters.village && filters.village !== 'all') {
      result = result.filter(c => c.village.toLowerCase().includes(filters.village.toLowerCase()));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.titleTe && c.titleTe.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q) ||
        c.citizenName.toLowerCase().includes(q) ||
        c.landmark.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }

  async getComplaintById(id) {
    this.refreshOverdue();
    if (!id) return null;
    const cleanId = id.trim().toUpperCase();

    try {
      const res = await fetch(`/api/complaints/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) return data.data;
      }
    } catch (e) {}

    return this.complaints.find(c => c.id.toUpperCase() === cleanId) || null;
  }

  async getOrderDetails(id) {
    const cleanId = typeof id === 'string' ? id.trim().toUpperCase() : '';
    if (!cleanId) return null;

    let response;
    try {
      response = await fetch(`/api/complaints/${encodeURIComponent(cleanId)}`);
    } catch (error) {
      throw new Error('Could not reach the server to load order details.');
    }

    if (response.status === 404) return null;

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('The server returned an invalid response while loading order details.');
    }
    if (!response.ok) {
      throw new Error(result.message || 'Order details could not be loaded.');
    }
    if (!result || !result.data) {
      throw new Error('The server response did not contain order details.');
    }
    return result.data;
  }

  async createComplaint(complaintData) {
    const catCodeMap = {
      roads: 'RD',
      water: 'WT',
      electricity: 'EL',
      drainage: 'DR',
      sanitation: 'SN',
      other: 'OT'
    };
    const catKey = complaintData.categoryKey ? complaintData.categoryKey.toLowerCase() : 'other';
    const code = catCodeMap[catKey] || 'GR';
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `PP-${year}-${code}-${randomSuffix}`;
    const nowIso = new Date().toISOString();

    const newObj = {
      id: newId,
      category: complaintData.category || 'Roads & Culverts',
      categoryKey: catKey,
      categoryTe: complaintData.categoryTe || 'రహదారులు',
      title: complaintData.title || `${complaintData.category} issue reported at ${complaintData.landmark || complaintData.ward || complaintData.village}`,
      titleTe: complaintData.titleTe || `${complaintData.categoryTe || complaintData.category} సమస్య - ${complaintData.landmark || complaintData.ward || complaintData.village}`,
      description: complaintData.description,
      descriptionTe: complaintData.descriptionTe || complaintData.description,
      voiceTranscript: complaintData.voiceTranscript || null,
      citizenName: complaintData.citizenName || 'Rama Rao (రామారావు)',
      citizenPhone: complaintData.citizenPhone || '+91 98480 23114',
      village: complaintData.village || 'Ramapuram (రామాపురం)',
      ward: complaintData.ward || 'Ward 4 (వార్డు 4)',
      landmark: complaintData.landmark || 'Near Zilla Parishad High School',
      gpsCoordinates: complaintData.gpsCoordinates || '16.5062° N, 80.6480° E',
      createdAt: nowIso,
      slaHours: 72,
      status: 'Submitted',
      assignedDepartment: 'Pending Assignment',
      assignedOfficer: 'Unassigned',
      officerContact: null,
      priority: 'High',
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
          actor: complaintData.citizenName || 'Villager Rama Rao',
          note: 'Grievance submitted via Voice-First Registration. Photo evidence can be uploaded separately.'
        }
      ]
    };

    // Try posting to API
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObj)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          this.complaints.unshift(data.data);
          this.persist();
          this.broadcast('pallepraja:complaint-added', { complaint: data.data });
          return data.data;
        }
      }
    } catch (e) {}

    // Fallback local save
    this.complaints.unshift(newObj);
    this.persist();
    this.broadcast('pallepraja:complaint-added', { complaint: newObj });
    return newObj;
  }

  async login(username, password, portalRole) {
    let response;
    try {
      response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password, ...(portalRole ? { portalRole } : {}) })
      });
    } catch (error) {
      throw new Error('Could not reach the server to sign in.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Officer sign-in failed.');
    }
    if (portalRole) {
      this.authToken = null;
      this.authUser = result.user;
      this.adminToken = null;
    } else if (result.user.role === 'ADMIN') {
      this.adminToken = result.accessToken;
      this.authToken = result.accessToken;
      this.authUser = result.user;
    } else {
      this.authToken = result.accessToken;
      this.authUser = result.user;
    }
    return result;
  }

  async restoreSession() {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
      if (!response.ok) {
        this.authToken = null;
        this.authUser = null;
        this.adminToken = null;
        return null;
      }
      const result = await response.json();
      this.authUser = result.user;
      this.authToken = null;
      this.adminToken = null;
      return this.authUser;
    } catch (error) {
      throw new Error('Could not restore the sign-in session from the server.');
    }
  }

  async logout() {
    let response;
    try {
      response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
    } catch (error) {
      throw new Error('Could not reach the server to sign out.');
    }
    if (!response.ok) throw new Error('The server could not end the sign-in session.');
    this.authToken = null;
    this.authUser = null;
    this.adminToken = null;
  }

  async requestAuthenticated(path, { method = 'GET', body } = {}, accessToken = this.authToken) {
    if (!accessToken && !this.authUser) {
      throw new Error('Sign in with an authorized account to access this workflow.');
    }

    let response;
    try {
      response = await fetch(path, {
        method,
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        credentials: 'same-origin',
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (error) {
      throw new Error('Could not reach the server for this workflow.');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('The server returned an invalid workflow response.');
    }
    if (!response.ok) {
      if (response.status === 401) {
        this.authToken = null;
        this.authUser = null;
        window.dispatchEvent(new CustomEvent('pallepraja:auth-expired'));
      }
      throw new Error(result.message || 'The requested workflow action failed.');
    }
    return result.data;
  }

  async getPortalDashboard(role) {
    const endpoint = role === 'GRAMA_SACHIVALAYAM'
      ? '/api/grama/dashboard'
      : '/api/district/dashboard';
    const data = await this.requestAuthenticated(endpoint);
    this.complaints = data;
    return data;
  }

  getAccounts(accessToken = this.authToken) {
    return this.requestAuthenticated('/api/auth/accounts', {}, accessToken);
  }

  setAccountActive(username, active, accessToken = this.authToken) {
    return this.requestAuthenticated(
      `/api/auth/accounts/${encodeURIComponent(username)}/status`,
      { method: 'PATCH', body: { active } },
      accessToken
    );
  }

  resetAccountPassword(username, password, accessToken = this.authToken) {
    return this.requestAuthenticated(
      `/api/auth/accounts/${encodeURIComponent(username)}/password`,
      { method: 'PATCH', body: { password } },
      accessToken
    );
  }

  getDistrictReviews(accessToken = this.authToken) {
    return this.requestAuthenticated('/api/district/reviews', {}, accessToken);
  }

  async forwardComplaintToDistrict(id, reason, accessToken = this.authToken) {
    const complaint = await this.requestAuthenticated(
      `/api/grama/complaints/${encodeURIComponent(id)}/forward`,
      { method: 'POST', body: { reason } },
      accessToken
    );
    const index = this.complaints.findIndex(item => item.id.toUpperCase() === complaint.id.toUpperCase());
    if (index === -1) this.complaints.unshift(complaint);
    else this.complaints[index] = complaint;
    this.persist();
    this.broadcast('pallepraja:district-review-forwarded', { complaint });
    return complaint;
  }

  getDistrictReview(id, accessToken = this.authToken) {
    return this.requestAuthenticated(`/api/district/reviews/${encodeURIComponent(id)}`, {}, accessToken);
  }

  async returnDistrictReview(id, instructions, accessToken = this.authToken) {
    const complaint = await this.requestAuthenticated(
      `/api/district/reviews/${encodeURIComponent(id)}/return`,
      { method: 'POST', body: { instructions } },
      accessToken
    );
    const index = this.complaints.findIndex(item => item.id.toUpperCase() === complaint.id.toUpperCase());
    if (index === -1) this.complaints.unshift(complaint);
    else this.complaints[index] = complaint;
    this.persist();
    this.broadcast('pallepraja:district-review-returned', { complaint });
    return complaint;
  }

  getUrgentEscalations(accessToken = this.authToken) {
    return this.requestAuthenticated('/api/official/urgent-escalations', {}, accessToken);
  }

  async registerOfficer({ username, password, department, role = 'OFFICER', active = true }, accessToken = this.authToken) {
    let response;
    try {
      response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password, department, role, active })
      });
    } catch (error) {
      throw new Error('Could not reach the server to register the officer.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Officer registration failed.');
    }
    return result.user;
  }

  async uploadEvidence(id, type, file, accessToken = this.authToken, inspectionNotes = '') {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    if (inspectionNotes) formData.append('inspectionNotes', inspectionNotes);

    let response;
    try {
      response = await fetch(`/api/complaints/${encodeURIComponent(id)}/evidence`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData
      });
    } catch (error) {
      throw new Error('Could not reach the server to upload evidence.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Evidence upload failed.');
    }

    const complaint = this.complaints.find(item => item.id.toUpperCase() === id.toUpperCase());
    if (complaint) {
      complaint.evidence = complaint.evidence || [];
      complaint.evidence.push(result.data);
      this.persist();
      this.broadcast('pallepraja:evidence-added', { complaint, evidence: result.data });
    }
    return result.data;
  }

  async updateComplaint(id, updates, accessToken = this.authToken) {
    const cleanId = id.toUpperCase();
    const index = this.complaints.findIndex(c => c.id.toUpperCase() === cleanId);

    let response;
    try {
      response = await fetch(`/api/complaints/${encodeURIComponent(cleanId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      throw new Error('Could not reach the server to save the official update.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Official update failed.');
    }

    if (index === -1) this.complaints.unshift(result.data);
    else this.complaints[index] = result.data;
    this.persist();
    this.broadcast('pallepraja:status-changed', { complaint: result.data });
    return result.data;
  }

  async escalateComplaint(id, reason, accessToken = this.authToken) {
    const cleanId = id.toUpperCase();
    const index = this.complaints.findIndex(c => c.id.toUpperCase() === cleanId);
    if (index === -1) return null;

    let response;
    try {
      response = await fetch(`/api/complaints/${cleanId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ escalationReason: reason })
      });
    } catch (error) {
      throw new Error('Could not reach the server to submit the escalation.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Escalation could not be submitted.');
    }
    this.complaints[index] = result.data;
    this.persist();
    this.broadcast('pallepraja:escalated', { complaint: result.data });
    return result.data;
  }

  async submitFeedback(id, { rating, comment, isSatisfied, reopenReason, citizenName }) {
    const cleanId = id.toUpperCase();
    const index = this.complaints.findIndex(c => c.id.toUpperCase() === cleanId);
    if (index === -1) return null;

    let response;
    try {
      response = await fetch(`/api/complaints/${cleanId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, isSatisfied, reopenReason, citizenName })
      });
    } catch (error) {
      throw new Error('Could not reach the server to submit citizen feedback.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Citizen feedback could not be saved.');
    }

    this.complaints[index] = result.data;
    this.persist();
    this.broadcast('pallepraja:data-updated', { complaint: result.data });
    return result.data;
  }

  async getStats() {
    this.refreshOverdue();
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) return data.data;
      }
    } catch (e) {}

    const reportableComplaints = this.complaints.filter(c => !c.isHackathonSample);
    const total = reportableComplaints.length;
    const resolved = reportableComplaints.filter(c => c.status === 'Resolved').length;
    const inProgress = reportableComplaints.filter(c => c.status === 'In Progress').length;
    const assigned = reportableComplaints.filter(c => c.status === 'Assigned').length;
    const submitted = reportableComplaints.filter(c => c.status === 'Submitted').length;
    const overdue = reportableComplaints.filter(c => c.isOverdue && c.status !== 'Resolved').length;
    const escalated = reportableComplaints.filter(c => c.status === 'Escalated').length;
    const reopened = reportableComplaints.filter(c => c.status === 'Reopened').length;

    const categoryStats = {
      roads: reportableComplaints.filter(c => c.categoryKey === 'roads').length,
      water: reportableComplaints.filter(c => c.categoryKey === 'water').length,
      electricity: reportableComplaints.filter(c => c.categoryKey === 'electricity').length,
      drainage: reportableComplaints.filter(c => c.categoryKey === 'drainage').length,
      sanitation: reportableComplaints.filter(c => c.categoryKey === 'sanitation').length,
      other: reportableComplaints.filter(c => c.categoryKey === 'other').length,
    };

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

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const slaAdherenceRate = (total - overdue) > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return {
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
    };
  }

  async resetData() {
    let response;
    try {
      response = await fetch('/api/reset', {
        method: 'POST',
        headers: this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {},
        credentials: 'same-origin'
      });
    } catch (error) {
      throw new Error('Could not reach the server to reset complaint records.');
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Complaint records could not be reset.');
    }

    this.complaints = result.data;
    this.persist();
    this.broadcast('pallepraja:data-reset');
    return this.complaints;
  }
}

// Global singleton instance
window.dataStore = new DataStore();
