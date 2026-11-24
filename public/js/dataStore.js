/**
 * Palle Praja - Unified Client Data Store & Sync Manager
 * Supports: LocalStorage Persistence + Express REST API Sync + Real-time Custom Events
 */

const STORAGE_KEY = 'pallepraja_complaints_v1';

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
    citizenPhoto: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    resolutionPhoto: null,
    officialRemarks: 'Inspected on-site with sarpanch. Material requisition for gravel and bitumen filling approved. Road levelling work underway.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        actor: 'Citizen Rama Rao',
        note: 'Grievance submitted via Voice-First Registration with geo-tagged photo.'
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
    citizenPhoto: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    resolutionPhoto: null,
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
    citizenPhoto: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
    resolutionPhoto: null,
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
    citizenPhoto: 'https://images.unsplash.com/photo-1596785236245-5b53d4289069?auto=format&fit=crop&w=800&q=80',
    resolutionPhoto: null,
    officialRemarks: 'Desilting gang of 5 sanitary workers scheduled for clearance tomorrow 8:00 AM.',
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        actor: 'Citizen Ch. Subbaiah',
        note: 'Voice grievance submitted with landmark photo.'
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
    title: 'Solid waste dumping at weekly Rythu Bazaar ground cleared',
    titleTe: 'రైతు బజార్ మైదానంలో పేరుకుపోయిన చెత్తను పూర్తిగా తొలగించారు',
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
    status: 'Resolved',
    assignedDepartment: 'Panchayat Sanitation & Public Health',
    assignedOfficer: 'K. Tirupathi Rao (Health Inspector)',
    officerContact: '+91 91770 12345',
    priority: 'Medium',
    isOverdue: false,
    citizenPhoto: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80',
    resolutionPhoto: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    officialRemarks: 'Tractor deployed, 3 metric tonnes of organic waste cleared and composted at Solid Waste Management Shed. Lime powder sprayed for disinfection.',
    resolutionRemarks: 'Completed on 23rd Nov. Site inspected and certified clean by Ward Member.',
    citizenFeedback: {
      rating: 5,
      comment: 'Thank you Palle Praja and Grama Sachivalayam! The ground was cleaned thoroughly and lime was sprinkled.',
      commentTe: 'చాలా ధన్యవాదాలు. మైదానం శుభ్రం చేసి సున్నం చల్లారు. సమస్య పరిష్కారమైంది.',
      verifiedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      isSatisfied: true
    },
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
        note: 'Sanitation tractor and team cleared the garbage yard.'
      },
      {
        status: 'Resolved',
        timestamp: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
        actor: 'Panchayat Secretary',
        note: 'Resolution verified with after-cleanup photo evidence.'
      },
      {
        status: 'Citizen Verified',
        timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        actor: 'Citizen M. Padmavathi',
        note: 'Citizen confirmed resolution with 5-star rating.'
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
    citizenPhoto: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
    resolutionPhoto: null,
    officialRemarks: null,
    resolutionRemarks: null,
    citizenFeedback: null,
    timeline: [
      {
        status: 'Submitted',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        actor: 'Citizen S. Ramana Murthy',
        note: 'Fresh complaint registered via Palle Praja voice portal.'
      }
    ]
  }
];

class DataStore {
  constructor() {
    this.complaints = [];
    this.apiAvailable = true;
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
        const createdTime = new Date(item.createdAt).getTime();
        const elapsedHours = (now - createdTime) / (3600 * 1000);
        const shouldBeOverdue = elapsedHours > item.slaHours;
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

  async getAllComplaints(filters = {}) {
    this.refreshOverdue();
    // Try API if running on server
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
      citizenPhoto: complaintData.citizenPhoto || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      resolutionPhoto: null,
      officialRemarks: null,
      resolutionRemarks: null,
      citizenFeedback: null,
      timeline: [
        {
          status: 'Submitted',
          timestamp: nowIso,
          actor: complaintData.citizenName || 'Villager Rama Rao',
          note: 'Grievance submitted via Voice-First Registration with photographic proof.'
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

  async updateComplaint(id, updates) {
    const cleanId = id.toUpperCase();
    const index = this.complaints.findIndex(c => c.id.toUpperCase() === cleanId);
    if (index === -1) return null;

    const current = this.complaints[index];
    const nowIso = new Date().toISOString();

    // Try API first
    try {
      const res = await fetch(`/api/complaints/${cleanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          this.complaints[index] = data.data;
          this.persist();
          this.broadcast('pallepraja:status-changed', { complaint: data.data });
          return data.data;
        }
      }
    } catch (e) {}

    // Local fallback update
    if (updates.assignedDepartment) current.assignedDepartment = updates.assignedDepartment;
    if (updates.assignedOfficer) current.assignedOfficer = updates.assignedOfficer;
    if (updates.officerContact) current.officerContact = updates.officerContact;
    if (updates.officialRemarks) current.officialRemarks = updates.officialRemarks;
    if (updates.resolutionPhoto) current.resolutionPhoto = updates.resolutionPhoto;
    if (updates.resolutionRemarks) current.resolutionRemarks = updates.resolutionRemarks;
    if (updates.priority) current.priority = updates.priority;

    if (updates.status && updates.status !== current.status) {
      const oldStatus = current.status;
      current.status = updates.status;

      let noteText = `Status transitioned from ${oldStatus} to ${updates.status}.`;
      if (updates.status === 'Assigned') {
        noteText = `Assigned to ${current.assignedDepartment} (${current.assignedOfficer || 'Field Unit'}). Target SLA: 72 hrs.`;
      } else if (updates.status === 'In Progress') {
        noteText = `Official field work started: ${updates.officialRemarks || 'Repair gang dispatched to site.'}`;
      } else if (updates.status === 'Resolved') {
        noteText = `Grievance marked RESOLVED with after-repair photographic proof. Remarks: ${updates.resolutionRemarks || updates.officialRemarks || 'Work inspected & completed.'}`;
        current.isOverdue = false;
      }

      current.timeline.push({
        status: updates.status,
        timestamp: nowIso,
        actor: updates.actionActor || 'Village Official (V. Srikanth, Panchayat Sec.)',
        note: noteText
      });
    } else if (updates.officialRemarks && !updates.status) {
      current.timeline.push({
        status: current.status,
        timestamp: nowIso,
        actor: updates.actionActor || 'Village Official',
        note: `Official Field Log: ${updates.officialRemarks}`
      });
    }

    this.persist();
    this.broadcast('pallepraja:status-changed', { complaint: current });
    return current;
  }

  async escalateComplaint(id, reason, authorityName) {
    const cleanId = id.toUpperCase();
    const index = this.complaints.findIndex(c => c.id.toUpperCase() === cleanId);
    if (index === -1) return null;

    try {
      const res = await fetch(`/api/complaints/${cleanId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalationReason: reason, authorityName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          this.complaints[index] = data.data;
          this.persist();
          this.broadcast('pallepraja:escalated', { complaint: data.data });
          return data.data;
        }
      }
    } catch (e) {}

    // Local fallback
    const current = this.complaints[index];
    const nowIso = new Date().toISOString();
    current.status = 'Escalated';
    current.priority = 'Critical';
    const finalReason = reason || 'Statutory SLA deadline breached. Collectorate direct intervention ordered.';

    current.timeline.push({
      status: 'Escalated',
      timestamp: nowIso,
      actor: authorityName || 'District Collector (Dr. Ananya Reddy, IAS)',
      note: `DISTRICT COLLECTORATE ESCALATION: ${finalReason}`
    });

    this.persist();
    this.broadcast('pallepraja:escalated', { complaint: current });
    return current;
  }

  async submitFeedback(id, { rating, comment, isSatisfied, reopenReason, citizenName }) {
    const cleanId = id.toUpperCase();
    const index = this.complaints.findIndex(c => c.id.toUpperCase() === cleanId);
    if (index === -1) return null;

    try {
      const res = await fetch(`/api/complaints/${cleanId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, isSatisfied, reopenReason, citizenName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          this.complaints[index] = data.data;
          this.persist();
          this.broadcast('pallepraja:data-updated', { complaint: data.data });
          return data.data;
        }
      }
    } catch (e) {}

    // Local fallback
    const current = this.complaints[index];
    const nowIso = new Date().toISOString();

    if (isSatisfied === false || reopenReason) {
      current.status = 'Reopened';
      current.priority = 'High';
      current.citizenFeedback = {
        rating: rating || 1,
        comment: reopenReason || comment || 'Problem persists or poor repair quality.',
        verifiedAt: nowIso,
        isSatisfied: false
      };
      current.timeline.push({
        status: 'Reopened',
        timestamp: nowIso,
        actor: citizenName || current.citizenName || 'Citizen Rama Rao',
        note: `CITIZEN REOPENED GRIEVANCE: "${reopenReason || comment || 'Work incomplete'}" Official resolution rejected.`
      });
    } else {
      current.citizenFeedback = {
        rating: rating || 5,
        comment: comment || 'Verified and satisfied with resolution.',
        verifiedAt: nowIso,
        isSatisfied: true
      };
      current.timeline.push({
        status: 'Citizen Verified',
        timestamp: nowIso,
        actor: citizenName || current.citizenName || 'Citizen Rama Rao',
        note: `Citizen verified resolution. Rating: ${rating || 5}/5. Review: "${comment || 'Satisfied'}"`
      });
    }

    this.persist();
    this.broadcast('pallepraja:data-updated', { complaint: current });
    return current;
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

    const total = this.complaints.length;
    const resolved = this.complaints.filter(c => c.status === 'Resolved').length;
    const inProgress = this.complaints.filter(c => c.status === 'In Progress').length;
    const assigned = this.complaints.filter(c => c.status === 'Assigned').length;
    const submitted = this.complaints.filter(c => c.status === 'Submitted').length;
    const overdue = this.complaints.filter(c => c.isOverdue && c.status !== 'Resolved').length;
    const escalated = this.complaints.filter(c => c.status === 'Escalated').length;
    const reopened = this.complaints.filter(c => c.status === 'Reopened').length;

    const categoryStats = {
      roads: this.complaints.filter(c => c.categoryKey === 'roads').length,
      water: this.complaints.filter(c => c.categoryKey === 'water').length,
      electricity: this.complaints.filter(c => c.categoryKey === 'electricity').length,
      drainage: this.complaints.filter(c => c.categoryKey === 'drainage').length,
      sanitation: this.complaints.filter(c => c.categoryKey === 'sanitation').length,
      other: this.complaints.filter(c => c.categoryKey === 'other').length,
    };

    const villageStats = {
      Ramapuram: {
        total: this.complaints.filter(c => c.village.includes('Ramapuram')).length,
        resolved: this.complaints.filter(c => c.village.includes('Ramapuram') && c.status === 'Resolved').length,
        overdue: this.complaints.filter(c => c.village.includes('Ramapuram') && c.isOverdue && c.status !== 'Resolved').length,
      },
      Gandhipuram: {
        total: this.complaints.filter(c => c.village.includes('Gandhipuram')).length,
        resolved: this.complaints.filter(c => c.village.includes('Gandhipuram') && c.status === 'Resolved').length,
        overdue: this.complaints.filter(c => c.village.includes('Gandhipuram') && c.isOverdue && c.status !== 'Resolved').length,
      },
      Krishnapuram: {
        total: this.complaints.filter(c => c.village.includes('Krishnapuram')).length,
        resolved: this.complaints.filter(c => c.village.includes('Krishnapuram') && c.status === 'Resolved').length,
        overdue: this.complaints.filter(c => c.village.includes('Krishnapuram') && c.isOverdue && c.status !== 'Resolved').length,
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
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {}

    this.complaints = JSON.parse(JSON.stringify(SEED_COMPLAINTS));
    this.persist();
    this.broadcast('pallepraja:data-reset');
    return this.complaints;
  }
}

// Global singleton instance
window.dataStore = new DataStore();
