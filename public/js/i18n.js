/**
 * Palle Praja - Bilingual Translation Dictionary (English & Telugu)
 * "Mee Ooru, Mee Hakku, Mee Swaram"
 */

const translations = {
  en: {
    // Brand & Header
    appName: "Palle Praja",
    tagline: "Mee Ooru, Mee Hakku, Mee Swaram",
    subTagline: "Smart Village Grievance Redressal & Transparency Platform",
    roleCitizen: "Villager Portal",
    roleOfficial: "Grama Sachivalayam",
    roleAuthority: "District Authority",
    roleTransparency: "Public Transparency",
    demoBadge: "HACKATHON DEMO MODE",
    resetDemo: "Reset Sample Data",
    walkthroughGuide: "Demo Guide",

    // Roles and Personas
    personaCitizen: "Rama Rao (Villager)",
    personaOfficial: "V. Srikanth (Panchayat Sec.)",
    personaAuthority: "Dr. Ananya Reddy (Collector)",
    currentVillage: "Ramapuram Grama Panchayat",

    // Welcome Screen
    heroTitle: "Empowering Villages with Direct Voice & Transparent Action",
    heroDesc: "Report damaged roads, water shortages, power outages, and drainage issues in your mother tongue. Track real-time progress and verify before grievances are closed.",
    getStartedBtn: "Speak or Report Issue",
    trackGrievanceBtn: "Track My Grievance",
    viewTransparencyBtn: "Village Transparency",
    howItWorksTitle: "How Palle Praja Works in 3 Simple Steps",
    step1Title: "1. Speak in Your Voice",
    step1Desc: "No typing required. Just talk in Telugu or English and snap a photo.",
    step2Title: "2. Automatic Assignment",
    step2Desc: "Instant unique ID & automated dispatch to village engineering departments.",
    step3Title: "3. Verify Before Closure",
    step3Desc: "Officials must upload resolution photos. You approve or reopen if not fixed.",

    // Quick Stats Bar
    statTotalResolved: "Complaints Resolved",
    statSlaCompliance: "SLA Adherence Rate",
    statAvgResolution: "Avg. Resolution Time",
    statActiveGrievances: "Active Grievances",
    statDays: "Days",

    // Villager Dashboard
    greetingVillager: "Namaskaram, Rama Rao garu",
    dashSubtitle: "Ward 4, Ramapuram Grama Panchayat",
    btnNewGrievance: "+ File New Grievance",
    btnTrackGrievance: "Search Grievance ID",
    myComplaintsTitle: "My Grievance History",
    noComplaintsFound: "No grievances registered yet.",
    announcementsTitle: "Village Grama Sabha Notice",
    announcement1: "Weekly drinking water pipeline disinfection scheduled for Wednesday.",
    announcement2: "Mission Bhagiratha team inspecting overhead water tanks in Ward 3 and 4.",

    // Categories
    catRoads: "Roads & Culverts",
    catWater: "Drinking Water Supply",
    catElectricity: "Electricity & Power",
    catDrainage: "Drainage & Sewage",
    catSanitation: "Sanitation & Waste",
    catOther: "Other Village Issues",

    // Category Descriptions
    catRoadsDesc: "Potholes, broken roads, damaged culvert bridges",
    catWaterDesc: "Burst pipes, contaminated water, dry borewells",
    catElectricityDesc: "Sparks, burnt transformers, low hanging wires",
    catDrainageDesc: "Clogged drains, overflow into streets, stagnation",
    catSanitationDesc: "Garbage piles, market waste, spraying lime",
    catOtherDesc: "Streetlights, public buildings, encroachment",

    // Complaint Form
    formTitle: "Register a Village Grievance",
    formSubtitle: "Voice-first reporting with photo evidence and GPS location",
    selectCategory: "1. Select Category of Problem",
    voiceSectionTitle: "2. Describe Problem (Speak or Type)",
    micButtonPrompt: "Click to Speak in Telugu or English",
    micListening: "Listening... Speak clearly now",
    micUnsupported: "Voice recognition unavailable. Please use typing or demo presets.",
    quickVoicePresets: "Quick Hackathon Voice Simulation Presets:",
    presetRoads: "Road has deep potholes near school, accidents happening.",
    presetWater: "Main drinking water pipe burst, no water for 3 days.",
    presetPower: "Transformer burnt down with sparks, wires hanging dangerously.",
    presetDrainage: "Open drain overflowing into temple street, severe stench.",
    presetSanitation: "Garbage piled up at weekly market, please clean.",
    descPlaceholder: "Describe the grievance location and details (or use the microphone above)...",
    photoSectionTitle: "3. Upload Photo Evidence",
    photoUploadHint: "Drag and drop or select an image file",
    photoQuickPick: "Use realistic sample photo:",
    photoPothole: "Damaged Road",
    photoLeak: "Water Leak",
    photoSparks: "Transformer",
    photoDrain: "Clogged Drain",
    locationSectionTitle: "4. Village Location Details",
    lblVillage: "Gram Panchayat / Village",
    lblWard: "Ward Number",
    lblLandmark: "Specific Landmark / Street",
    landmarkPlaceholder: "e.g. Near ZP High School, Opp Shiva Temple",
    lblGps: "GPS Geotag",
    btnDetectGps: "Detect GPS",
    gpsDetected: "GPS Captured: 16.5062° N, 80.6480° E (Accurate to 3m)",
    lblCitizenName: "Citizen Name",
    lblCitizenPhone: "Mobile Number",
    btnSubmitGrievance: "Submit Village Grievance",
    submitting: "Submitting...",

    // Submission Success Modal
    modalSuccessTitle: "Grievance Successfully Registered!",
    modalSuccessSubtitle: "Your voice has been recorded in the Grama Sachivalayam Registry",
    lblComplaintId: "GRIEVANCE TRACKING ID",
    copyId: "Copy ID",
    idCopied: "Copied!",
    lblAssignedSla: "Statutory SLA Resolution Target",
    slaTargetHours: "Within 72 Hours",
    lblSmsAlert: "SMS Confirmation sent to registered mobile.",
    btnTrackNow: "Track This Grievance Now",
    btnClose: "Back to Dashboard",

    // Complaint Tracking Screen
    trackingTitle: "Grievance Status Tracker",
    trackingSubtitle: "100% End-to-End Transparency & Citizen Audit",
    searchPlaceholder: "Enter Complaint ID (e.g. PP-2025-RD-1042)...",
    btnSearch: "Track",
    detailsTitle: "Grievance Dossier",
    lblCategory: "Category",
    lblStatus: "Current Status",
    lblDateReported: "Date Filed",
    lblLocation: "Location",
    lblDept: "Assigned Department",
    lblOfficer: "Assigned Executive Officer",
    lblOfficerContact: "Official Contact",
    lblSlaStatus: "SLA Deadline",
    slaNormal: "On Track (Within 72hr SLA)",
    slaOverdue: "CRITICAL: SLA BREACHED (>72 Hours)",
    slaEscalated: "ESCALATED BY DISTRICT COLLECTOR",
    timelineTitle: "Official Action Timeline",
    photoEvidenceTitle: "Photographic Evidence Audit",
    photoBeforeTitle: "BEFORE (Reported by Citizen)",
    photoAfterTitle: "AFTER (Official Resolution Evidence)",
    noAfterPhoto: "Official resolution photograph will be uploaded once field work is completed.",
    officialRemarksTitle: "Official Remarks & Field Log",

    // Citizen Resolution Verification
    verificationTitle: "Citizen Resolution Verification",
    verificationSubtitle: "Is your problem genuinely resolved? Your feedback directly impacts official accountability.",
    btnApproveResolution: "Verify & Approve Resolution",
    btnReopenGrievance: "Reopen Grievance (Not Fixed)",
    reopenModalTitle: "Reopen Grievance for Re-investigation",
    reopenReasonPrompt: "Please explain why the resolution was unsatisfactory (e.g., poor quality patch, pothole remained):",
    btnConfirmReopen: "Submit Reopen Request",
    feedbackModalTitle: "Rate Resolution Quality",
    lblRating: "Overall Satisfaction Rating:",
    feedbackPlaceholder: "Share your experience with Grama Sachivalayam response...",
    btnSubmitFeedback: "Submit Citizen Rating",

    // Official Dashboard
    officialTitle: "Grama Sachivalayam Grievance Operations",
    officialSubtitle: "Gram Panchayat Complaints Management & Field Dispatch Console",
    statTotalReceived: "Total Complaints",
    statPending: "Pending Assignment",
    statInProgress: "Work In Progress",
    statResolved: "Resolved & Verified",
    statOverdueAlerts: "SLA Overdue Alerts",
    filterCategory: "Filter Category",
    filterStatus: "Filter Status",
    searchComplaints: "Search by ID, keyword, citizen...",
    thId: "Grievance ID",
    thCitizen: "Citizen & Ward",
    thCategory: "Category",
    thDate: "Filed Date",
    thStatus: "Status",
    thSla: "SLA Clock",
    thActions: "Actions",
    btnReviewAction: "Action Console",

    // Official Action Drawer / Modal
    drawerTitle: "Official Action & Dispatch Console",
    drawerCitizenDetails: "Citizen Grievance Details",
    lblOriginalVoice: "Original Voice Transcript:",
    sectionAssign: "1. Department Assignment",
    lblSelectDept: "Select Responsible Engineering Wing:",
    lblOfficerName: "Assigned Field Engineer:",
    lblOfficerPhone: "Engineer Phone:",
    sectionStatus: "2. Update Lifecycle Status",
    lblSelectStatus: "Current Status:",
    sectionRemarks: "3. Official Field Inspection Notes",
    remarksPlaceholder: "Enter inspection observations, machinery dispatched, gravel/bitumen quantity used...",
    sectionResolutionPhoto: "4. Upload Post-Resolution Proof Photograph",
    resPhotoUploadHint: "Upload photo after repairs are completed on-site",
    quickResPhotos: "Sample Resolution Photos:",
    resRepavedRoad: "Repaved Road",
    resFixedPipe: "Repaired Pipeline",
    resFixedPower: "Replaced Transformer",
    resCleanedDrain: "Desilted Drain",
    resCleanedGround: "Cleaned Yard",
    btnSaveChanges: "Save Official Updates & Notify Citizen",

    // Higher Authority Dashboard
    authorityTitle: "District Collectorate & ZP Monitoring Console",
    authoritySubtitle: "Real-Time Rural Grievance Oversight & SLA Accountability Portal",
    kpiIndex: "Grievance Redressal Index",
    kpiIndexDesc: "Based on citizen satisfaction & speed",
    kpiCompliance: "Statutory SLA Adherence",
    kpiComplianceDesc: "Complaints resolved within 72 hrs",
    kpiAvgDays: "Avg Turnaround",
    kpiAvgDaysDesc: "From registration to resolution",
    kpiOverdueBreach: "Critical SLA Breaches",
    kpiOverdueBreachDesc: "Requires Collector intervention",
    deptPerformanceTitle: "Department Performance & SLA Breach Index",
    deptName: "Department Wing",
    deptResolvedPct: "Resolution %",
    deptAvgHours: "Avg Response",
    deptBreaches: "SLA Breaches",
    overdueConsoleTitle: "Overdue Grievance Escalation Chamber",
    overdueConsoleDesc: "Complaints exceeding statutory resolution deadlines. One-click intervention dispatches high-priority Collectorate mandates.",
    btnEscalateNow: "Trigger Collector Escalation",
    escalateModalTitle: "Issue District Collector Escalation Mandate",
    escalateConfirmMsg: "You are issuing an emergency executive mandate under Section 42 of Panchayati Raj Act. This will flag the department head with critical priority.",
    escalateReasonLabel: "Collectorate Directive / Executive Order:",
    escalatePreset: "Emergency intervention ordered by District Collector. Dispatch emergency field unit within 24 hours. Submit compliance report by 5 PM.",
    btnConfirmEscalate: "Dispatch Collector Escalation Order",

    // Village Transparency Page
    transparencyTitle: "Palle Praja Public Transparency Portal",
    transparencySubtitle: "Open civic data for Ramapuram Gram Panchayat. 100% accountable, zero citizen data exposure.",
    metricTotalGrievances: "Total Grievances Registered",
    metricResolvedCount: "Successfully Resolved",
    metricPendingCount: "Under Active Redressal",
    metricOverdueCount: "Overdue Beyond SLA",
    catBreakdownTitle: "Grievance Distribution by Sector",
    wardBreakdownTitle: "Ward-wise Performance & Resolution Velocity",
    recentPublicLogTitle: "Recent Anonymized Redressal Audits (Public Feed)",

    // Status Badges
    statusSubmitted: "Submitted",
    statusAssigned: "Assigned",
    statusInProgress: "In Progress",
    statusResolved: "Resolved",
    statusReopened: "Reopened",
    statusEscalated: "Escalated",
    statusOverdue: "Overdue",

    // Departments
    deptPred: "Panchayat Raj Engineering Dept (PRED)",
    deptRwss: "Rural Water Supply & Sanitation (RWSS)",
    deptDiscom: "APCPDCL / TSSPDCL Rural Electricity",
    deptSanitation: "Panchayat Sanitation & Public Health",
    deptRevenue: "Revenue & Land Records Wing",

    // Common
    viewDetails: "View Details",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    loading: "Loading...",
    success: "Success",
    alert: "Alert"
  },

  te: {
    // Brand & Header
    appName: "పల్లె ప్రజా",
    tagline: "మీ ఊరు, మీ హక్కు, మీ స్వరం",
    subTagline: "స్మార్ట్ గ్రామ ప్రజా సమస్యల పరిష్కార & పారదర్శక వేదిక",
    roleCitizen: "గ్రామస్థుల వేదిక",
    roleOfficial: "గ్రామ సచివాలయం",
    roleAuthority: "జిల్లా ఉన్నతాధికారులు",
    roleTransparency: "ప్రజా పారదర్శకత",
    demoBadge: "హ్యాకథాన్ డెమో మోడ్",
    resetDemo: "నమూనా డేటా రీసెట్",
    walkthroughGuide: "డెమో గైడ్",

    // Roles and Personas
    personaCitizen: "రామారావు (గ్రామస్థుడు)",
    personaOfficial: "వి. శ్రీకాంత్ (పంచాయతీ కార్యదర్శి)",
    personaAuthority: "డా. అనన్య రెడ్డి (కలెక్టర్)",
    currentVillage: "రామాపురం గ్రామ పంచాయతీ",

    // Welcome Screen
    heroTitle: "మీ స్వరం ద్వారా నేరుగా సమస్యను చెప్పండి - పారదర్శక పరిష్కారం పొందండి",
    heroDesc: "దెబ్బతిన్న రోడ్లు, తాగునీటి సమస్యలు, విద్యుత్ లోపాలు, మురుగు కాలువల సమస్యలను మీ స్వభాషలోనే నమోదు చేయండి. పరిష్కారాన్ని స్వయంగా పరిశీలించాకే క్లోజ్ చేయండి.",
    getStartedBtn: "వాయిస్ ద్వారా సమస్యను నమోదు చేయండి",
    trackGrievanceBtn: "సమస్య స్థితిని తనిఖీ చేయండి",
    viewTransparencyBtn: "గ్రామ పారదర్శకత చూడండి",
    howItWorksTitle: "పల్లె ప్రజా 3 సులువైన దశల్లో ఎలా పనిచేస్తుంది",
    step1Title: "1. మీ స్వరంతో మాట్లాడండి",
    step1Desc: "టైపింగ్ అవసరం లేదు. తెలుగు లేదా ఇంగ్లీషులో మాట్లాడి సమస్య ఫోటో తీయండి.",
    step2Title: "2. తక్షణ అధికారిక కేటాయింపు",
    step2Desc: "ప్రత్యేక గుర్తింపు సంఖ్య (ID) కేటాయించి సంబంధిత ఇంజనీరింగ్ విభాగానికి బదిలీ అవుతుంది.",
    step3Title: "3. సమస్య పరిష్కార ధ్రువీకరణ",
    step3Desc: "అధికారులు పరిష్కార ఫోటో అప్‌లోడ్ చేయాలి. మీరు సంతృప్తి చెందితేనే సమస్య క్లోజ్ అవుతుంది.",

    // Quick Stats Bar
    statTotalResolved: "పరిష్కరించబడిన సమస్యలు",
    statSlaCompliance: "సమయపాలన రేటు",
    statAvgResolution: "సగటు పరిష్కార సమయం",
    statActiveGrievances: "పరిష్కారంలో ఉన్నవి",
    statDays: "రోజులు",

    // Villager Dashboard
    greetingVillager: "నమస్కారం, రామారావు గారు",
    dashSubtitle: "వార్డు 4, రామాపురం గ్రామ పంచాయతీ",
    btnNewGrievance: "+ కొత్త సమస్యను నమోదు చేయండి",
    btnTrackGrievance: "సమస్య ID తో వెతకండి",
    myComplaintsTitle: "నా ఫిర్యాదుల చరిత్ర",
    noComplaintsFound: "ఇంకా ఎటువంటి ఫిర్యాదులు నమోదు చేయలేదు.",
    announcementsTitle: "గ్రామ సచివాలయ ప్రకటనలు",
    announcement1: "బుధవారం నాడు వార్డులలో తాగునీటి పైపులైన్ల క్లోరినేషన్ చేపట్టబడును.",
    announcement2: "మిషన్ భగీరథ బృందం వార్డు 3, 4 లోని తాగునీటి ట్యాంకులను పరిశీలిస్తోంది.",

    // Categories
    catRoads: "రహదారులు & వంతెనలు",
    catWater: "తాగునీటి సరఫరా",
    catElectricity: "విద్యుత్ & లైట్లు",
    catDrainage: "మురుగు కాలువలు",
    catSanitation: "పారిశుధ్యం & చెత్త",
    catOther: "ఇతర గ్రామ సమస్యలు",

    // Category Descriptions
    catRoadsDesc: "గుంతలు పడిన రోడ్లు, విరిగిన కల్వర్టులు, రోడ్డు కోత",
    catWaterDesc: "పగిలిన పైపులు, కలుషిత నీరు, ఎండిన బోర్లు",
    catElectricityDesc: "కాలిపోయిన ట్రాన్స్‌ఫార్మర్, వేలాడుతున్న తీగలు, విద్యుత్ అంతరాయం",
    catDrainageDesc: "పూడిక తీయని మురుగు కాలువలు, రోడ్డుపైకి మురుగు",
    catSanitationDesc: "చెత్త కుప్పలు, మార్కెట్ వ్యర్థాలు, సున్నం చల్లడం",
    catOtherDesc: "వీధి దీపాలు, ప్రభుత్వ భవనాలు, ఆక్రమణలు",

    // Complaint Form
    formTitle: "గ్రామ సమస్యను నమోదు చేయండి",
    formSubtitle: "వాయిస్ ఇన్పుట్, ఫోటో ఆధారాలు మరియు జీపీఎస్ లొకేషన్‌తో సులువైన నమోదు",
    selectCategory: "1. సమస్య వర్గాన్ని ఎంచుకోండి",
    voiceSectionTitle: "2. సమస్యను వివరించండి (మాట్లాడండి లేదా రాయండి)",
    micButtonPrompt: "తెలుగు లేదా ఇంగ్లీషులో మాట్లాడటానికి ఇక్కడ నొక్కండి",
    micListening: "వినబడుతోంది... స్పష్టంగా మాట్లాడండి",
    micUnsupported: "వాయిస్ రికగ్నిషన్ అందుబాటులో లేదు. కింద ఉన్న నమూనా బటన్లను వాడండి.",
    quickVoicePresets: "హ్యాకథాన్ డెమో కోసం నమూనా వాయిస్ వాక్యాలు:",
    presetRoads: "పాఠశాల దగ్గర రోడ్డుపై పెద్ద గుంతలు పడ్డాయి, రోజూ ప్రమాదాలు జరుగుతున్నాయి.",
    presetWater: "మెయిన్ మంచి నీళ్ల పైపు పగిలి మురుగు కలుస్తోంది, మూడు రోజులుగా నీళ్లు లేవు.",
    presetPower: "పొలాల వద్ద ట్రాన్స్‌ఫార్మర్ పేలిపోయింది, తీగలు ప్రమాదకరంగా వేలాడుతున్నాయి.",
    presetDrainage: "శివాలయం రోడ్డులో కాలువ పూడిక నిండి మురుగు నీరు రోడ్డుపై పారుతోంది.",
    presetSanitation: "రైతు బజార్ వద్ద చెత్త కుప్పలు పేరుకుపోయి దుర్గంధం వస్తోంది, తొలగించండి.",
    descPlaceholder: "సమస్య వివరాలు, వీధి పేరు చెప్పండి లేదా రాయండి...",
    photoSectionTitle: "3. సమస్య ఫోటో ఆధారాలు",
    photoUploadHint: "ఫోటోను ఇక్కడ లాగి వదలండి లేదా ఫైల్ ఎంచుకోండి",
    photoQuickPick: "నమూనా ఫోటోను ఎంచుకోండి:",
    photoPothole: "గుంతల రోడ్డు",
    photoLeak: "పైపు లీకేజ్",
    photoSparks: "ట్రాన్స్‌ఫార్మర్",
    photoDrain: "మురుగు కాలువ",
    locationSectionTitle: "4. గ్రామ స్థల వివరాలు",
    lblVillage: "గ్రామ పంచాయతీ",
    lblWard: "వార్డు నంబర్",
    lblLandmark: "ల్యాండ్‌మార్క్ / వీధి పేరు",
    landmarkPlaceholder: "ఉదాహరణ: జడ్పీ హైస్కూల్ ఎదురుగా, శివాలయం వద్ద",
    lblGps: "జీపీఎస్ లొకేషన్",
    btnDetectGps: "జీపీఎస్ గుర్తించు",
    gpsDetected: "జీపీఎస్ నమోదైంది: 16.5062° N, 80.6480° E (ఖచ్చితత్వం 3మీ)",
    lblCitizenName: "ఫిర్యాదుదారుని పేరు",
    lblCitizenPhone: "మొబైల్ నంబర్",
    btnSubmitGrievance: "ఫిర్యాదును సమర్పించండి",
    submitting: "నమోదు అవుతోంది...",

    // Submission Success Modal
    modalSuccessTitle: "మీ సమస్య విజయవంతంగా నమోదైంది!",
    modalSuccessSubtitle: "గ్రామ సచివాలయ అధికారిక రికార్డులో మీ ఫిర్యాదు చేర్చబడింది",
    lblComplaintId: "ఫిర్యాదు ట్రాకింగ్ సంఖ్య (ID)",
    copyId: "కాపీ చేయండి",
    idCopied: "కాపీ అయింది!",
    lblAssignedSla: "చట్టబద్ధ పరిష్కార గడువు",
    slaTargetHours: "72 గంటలలోపు",
    lblSmsAlert: "ఎస్ఎమ్ఎస్ సమాచారం మీ మొబైల్‌కు పంపబడింది.",
    btnTrackNow: "ఇప్పుడే సమస్య స్థితిని చూడండి",
    btnClose: "డాష్‌బోర్డుకు వెళ్లండి",

    // Complaint Tracking Screen
    trackingTitle: "ఫిర్యాదు పరిష్కార స్థితి ట్రాకర్",
    trackingSubtitle: "100% పారదర్శకత మరియు పౌరుల సమగ్ర పరిశీలన",
    searchPlaceholder: "ఫిర్యాదు ID నమోదు చేయండి (ఉదా: PP-2025-RD-1042)...",
    btnSearch: "వెతుకు",
    detailsTitle: "సమస్య సమగ్ర వివరాలు",
    lblCategory: "సమస్య వర్గం",
    lblStatus: "ప్రస్తుత స్థితి",
    lblDateReported: "నమోదైన తేదీ",
    lblLocation: "గ్రామ ప్రదేశం",
    lblDept: "కేటాయించిన విభాగం",
    lblOfficer: "బాధ్యత గల అధికారి",
    lblOfficerContact: "అధికారి సంప్రదింపు నంబర్",
    lblSlaStatus: "పరిష్కార గడువు (SLA)",
    slaNormal: "సమయపాలనలో ఉంది (72 గంటలలోపు)",
    slaOverdue: "గడువు దాటింది: తక్షణ శ్రద్ధ అవసరం (>72 గంటలు)",
    slaEscalated: "జిల్లా కలెక్టర్ వారి ప్రత్యేక ఆదేశాలు జారీ అయ్యాయి",
    timelineTitle: "అధికారిక చర్యల కాలక్రమం (టైమ్‌లైన్)",
    photoEvidenceTitle: "ఫోటో ఆధారాల పరిశీలన",
    photoBeforeTitle: "ముందు (గ్రామస్థుడు నమోదు చేసిన ఫోటో)",
    photoAfterTitle: "తర్వాత (అధికారులు సమస్యను పరిష్కరించిన ఫోటో)",
    noAfterPhoto: "సమస్య పరిష్కారం పూర్తి కాగానే అధికారులు ఫోటోను ఇక్కడ జతచేస్తారు.",
    officialRemarksTitle: "అధికారుల వివరణ & ఫీల్డ్ సమాచారం",

    // Citizen Resolution Verification
    verificationTitle: "గ్రామస్థుల పరిష్కార ధ్రువీకరణ",
    verificationSubtitle: "సమస్య నిజంగా పరిష్కారమైందా? మీ ఆమోదం లేనిదే సమస్య అధికారికంగా క్లోజ్ కాదు.",
    btnApproveResolution: "పరిష్కారాన్ని ధ్రువీకరించి ఆమోదించండి",
    btnReopenGrievance: "సమస్య తీరలేదు - మళ్లీ ఓపెన్ చేయండి",
    reopenModalTitle: "సమస్యను పునఃపరిశీలనకు పంపండి",
    reopenReasonPrompt: "సమస్య ఎందుకు సంతృప్తికరంగా పరిష్కారం కాలేదో తెలపండి:",
    btnConfirmReopen: "రీ-ఓపెన్ దరఖాస్తును సమర్పించండి",
    feedbackModalTitle: "పరిష్కార నాణ్యతకు రేటింగ్ ఇవ్వండి",
    lblRating: "మీ సంతృప్తి రేటింగ్:",
    feedbackPlaceholder: "సచివాలయ సిబ్బంది పనితీరుపై మీ అభిప్రాయాన్ని తెలపండి...",
    btnSubmitFeedback: "రేటింగ్‌ను నమోదు చేయండి",

    // Official Dashboard
    officialTitle: "గ్రామ సచివాలయ సమస్యల నిర్వహణ వేదిక",
    officialSubtitle: "గ్రామ పంచాయతీ ఫిర్యాదుల పరిష్కార & ఫీల్డ్ ఇంజనీర్ల పర్యవేక్షణ వ్యవస్థ",
    statTotalReceived: "మొత్తం ఫిర్యాదులు",
    statPending: "కేటాయించాల్సినవి",
    statInProgress: "పని జరుగుతున్నవి",
    statResolved: "పరిష్కారమైనవి",
    statOverdueAlerts: "గడువు దాటినవి",
    filterCategory: "సమస్య వర్గం ఫిల్టర్",
    filterStatus: "స్థితి ఫిల్టర్",
    searchComplaints: "ID, పేరు, వీధి ద్వారా వెతకండి...",
    thId: "ఫిర్యాదు ID",
    thCitizen: "గ్రామస్థుడు & వార్డు",
    thCategory: "వర్గం",
    thDate: "నమోదైన తేదీ",
    thStatus: "ప్రస్తుత స్థితి",
    thSla: "SLA గడియారం",
    thActions: "చర్యలు",
    btnReviewAction: "చర్య తీసుకోండి",

    // Official Action Drawer / Modal
    drawerTitle: "అధికారిక చర్యల కన్సోల్",
    drawerCitizenDetails: "ఫిర్యాదుదారుని సమాచారం",
    lblOriginalVoice: "అసలు వాయిస్ నోట్:",
    sectionAssign: "1. విభాగానికి కేటాయింపు",
    lblSelectDept: "బాధ్యత వహించే ఇంజనీరింగ్ శాఖ:",
    lblOfficerName: "క్షేత్రస్థాయి ఇంజనీర్ పేరు:",
    lblOfficerPhone: "ఇంజనీర్ ఫోన్ నంబర్:",
    sectionStatus: "2. పరిష్కార స్థితిని మార్చండి",
    lblSelectStatus: "ప్రస్తుత స్థితి:",
    sectionRemarks: "3. అధికారిక ఫీల్డ్ తనిఖీ నోట్స్",
    remarksPlaceholder: "క్షేత్ర పరిశీలన వివరాలు, వాడిన సామగ్రి, చేపట్టిన మరమ్మతు పనులను రాయండి...",
    sectionResolutionPhoto: "4. సమస్య పరిష్కార ఫోటో అప్‌లోడ్",
    resPhotoUploadHint: "పని పూర్తయిన తర్వాత క్షేత్రస్థాయి ఫోటోను అప్‌లోడ్ చేయండి",
    quickResPhotos: "నమూనా పరిష్కార ఫోటోలు:",
    resRepavedRoad: "బాగుచేసిన రోడ్డు",
    resFixedPipe: "రిపేర్ చేసిన పైపు",
    resFixedPower: "కొత్త ట్రాన్స్‌ఫార్మర్",
    resCleanedDrain: "పూడిక తీసిన కాలువ",
    resCleanedGround: "శుభ్రం చేసిన మైదానం",
    btnSaveChanges: "నమోదు చేసి పౌరునికి సమాచారం పంపండి",

    // Higher Authority Dashboard
    authorityTitle: "జిల్లా కలెక్టరేట్ & జిల్లా పరిషత్ పర్యవేక్షణ",
    authoritySubtitle: "గ్రామీణ సమస్యల పరిష్కార సమయపాలన & జవాబుదారీతన వేదిక",
    kpiIndex: "గ్రామ సమస్యల పరిష్కార సూచిక",
    kpiIndexDesc: "ప్రజల సంతృప్తి మరియు వేగం ఆధారంగా",
    kpiCompliance: "SLA సమయపాలన రేటు",
    kpiComplianceDesc: "72 గంటల్లోపు పరిష్కారమైనవి",
    kpiAvgDays: "సగటు పరిష్కార కాలం",
    kpiAvgDaysDesc: "నమోదు నుండి పరిష్కారం వరకు",
    kpiOverdueBreach: "గడువు మీరిన క్లిష్టమైన సమస్యలు",
    kpiOverdueBreachDesc: "కలెక్టర్ జోక్యం అవసరమైనవి",
    deptPerformanceTitle: "శాఖల పనితీరు & SLA ఉల్లంఘనల నివేదిక",
    deptName: "ఇంజనీరింగ్ శాఖ",
    deptResolvedPct: "పరిష్కార శాతం",
    deptAvgHours: "సగటు స్పందన",
    deptBreaches: "గడువు మీరినవి",
    overdueConsoleTitle: "గడువు మీరిన సమస్యల కలెక్టర్ ఎస్కలేషన్ డెస్క్",
    overdueConsoleDesc: "చట్టబద్ధమైన గడువు దాటిన సమస్యలు. ఒక్క క్లిక్‌తో కలెక్టరేట్ అత్యవసర ఆదేశాలను జారీ చేయవచ్చు.",
    btnEscalateNow: "కలెక్టర్ జోక్యం / ఎస్కలేట్ చేయండి",
    escalateModalTitle: "జిల్లా కలెక్టరేట్ అత్యవసర ఆదేశాల జారీ",
    escalateConfirmMsg: "పంచాయతీ రాజ్ చట్టం సెక్షన్ 42 కింద మీరు అత్యవసర ఎగ్జిక్యూటివ్ ఆదేశాన్ని జారీ చేస్తున్నారు. ఇది శాఖాధిపతికి తీవ్ర హెచ్చరికగా పంపబడుతుంది.",
    escalateReasonLabel: "కలెక్టరేట్ ఆదేశాలు / ఎగ్జిక్యూటివ్ ఉత్తర్వులు:",
    escalatePreset: "జిల్లా కలెక్టర్ వారి అత్యవసర ఆదేశాలు: 24 గంటలలోపు ప్రత్యేక బృందాన్ని పంపి సమస్యను పరిష్కరించి సాయంత్రం 5 గంటలలోపు నివేదిక సమర్పించాలి.",
    btnConfirmEscalate: "కలెక్టర్ ఉత్తర్వులను జారీ చేయండి",

    // Village Transparency Page
    transparencyTitle: "పల్లె ప్రజా బహిరంగ పారదర్శక పోర్టల్",
    transparencySubtitle: "రామాపురం గ్రామ పంచాయతీ పౌర సమాచారం. 100% జవాబుదారీతనం, గోప్యత రక్షణ.",
    metricTotalGrievances: "మొత్తం నమోదైన సమస్యలు",
    metricResolvedCount: "విజయవంతంగా పరిష్కారమైనవి",
    metricPendingCount: "పరిష్కారంలో ఉన్నవి",
    metricOverdueCount: "గడువు దాటిన సమస్యలు",
    catBreakdownTitle: "సమస్యల విభాగాల వారీగా వర్గీకరణ",
    wardBreakdownTitle: "వార్డుల వారీగా పనితీరు & పరిష్కార వేగం",
    recentPublicLogTitle: "ఇటీవలి పరిష్కారాల ప్రజా ఆడిట్ (లైవ్ ఫీడ్)",

    // Status Badges
    statusSubmitted: "నమోదైంది",
    statusAssigned: "కేటాయించబడింది",
    statusInProgress: "పని జరుగుతోంది",
    statusResolved: "పరిష్కారమైంది",
    statusReopened: "మళ్లీ ఓపెన్ అయింది",
    statusEscalated: "కలెక్టర్‌కు ఎస్కలేట్ అయింది",
    statusOverdue: "గడువు దాటింది",

    // Departments
    deptPred: "పంచాయతీ రాజ్ ఇంజనీరింగ్ శాఖ (PRED)",
    deptRwss: "గ్రామీణ తాగునీరు & పారిశుధ్యం (RWSS)",
    deptDiscom: "విద్యుత్ పంపిణీ సంస్థ (DISCOM)",
    deptSanitation: "గ్రామ పారిశుధ్యం & ప్రజారోగ్య విభాగం",
    deptRevenue: "రెవెన్యూ & భూ రికార్డుల శాఖ",

    // Common
    viewDetails: "వివరాలు చూడండి",
    cancel: "రద్దు",
    confirm: "నిర్ధారించు",
    save: "సేవ్ చేయండి",
    loading: "లోడ్ అవుతోంది...",
    success: "విజయం",
    alert: "హెచ్చరిక"
  }
};

let currentLang = localStorage.getItem('pallepraja_lang') || 'en';

function getLanguage() {
  return currentLang;
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('pallepraja_lang', lang);
    document.documentElement.lang = lang;
    if (lang === 'te') {
      document.body.classList.add('telugu-font');
    } else {
      document.body.classList.remove('telugu-font');
    }
    applyTranslations();
    // Dispatch event so all components re-render text
    window.dispatchEvent(new CustomEvent('pallepraja:language-changed', { detail: { lang } }));
  }
}

function t(key) {
  if (translations[currentLang] && translations[currentLang][key]) {
    return translations[currentLang][key];
  }
  if (translations.en && translations.en[key]) {
    return translations.en[key];
  }
  return key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.getAttribute('placeholder')) {
        el.setAttribute('placeholder', translated);
      }
    } else {
      el.textContent = translated;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });

  // Update language toggle UI buttons
  const langEnBtn = document.getElementById('lang-en-btn');
  const langTeBtn = document.getElementById('lang-te-btn');
  if (langEnBtn && langTeBtn) {
    if (currentLang === 'en') {
      langEnBtn.classList.add('active');
      langTeBtn.classList.remove('active');
    } else {
      langTeBtn.classList.add('active');
      langEnBtn.classList.remove('active');
    }
  }
}

// Expose globally
window.i18n = {
  t,
  setLanguage,
  getLanguage,
  applyTranslations
};
