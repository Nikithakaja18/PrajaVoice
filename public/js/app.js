/**
 * Palle Praja - Main Application Controller
 * Handles routing, role switching, forms, voice recognition, official actions,
 * citizen verification, authority escalations, and real-time reactive state updates.
 */

class AppController {
  constructor() {
    this.currentRole = 'citizen';
    this.currentVillagerSubView = 'welcome';
    this.selectedCategory = 'roads';
    this.uploadedPhotoData = null;
    this.currentActiveComplaintId = 'PP-2025-RD-1042';
    this.activeActionComplaintId = null;
    this.selectedRating = 5;

    // Realistic sample defect photos
    this.samplePhotos = {
      pothole: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      pipe: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
      sparks: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80',
      drain: 'https://images.unsplash.com/photo-1596785236245-5b53d4289069?auto=format&fit=crop&w=800&q=80'
    };

    // Realistic sample resolution photos (After official fix)
    this.sampleResolutionPhotos = {
      road: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      pipe: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
      power: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
      drain: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
      clean: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'
    };

    this.init();
  }

  async init() {
    // Setup i18n
    i18n.applyTranslations();

    // Listen to data store events
    window.addEventListener('pallepraja:data-updated', () => this.refreshAllViews());
    window.addEventListener('pallepraja:language-changed', () => {
      this.refreshAllViews();
      this.syncVoiceLanguage();
    });

    // Default sample photo for new grievance
    this.uploadedPhotoData = this.samplePhotos.pothole;
    this.updatePhotoPreview(this.uploadedPhotoData);

    // Initial render of all dashboards
    await this.refreshAllViews();

    // Pre-track the first complaint so tracking tab is immediately populated
    await this.renderTrackingDossier(this.currentActiveComplaintId);

    // Set voice language according to current i18n
    this.syncVoiceLanguage();
  }

  syncVoiceLanguage() {
    const lang = i18n.getLanguage();
    if (window.voiceManager) {
      window.voiceManager.setLanguage(lang);
    }
  }

  /* ==========================================================================
     ROLE & NAVIGATION SWITCHING
     ========================================================================== */
  switchRole(role) {
    this.currentRole = role;

    // Update top bar buttons
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-role-${role}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update visible module
    document.querySelectorAll('.module-view').forEach(mod => mod.classList.remove('active'));
    const targetModule = document.getElementById(`module-${role}`);
    if (targetModule) targetModule.classList.add('active');

    // Update persona tag in header
    const personaTag = document.getElementById('header-persona-tag');
    if (personaTag) {
      if (role === 'citizen') personaTag.textContent = i18n.t('personaCitizen');
      else if (role === 'official') personaTag.textContent = i18n.t('personaOfficial');
      else if (role === 'authority') personaTag.textContent = i18n.t('personaAuthority');
      else if (role === 'transparency') personaTag.textContent = i18n.t('roleTransparency');
    }

    this.refreshAllViews();
    this.showToast(`Switched view to ${i18n.t(role === 'citizen' ? 'roleCitizen' : role === 'official' ? 'roleOfficial' : role === 'authority' ? 'roleAuthority' : 'roleTransparency')}`, 'info');
  }

  switchVillagerSubView(subView) {
    this.currentVillagerSubView = subView;

    // Update sub tabs
    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${subView}`);
    if (activeTab) activeTab.classList.add('active');

    // Update sub view
    document.querySelectorAll('.villager-subview').forEach(sv => sv.classList.remove('active'));
    const targetView = document.getElementById(`subview-${subView}`);
    if (targetView) targetView.classList.add('active');

    if (subView === 'dash') {
      this.renderCitizenDashboard();
    } else if (subView === 'track') {
      this.renderTrackingDossier(this.currentActiveComplaintId);
    }
  }

  /* ==========================================================================
     VOICE INPUT & PHOTO WORKFLOWS
     ========================================================================== */
  toggleVoiceInput() {
    const micBtn = document.getElementById('voice-record-btn');
    const statusText = document.getElementById('mic-status-text');
    const waveBars = document.getElementById('audio-wave-bars');

    window.voiceManager.toggleListening(
      (transcript, isFinal) => {
        const descInput = document.getElementById('complaint-desc-input');
        if (descInput) {
          descInput.value = transcript;
        }
      },
      (status, errorMsg) => {
        if (status === 'listening') {
          micBtn.classList.add('recording');
          waveBars.classList.add('recording');
          statusText.textContent = i18n.t('micListening');
        } else if (status === 'idle') {
          micBtn.classList.remove('recording');
          waveBars.classList.remove('recording');
          statusText.textContent = i18n.t('micButtonPrompt');
        } else if (status === 'unsupported' || status === 'error') {
          micBtn.classList.remove('recording');
          waveBars.classList.remove('recording');
          statusText.textContent = i18n.t('micUnsupported');
          this.showToast(i18n.t('micUnsupported'), 'warning');
        }
      }
    );
  }

  useVoicePreset(presetKey) {
    const isTe = i18n.getLanguage() === 'te';
    const presetsTe = {
      roads: 'పాఠశాల దగ్గర రోడ్డుపై పెద్ద గుంతలు పడ్డాయి, వర్షపు నీరు చేరి ప్రమాదాలు జరుగుతున్నాయి.',
      water: 'వార్డు 3 గాంధీ సెంటర్ వద్ద మంచి నీళ్ల మెయిన్ పైపు పగిలింది, మూడు రోజులుగా నీళ్లు లేవు.',
      electricity: 'రైతుల పొలాల వద్ద ట్రాన్స్‌ఫార్మర్ పేలిపోయింది, తీగలు ప్రమాదకరంగా వేలాడుతున్నాయి.',
      drainage: 'శివాలయం వీధిలో మురుగు కాలువ పూడిక నిండి మురుగు నీరు రోడ్డుపై పారుతోంది.',
      sanitation: 'రైతు బజార్ మైదానంలో చెత్త కుప్పలు పేరుకుపోయి దుర్గంధం వస్తోంది, తొలగించండి.'
    };
    const presetsEn = {
      roads: 'Severe potholes and waterlogging near ZP High School. Daily commuters and students facing hazards.',
      water: 'Main drinking water pipeline burst in Ward 3. Water mixing with drain, no supply for 3 days.',
      electricity: 'Burnt 25kVA transformer near north fields with sparks. Live wire hanging low.',
      drainage: 'Clogged main open drain overflowing onto temple street with foul stench.',
      sanitation: 'Solid waste and rotten market vegetable matter accumulated at Rythu Bazaar ground.'
    };

    const text = isTe ? presetsTe[presetKey] : presetsEn[presetKey];
    const descInput = document.getElementById('complaint-desc-input');
    if (descInput) {
      descInput.value = text;
      // Visual pulse on textarea
      descInput.style.borderColor = 'var(--primary-500)';
      setTimeout(() => { descInput.style.borderColor = ''; }, 1000);
    }

    // Auto-select category matching preset
    this.selectCategory(presetKey);

    // Auto-pick appropriate photo
    if (presetKey === 'roads') this.pickSamplePhoto('pothole');
    else if (presetKey === 'water') this.pickSamplePhoto('pipe');
    else if (presetKey === 'electricity') this.pickSamplePhoto('sparks');
    else if (presetKey === 'drainage') this.pickSamplePhoto('drain');

    this.showToast('Voice transcript loaded into grievance form!', 'success');
  }

  selectCategory(catKey) {
    this.selectedCategory = catKey;
    document.querySelectorAll('.cat-select-card').forEach(card => card.classList.remove('active'));
    const targetCard = document.querySelector(`.cat-select-card[data-category="${catKey}"]`);
    if (targetCard) targetCard.classList.add('active');
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedPhotoData = e.target.result;
        this.updatePhotoPreview(this.uploadedPhotoData);
      };
      reader.readAsDataURL(file);
    }
  }

  pickSamplePhoto(type) {
    if (this.samplePhotos[type]) {
      this.uploadedPhotoData = this.samplePhotos[type];
      this.updatePhotoPreview(this.uploadedPhotoData);
      this.showToast('Sample photo evidence attached', 'success');
    }
  }

  updatePhotoPreview(src) {
    const previewBox = document.getElementById('photo-preview-box');
    const previewImg = document.getElementById('photo-preview-img');
    if (previewBox && previewImg) {
      previewImg.src = src;
      previewBox.style.display = 'block';
    }
  }

  removePhoto(event) {
    if (event) event.stopPropagation();
    this.uploadedPhotoData = null;
    const previewBox = document.getElementById('photo-preview-box');
    if (previewBox) previewBox.style.display = 'none';
    const fileInput = document.getElementById('photo-file-input');
    if (fileInput) fileInput.value = '';
  }

  detectGpsLocation() {
    const gpsInput = document.getElementById('form-gps-input');
    if (gpsInput) {
      gpsInput.value = '16.5062° N, 80.6480° E';
      this.showToast(i18n.t('gpsDetected'), 'success');
    }
  }

  /* ==========================================================================
     GRIEVANCE REGISTRATION & SUBMISSION
     ========================================================================== */
  async handleGrievanceSubmit(event) {
    event.preventDefault();

    const descInput = document.getElementById('complaint-desc-input');
    const villageSelect = document.getElementById('form-village-select');
    const wardSelect = document.getElementById('form-ward-select');
    const landmarkInput = document.getElementById('form-landmark-input');
    const gpsInput = document.getElementById('form-gps-input');
    const nameInput = document.getElementById('form-citizen-name');
    const phoneInput = document.getElementById('form-citizen-phone');
    const submitBtn = document.getElementById('btn-submit-form');

    const desc = descInput ? descInput.value.trim() : '';
    if (!desc) {
      this.showToast('Please provide a voice or written description of the problem.', 'error');
      return;
    }

    const catKey = this.selectedCategory || 'roads';
    const catTitles = {
      roads: { en: 'Roads & Culverts', te: 'రహదారులు' },
      water: { en: 'Drinking Water Supply', te: 'తాగునీరు' },
      electricity: { en: 'Electricity & Power', te: 'విద్యుత్' },
      drainage: { en: 'Drainage & Sewage', te: 'మురుగు కాలువలు' },
      sanitation: { en: 'Sanitation & Waste', te: 'పారిశుధ్యం' },
      other: { en: 'Other Village Issues', te: 'ఇతర సమస్యలు' }
    };

    const categoryInfo = catTitles[catKey] || catTitles.roads;
    const landmark = landmarkInput ? landmarkInput.value.trim() : 'Village Center';
    const village = villageSelect ? villageSelect.value : 'Ramapuram (రామాపురం)';
    const ward = wardSelect ? wardSelect.value : 'Ward 4 (వార్డు 4)';

    const newComplaintPayload = {
      category: categoryInfo.en,
      categoryKey: catKey,
      categoryTe: categoryInfo.te,
      title: `${categoryInfo.en} issue reported at ${landmark}`,
      titleTe: `${categoryInfo.te} సమస్య - ${landmark}`,
      description: desc,
      descriptionTe: desc,
      voiceTranscript: desc,
      citizenName: nameInput ? nameInput.value.trim() : 'Rama Rao (రామారావు)',
      citizenPhone: phoneInput ? phoneInput.value.trim() : '+91 98480 23114',
      village: village,
      ward: ward,
      landmark: landmark,
      gpsCoordinates: gpsInput ? gpsInput.value : '16.5062° N, 80.6480° E',
      citizenPhoto: this.uploadedPhotoData || this.samplePhotos.pothole
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i18n.t('submitting')}`;
    }

    try {
      const created = await window.dataStore.createComplaint(newComplaintPayload);
      this.currentActiveComplaintId = created.id;

      // Show success celebration modal
      const modalIdElem = document.getElementById('success-modal-id');
      if (modalIdElem) modalIdElem.textContent = created.id;
      this.openModal('modal-success');

      // Spoken voice confirmation
      if (window.voiceManager) {
        window.voiceManager.speakConfirmation('మీ ఫిర్యాదు విజయవంతంగా నమోదైంది. ఫిర్యాదు సంఖ్య: ' + created.id, i18n.getLanguage());
      }

      this.showToast(`Complaint registered successfully: ${created.id}`, 'success');
      this.renderCitizenDashboard();
      this.renderOfficialTable();
    } catch (e) {
      console.error('Error submitting grievance:', e);
      this.showToast('Failed to register complaint. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>${i18n.t('btnSubmitGrievance')}</span>`;
      }
    }
  }

  copySuccessId() {
    const modalIdElem = document.getElementById('success-modal-id');
    if (modalIdElem) {
      navigator.clipboard.writeText(modalIdElem.textContent.trim());
      const copyBtnText = document.getElementById('copy-btn-text');
      if (copyBtnText) copyBtnText.textContent = i18n.t('idCopied');
      this.showToast('Complaint ID copied to clipboard!', 'success');
    }
  }

  trackJustSubmitted() {
    this.closeModal('modal-success');
    this.switchVillagerSubView('track');
    this.trackDirectId(this.currentActiveComplaintId);
  }

  /* ==========================================================================
     CITIZEN DASHBOARD & TRACKING
     ========================================================================== */
  async renderCitizenDashboard() {
    const listContainer = document.getElementById('citizen-complaints-list');
    const countBadge = document.getElementById('citizen-complaint-count');
    if (!listContainer) return;

    const complaints = await window.dataStore.getAllComplaints();
    if (countBadge) countBadge.textContent = `${complaints.length} Registered`;

    if (complaints.length === 0) {
      listContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">${i18n.t('noComplaintsFound')}</div>`;
      return;
    }

    const isTe = i18n.getLanguage() === 'te';

    listContainer.innerHTML = complaints.map(c => {
      const title = isTe && c.titleTe ? c.titleTe : c.title;
      const desc = isTe && c.descriptionTe ? c.descriptionTe : c.description;
      const statusPillClass = this.getStatusClass(c.status);
      const statusLabel = this.getStatusLabel(c.status);

      return `
        <div class="complaint-card" onclick="app.trackDirectId('${c.id}')">
          <div class="card-top-row">
            <span class="id-badge">${c.id}</span>
            <span class="status-pill ${statusPillClass}">${statusLabel}</span>
          </div>
          <div class="card-title">${this.escapeHtml(title)}</div>
          <div class="card-desc">${this.escapeHtml(desc)}</div>
          <div class="card-meta-row">
            <div class="meta-item"><i class="fa-solid fa-location-dot"></i> ${this.escapeHtml(c.ward || c.village)}</div>
            <div class="meta-item"><i class="fa-regular fa-clock"></i> ${this.formatTimeAgo(c.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async searchAndTrack() {
    const input = document.getElementById('track-id-input');
    if (!input || !input.value.trim()) {
      this.showToast('Please enter a Complaint ID to track', 'warning');
      return;
    }
    await this.renderTrackingDossier(input.value.trim());
  }

  async trackDirectId(id) {
    this.currentActiveComplaintId = id;
    const input = document.getElementById('track-id-input');
    if (input) input.value = id;
    this.switchVillagerSubView('track');
    await this.renderTrackingDossier(id);
  }

  async renderTrackingDossier(id) {
    const container = document.getElementById('tracking-dossier-container');
    if (!container) return;

    const complaint = await window.dataStore.getComplaintById(id);
    if (!complaint) {
      container.innerHTML = `
        <div class="dossier-card" style="text-align: center; padding: 48px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--accent-gold); margin-bottom: 12px;"></i>
          <h3>Complaint ID "${this.escapeHtml(id)}" Not Found</h3>
          <p style="color: var(--gray-500); margin-top: 6px;">Please verify the ID or choose one of the quick test complaints above.</p>
        </div>
      `;
      return;
    }

    this.currentActiveComplaintId = complaint.id;
    const isTe = i18n.getLanguage() === 'te';
    const title = isTe && complaint.titleTe ? complaint.titleTe : complaint.title;
    const desc = isTe && complaint.descriptionTe ? complaint.descriptionTe : complaint.description;
    const statusClass = this.getStatusClass(complaint.status);
    const statusLabel = this.getStatusLabel(complaint.status);

    // Stepper progress calculation
    const statusOrder = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
    let currentStepIndex = statusOrder.indexOf(complaint.status);
    if (currentStepIndex === -1) {
      if (complaint.status === 'Escalated' || complaint.status === 'Reopened') currentStepIndex = 2;
    }
    const progressWidth = currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '33%' : currentStepIndex === 2 ? '66%' : '100%';

    // SLA display
    let slaBadge = `<span class="status-pill status-assigned"><i class="fa-solid fa-clock"></i> ${i18n.t('slaNormal')}</span>`;
    if (complaint.isOverdue && complaint.status !== 'Resolved') {
      slaBadge = `<span class="status-pill status-overdue"><i class="fa-solid fa-triangle-exclamation"></i> ${i18n.t('slaOverdue')}</span>`;
    }
    if (complaint.status === 'Escalated') {
      slaBadge = `<span class="status-pill status-escalated"><i class="fa-solid fa-gavel"></i> ${i18n.t('slaEscalated')}</span>`;
    }

    // Citizen Verification Section (if Resolved)
    let verificationHtml = '';
    if (complaint.status === 'Resolved') {
      if (complaint.citizenFeedback) {
        verificationHtml = `
          <div class="citizen-verification-panel" style="background: var(--primary-50); border-color: var(--primary-400);">
            <div class="verify-info">
              <h4 style="color: var(--primary-900);"><i class="fa-solid fa-award"></i> Citizen Audit Verified (${complaint.citizenFeedback.rating}/5 Stars)</h4>
              <p style="color: var(--primary-800);">"${this.escapeHtml(complaint.citizenFeedback.comment || 'Satisfied with resolution')}"</p>
            </div>
            <div class="verify-actions">
              <button class="btn-verify-reopen" onclick="app.openReopenModal('${complaint.id}')">
                <i class="fa-solid fa-rotate-left"></i> ${i18n.t('btnReopenGrievance')}
              </button>
            </div>
          </div>
        `;
      } else {
        verificationHtml = `
          <div class="citizen-verification-panel">
            <div class="verify-info">
              <h4 data-i18n="verificationTitle">${i18n.t('verificationTitle')}</h4>
              <p data-i18n="verificationSubtitle">${i18n.t('verificationSubtitle')}</p>
            </div>
            <div class="verify-actions">
              <button class="btn-verify-approve" onclick="app.openFeedbackModal('${complaint.id}')">
                <i class="fa-solid fa-check-double"></i>
                <span data-i18n="btnApproveResolution">${i18n.t('btnApproveResolution')}</span>
              </button>
              <button class="btn-verify-reopen" onclick="app.openReopenModal('${complaint.id}')">
                <i class="fa-solid fa-rotate-left"></i>
                <span data-i18n="btnReopenGrievance">${i18n.t('btnReopenGrievance')}</span>
              </button>
            </div>
          </div>
        `;
      }
    } else if (complaint.status === 'Reopened') {
      verificationHtml = `
        <div class="citizen-verification-panel" style="background: #fff1f2; border-color: #f43f5e;">
          <div class="verify-info">
            <h4 style="color: #be123c;"><i class="fa-solid fa-rotate-left"></i> Grievance Reopened by Citizen</h4>
            <p style="color: #9f1239;">Reason: "${this.escapeHtml(complaint.citizenFeedback ? complaint.citizenFeedback.comment : 'Citizen reported issue was not solved properly')}"</p>
          </div>
          <span class="status-pill status-reopened">High Priority Review</span>
        </div>
      `;
    }

    // Timeline HTML
    const timelineItemsHtml = complaint.timeline.map((step, idx) => {
      const isEsc = step.status === 'Escalated' || step.status === 'SLA Overdue';
      return `
        <div class="timeline-item ${isEsc ? 'escalated-item' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content-card">
            <div class="timeline-meta">
              <span class="timeline-actor">${this.escapeHtml(step.actor)}</span>
              <span>${this.formatDate(step.timestamp)}</span>
            </div>
            <div class="timeline-note">${this.escapeHtml(step.note)}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="dossier-card">
        <!-- Header -->
        <div class="dossier-header">
          <div class="dossier-title-col">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="id-badge">${complaint.id}</span>
              <span class="status-pill ${statusClass}">${statusLabel}</span>
              ${slaBadge}
            </div>
            <h2>${this.escapeHtml(title)}</h2>
            <p style="font-size: 0.9rem; color: var(--gray-600); margin-top: 6px;">${this.escapeHtml(desc)}</p>
          </div>
        </div>

        <!-- 4-Step Interactive Visual Stepper -->
        <div class="stepper-timeline">
          <div class="stepper-timeline-progress" style="width: ${progressWidth};"></div>
          
          <div class="step-node ${currentStepIndex >= 0 ? 'completed' : ''} ${currentStepIndex === 0 ? 'current' : ''}">
            <div class="step-node-bubble"><i class="fa-solid fa-file-pen"></i></div>
            <div class="step-node-title">${i18n.t('statusSubmitted')}</div>
          </div>

          <div class="step-node ${currentStepIndex >= 1 ? 'completed' : ''} ${currentStepIndex === 1 ? 'current' : ''}">
            <div class="step-node-bubble"><i class="fa-solid fa-user-gear"></i></div>
            <div class="step-node-title">${i18n.t('statusAssigned')}</div>
          </div>

          <div class="step-node ${currentStepIndex >= 2 ? 'completed' : ''} ${currentStepIndex === 2 ? 'current' : ''} ${complaint.status === 'Escalated' ? 'escalated-node' : ''}">
            <div class="step-node-bubble"><i class="fa-solid fa-person-digging"></i></div>
            <div class="step-node-title">${complaint.status === 'Escalated' ? i18n.t('statusEscalated') : i18n.t('statusInProgress')}</div>
          </div>

          <div class="step-node ${currentStepIndex >= 3 ? 'completed' : ''} ${currentStepIndex === 3 ? 'current' : ''}">
            <div class="step-node-bubble"><i class="fa-solid fa-circle-check"></i></div>
            <div class="step-node-title">${i18n.t('statusResolved')}</div>
          </div>
        </div>

        <!-- Dossier Metadata Grid -->
        <div class="dossier-grid">
          <div class="dossier-field">
            <span class="label" data-i18n="lblCategory">${i18n.t('lblCategory')}</span>
            <span class="value">${this.escapeHtml(complaint.category)}</span>
          </div>
          <div class="dossier-field">
            <span class="label" data-i18n="lblLocation">${i18n.t('lblLocation')}</span>
            <span class="value">${this.escapeHtml(complaint.landmark)}, ${this.escapeHtml(complaint.ward)}</span>
          </div>
          <div class="dossier-field">
            <span class="label" data-i18n="lblDateReported">${i18n.t('lblDateReported')}</span>
            <span class="value">${this.formatDate(complaint.createdAt)}</span>
          </div>
          <div class="dossier-field">
            <span class="label" data-i18n="lblDept">${i18n.t('lblDept')}</span>
            <span class="value">${this.escapeHtml(complaint.assignedDepartment || 'Pending Assignment')}</span>
          </div>
          <div class="dossier-field">
            <span class="label" data-i18n="lblOfficer">${i18n.t('lblOfficer')}</span>
            <span class="value">${this.escapeHtml(complaint.assignedOfficer || 'Unassigned')}</span>
          </div>
          <div class="dossier-field">
            <span class="label" data-i18n="lblOfficerContact">${i18n.t('lblOfficerContact')}</span>
            <span class="value">${this.escapeHtml(complaint.officerContact || '+91 89781 44520')}</span>
          </div>
        </div>

        <!-- Before & After Photographic Evidence Audit Viewer -->
        <div class="evidence-audit-box">
          <div class="evidence-audit-header">
            <i class="fa-solid fa-camera-retro" style="color: var(--primary-600);"></i>
            <span data-i18n="photoEvidenceTitle">${i18n.t('photoEvidenceTitle')}</span>
          </div>
          <div class="evidence-photos-pair">
            <div class="evidence-card">
              <div class="evidence-card-label before">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span data-i18n="photoBeforeTitle">${i18n.t('photoBeforeTitle')}</span>
              </div>
              <img class="evidence-img" src="${complaint.citizenPhoto || this.samplePhotos.pothole}" alt="Before Complaint Evidence">
            </div>

            <div class="evidence-card">
              <div class="evidence-card-label after">
                <i class="fa-solid fa-circle-check"></i>
                <span data-i18n="photoAfterTitle">${i18n.t('photoAfterTitle')}</span>
              </div>
              ${complaint.resolutionPhoto ? `
                <img class="evidence-img" src="${complaint.resolutionPhoto}" alt="After Official Resolution Evidence">
              ` : `
                <div class="no-evidence-placeholder">
                  <i class="fa-regular fa-image" style="font-size: 2.2rem;"></i>
                  <span data-i18n="noAfterPhoto">${i18n.t('noAfterPhoto')}</span>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Citizen Resolution Verification Panel -->
        ${verificationHtml}

        <!-- Official Remarks Section if present -->
        ${complaint.officialRemarks ? `
          <div style="background: var(--gray-50); border-left: 4px solid var(--primary-600); padding: 14px 18px; border-radius: var(--radius-sm); margin: 24px 0;">
            <strong style="color: var(--primary-900); font-size: 0.88rem;"><i class="fa-solid fa-comment-dots"></i> Official Remarks:</strong>
            <p style="font-size: 0.88rem; color: var(--gray-700); margin-top: 4px;">${this.escapeHtml(complaint.officialRemarks)}</p>
          </div>
        ` : ''}

        <!-- Official Action Timeline -->
        <div style="margin-top: 32px;">
          <h4 style="font-size: 1.05rem; color: var(--primary-900); margin-bottom: 18px;" data-i18n="timelineTitle">
            ${i18n.t('timelineTitle')}
          </h4>
          <div class="detailed-timeline">
            ${timelineItemsHtml}
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     CITIZEN FEEDBACK & REOPEN MODALS
     ========================================================================== */
  openFeedbackModal(id) {
    this.currentActiveComplaintId = id;
    this.selectedRating = 5;
    this.updateStarsUI(5);
    const feedbackInput = document.getElementById('citizen-feedback-text');
    if (feedbackInput) {
      feedbackInput.value = i18n.getLanguage() === 'te' 
        ? 'సమస్యను సకాలంలో బాగు చేసినందుకు ధన్యవాదాలు. పనులు సంతృప్తికరంగా పూర్తయ్యాయి.' 
        : 'Thank you for prompt resolution! The repairs were completed satisfactorily.';
    }
    this.openModal('modal-feedback');
  }

  setRating(rating) {
    this.selectedRating = rating;
    this.updateStarsUI(rating);
  }

  updateStarsUI(rating) {
    const starRow = document.getElementById('star-rating-row');
    if (!starRow) return;
    const stars = starRow.querySelectorAll('i');
    stars.forEach((star, idx) => {
      if (idx < rating) {
        star.classList.remove('fa-regular');
        star.classList.add('fa-solid');
      } else {
        star.classList.remove('fa-solid');
        star.classList.add('fa-regular');
      }
    });
  }

  async submitCitizenRating() {
    const feedbackInput = document.getElementById('citizen-feedback-text');
    const comment = feedbackInput ? feedbackInput.value.trim() : 'Satisfied';

    await window.dataStore.submitFeedback(this.currentActiveComplaintId, {
      rating: this.selectedRating,
      comment: comment,
      isSatisfied: true,
      citizenName: 'Rama Rao (రామారావు)'
    });

    this.closeModal('modal-feedback');
    this.showToast('Thank you! Citizen satisfaction rating recorded.', 'success');
    this.renderTrackingDossier(this.currentActiveComplaintId);
    this.refreshAllViews();
  }

  openReopenModal(id) {
    this.currentActiveComplaintId = id;
    const reopenInput = document.getElementById('reopen-reason-input');
    if (reopenInput) {
      reopenInput.value = i18n.getLanguage() === 'te'
        ? 'కేవలం మట్టి పోసి వదిలేశారు, వర్షానికి మళ్లీ గుంత పడింది. పనులు నాణ్యతగా జరగలేదు.'
        : 'Only loose gravel was poured over the crater; it washed away with rain. The road remains hazardous.';
    }
    this.openModal('modal-reopen');
  }

  async confirmReopenGrievance() {
    const reopenInput = document.getElementById('reopen-reason-input');
    const reason = reopenInput ? reopenInput.value.trim() : 'Repairs unsatisfactory.';

    await window.dataStore.submitFeedback(this.currentActiveComplaintId, {
      isSatisfied: false,
      reopenReason: reason,
      citizenName: 'Rama Rao (రామారావు)'
    });

    this.closeModal('modal-reopen');
    this.showToast('Grievance reopened and flagged for immediate official re-inspection!', 'warning');
    this.renderTrackingDossier(this.currentActiveComplaintId);
    this.refreshAllViews();
  }

  /* ==========================================================================
     MODULE B: VILLAGE OFFICIAL DASHBOARD
     ========================================================================== */
  async renderOfficialTable() {
    const tbody = document.getElementById('official-complaints-tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('official-search-input');
    const catFilter = document.getElementById('official-cat-filter');
    const statusFilter = document.getElementById('official-status-filter');

    const filters = {
      search: searchInput ? searchInput.value.trim() : '',
      category: catFilter ? catFilter.value : 'all',
      status: statusFilter ? statusFilter.value : 'all'
    };

    const complaints = await window.dataStore.getAllComplaints(filters);

    if (complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--gray-500);">No complaints matching current filters.</td></tr>`;
      return;
    }

    const isTe = i18n.getLanguage() === 'te';

    tbody.innerHTML = complaints.map(c => {
      const title = isTe && c.titleTe ? c.titleTe : c.title;
      const statusPillClass = this.getStatusClass(c.status);
      const statusLabel = this.getStatusLabel(c.status);

      let slaClock = `<span style="color: var(--primary-700); font-weight: 600;"><i class="fa-regular fa-clock"></i> 72h SLA Active</span>`;
      if (c.isOverdue && c.status !== 'Resolved') {
        slaClock = `<span class="status-pill status-overdue"><i class="fa-solid fa-triangle-exclamation"></i> OVERDUE</span>`;
      }
      if (c.status === 'Resolved') {
        slaClock = `<span style="color: var(--primary-800);"><i class="fa-solid fa-check"></i> Closed</span>`;
      }

      return `
        <tr>
          <td><span class="id-badge">${c.id}</span></td>
          <td>
            <strong>${this.escapeHtml(c.citizenName)}</strong>
            <p style="font-size: 0.75rem; color: var(--gray-500);">${this.escapeHtml(c.ward || c.village)}</p>
          </td>
          <td>
            <span style="font-weight: 600; color: var(--primary-900);">${this.escapeHtml(c.category)}</span>
            <p style="font-size: 0.72rem; color: var(--gray-500);">${this.escapeHtml(c.landmark || '')}</p>
          </td>
          <td><span style="font-size: 0.78rem; color: var(--gray-600);">${this.formatDate(c.createdAt)}</span></td>
          <td><span class="status-pill ${statusPillClass}">${statusLabel}</span></td>
          <td>${slaClock}</td>
          <td>
            <button class="btn-table-action" onclick="app.openOfficialActionModal('${c.id}')">
              <i class="fa-solid fa-pen-to-square"></i>
              <span data-i18n="btnReviewAction">${i18n.t('btnReviewAction')}</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  filterOfficialTable() {
    this.renderOfficialTable();
  }

  async refreshOfficialData() {
    await this.renderOfficialTable();
    await this.updateStatsCounters();
    this.showToast('Grama Sachivalayam live feed refreshed', 'success');
  }

  async openOfficialActionModal(id) {
    this.activeActionComplaintId = id;
    const complaint = await window.dataStore.getComplaintById(id);
    if (!complaint) return;

    const modalBody = document.getElementById('official-action-modal-body');
    if (!modalBody) return;

    const isTe = i18n.getLanguage() === 'te';
    const title = isTe && complaint.titleTe ? complaint.titleTe : complaint.title;
    const desc = isTe && complaint.descriptionTe ? complaint.descriptionTe : complaint.description;

    modalBody.innerHTML = `
      <!-- Citizen details summary -->
      <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: var(--primary-900);">${complaint.id} – ${this.escapeHtml(complaint.category)}</strong>
          <span class="status-pill ${this.getStatusClass(complaint.status)}">${this.getStatusLabel(complaint.status)}</span>
        </div>
        <p style="font-size: 0.88rem; font-weight: 600; color: var(--gray-800);">${this.escapeHtml(title)}</p>
        <p style="font-size: 0.82rem; color: var(--gray-600); margin-top: 4px;">${this.escapeHtml(desc)}</p>

        <div style="display: flex; gap: 16px; margin-top: 10px; font-size: 0.78rem; color: var(--gray-500);">
          <span><i class="fa-solid fa-user"></i> ${this.escapeHtml(complaint.citizenName)} (${complaint.citizenPhone})</span>
          <span><i class="fa-solid fa-location-dot"></i> ${this.escapeHtml(complaint.landmark)}, ${this.escapeHtml(complaint.ward)}</span>
        </div>

        ${complaint.citizenPhoto ? `
          <div style="margin-top: 12px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--gray-600);">Citizen Defect Photo:</span>
            <img src="${complaint.citizenPhoto}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: var(--radius-sm); margin-top: 4px; display: block;" alt="Defect Photo">
          </div>
        ` : ''}
      </div>

      <!-- 1. Department Assignment -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionAssign')}</label>
        <select id="modal-assign-dept" class="form-select">
          <option value="Panchayat Raj Engineering Dept (PRED)" ${complaint.assignedDepartment && complaint.assignedDepartment.includes('Panchayat Raj') ? 'selected' : ''}>Panchayat Raj Engineering Dept (PRED)</option>
          <option value="Rural Water Supply & Sanitation (RWSS)" ${complaint.assignedDepartment && complaint.assignedDepartment.includes('Water Supply') ? 'selected' : ''}>Rural Water Supply & Sanitation (RWSS)</option>
          <option value="APCPDCL / TSSPDCL Rural Operations" ${complaint.assignedDepartment && complaint.assignedDepartment.includes('APCPDCL') ? 'selected' : ''}>APCPDCL / TSSPDCL Rural Operations</option>
          <option value="Panchayat Sanitation & Public Health" ${complaint.assignedDepartment && complaint.assignedDepartment.includes('Sanitation') ? 'selected' : ''}>Panchayat Sanitation & Public Health</option>
          <option value="Revenue & Land Records Wing" ${complaint.assignedDepartment && complaint.assignedDepartment.includes('Revenue') ? 'selected' : ''}>Revenue & Land Records Wing</option>
        </select>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label>${i18n.t('lblOfficerName')}</label>
          <input type="text" id="modal-assign-officer" class="form-input" value="${this.escapeHtml(complaint.assignedOfficer && complaint.assignedOfficer !== 'Unassigned' ? complaint.assignedOfficer : 'K. Venkateshwarlu (AEE)')}">
        </div>
        <div class="form-group">
          <label>${i18n.t('lblOfficerPhone')}</label>
          <input type="text" id="modal-assign-phone" class="form-input" value="${this.escapeHtml(complaint.officerContact || '+91 89781 44520')}">
        </div>
      </div>

      <!-- 2. Status Transition -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionStatus')}</label>
        <select id="modal-status-select" class="form-select">
          <option value="Submitted" ${complaint.status === 'Submitted' ? 'selected' : ''}>Submitted (నమోదైంది)</option>
          <option value="Assigned" ${complaint.status === 'Assigned' ? 'selected' : ''}>Assigned (విభాగానికి కేటాయించబడింది)</option>
          <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress (మరమ్మతు పనులు ప్రారంభమయ్యాయి)</option>
          <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved (పూర్తయింది - పరిష్కార ఫోటోతో)</option>
        </select>
      </div>

      <!-- 3. Official Remarks -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionRemarks')}</label>
        <textarea id="modal-official-remarks" class="form-textarea" placeholder="${i18n.t('remarksPlaceholder')}">${this.escapeHtml(complaint.officialRemarks || '')}</textarea>
      </div>

      <!-- 4. Resolution Photograph Upload -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionResolutionPhoto')}</label>
        <p style="font-size: 0.78rem; color: var(--gray-500); margin-bottom: 6px;">${i18n.t('resPhotoUploadHint')}</p>
        
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--gray-600); align-self: center;">${i18n.t('quickResPhotos')}</span>
          <button type="button" class="sample-photo-btn" onclick="app.setModalResPhoto('road')">🛣️ ${i18n.t('resRepavedRoad')}</button>
          <button type="button" class="sample-photo-btn" onclick="app.setModalResPhoto('pipe')">💧 ${i18n.t('resFixedPipe')}</button>
          <button type="button" class="sample-photo-btn" onclick="app.setModalResPhoto('power')">⚡ ${i18n.t('resFixedPower')}</button>
          <button type="button" class="sample-photo-btn" onclick="app.setModalResPhoto('clean')">🧹 ${i18n.t('resCleanedGround')}</button>
        </div>

        <input type="text" id="modal-res-photo-url" class="form-input" placeholder="Resolution Photo URL..." value="${complaint.resolutionPhoto || this.sampleResolutionPhotos.road}">
      </div>
    `;

    this.openModal('modal-official-action');
  }

  setModalResPhoto(type) {
    const input = document.getElementById('modal-res-photo-url');
    if (input && this.sampleResolutionPhotos[type]) {
      input.value = this.sampleResolutionPhotos[type];
      this.showToast('Resolution proof photo attached', 'success');
    }
  }

  async saveOfficialAction() {
    if (!this.activeActionComplaintId) return;

    const deptSelect = document.getElementById('modal-assign-dept');
    const officerInput = document.getElementById('modal-assign-officer');
    const phoneInput = document.getElementById('modal-assign-phone');
    const statusSelect = document.getElementById('modal-status-select');
    const remarksInput = document.getElementById('modal-official-remarks');
    const photoUrlInput = document.getElementById('modal-res-photo-url');

    const updates = {
      assignedDepartment: deptSelect ? deptSelect.value : undefined,
      assignedOfficer: officerInput ? officerInput.value.trim() : undefined,
      officerContact: phoneInput ? phoneInput.value.trim() : undefined,
      status: statusSelect ? statusSelect.value : undefined,
      officialRemarks: remarksInput ? remarksInput.value.trim() : undefined,
      resolutionPhoto: photoUrlInput ? photoUrlInput.value.trim() : undefined,
      resolutionRemarks: remarksInput ? remarksInput.value.trim() : undefined,
      actionActor: 'Panchayat Secretary (V. Srikanth)'
    };

    // If marked resolved, ensure a resolution photo is present
    if (updates.status === 'Resolved' && !updates.resolutionPhoto) {
      updates.resolutionPhoto = this.sampleResolutionPhotos.road;
    }

    await window.dataStore.updateComplaint(this.activeActionComplaintId, updates);
    this.closeModal('modal-official-action');
    this.showToast(`Complaint ${this.activeActionComplaintId} updated: Status transitioned to ${updates.status}`, 'success');

    this.renderOfficialTable();
    this.updateStatsCounters();
    if (this.currentActiveComplaintId === this.activeActionComplaintId) {
      this.renderTrackingDossier(this.currentActiveComplaintId);
    }
  }

  /* ==========================================================================
     MODULE C: HIGHER AUTHORITY ESCALATION CHAMBER
     ========================================================================== */
  async renderAuthorityConsole() {
    const chamberList = document.getElementById('overdue-chamber-list');
    const overdueBadge = document.getElementById('overdue-pill-badge');
    const breachStat = document.getElementById('auth-breach-count');
    if (!chamberList) return;

    const complaints = await window.dataStore.getAllComplaints();
    const overdueItems = complaints.filter(c => (c.isOverdue || c.status === 'Escalated') && c.status !== 'Resolved');

    if (overdueBadge) overdueBadge.textContent = `${overdueItems.length} Urgent Escalation Items`;
    if (breachStat) breachStat.textContent = overdueItems.length;

    if (overdueItems.length === 0) {
      chamberList.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--primary-700);"><i class="fa-solid fa-shield-heart" style="font-size: 1.8rem; margin-bottom: 8px;"></i><br>All rural grievances are strictly within statutory SLA deadlines. Zero critical breaches.</div>`;
      return;
    }

    const isTe = i18n.getLanguage() === 'te';

    chamberList.innerHTML = overdueItems.map(c => {
      const title = isTe && c.titleTe ? c.titleTe : c.title;
      const isAlreadyEscalated = c.status === 'Escalated';

      return `
        <div class="overdue-item-card">
          <div class="overdue-details">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="id-badge">${c.id}</span>
              <span class="status-pill status-overdue"><i class="fa-solid fa-clock-rotate-left"></i> SLA BREACHED (>72 Hours)</span>
              ${isAlreadyEscalated ? `<span class="status-pill status-escalated"><i class="fa-solid fa-gavel"></i> COLLECTOR MANDATE ACTIVE</span>` : ''}
            </div>
            <h4>${this.escapeHtml(title)}</h4>
            <p>${this.escapeHtml(c.assignedDepartment)} | Filed by: ${this.escapeHtml(c.citizenName)} at ${this.escapeHtml(c.ward || c.village)}</p>
          </div>
          <div>
            ${isAlreadyEscalated ? `
              <button class="btn-dash-outline" style="border-color: var(--accent-red); color: var(--accent-red); font-size: 0.8rem;" onclick="app.trackDirectId('${c.id}')">
                <i class="fa-solid fa-eye"></i> View Order
              </button>
            ` : `
              <button class="btn-escalate-action" onclick="app.openEscalateModal('${c.id}')">
                <i class="fa-solid fa-gavel"></i>
                <span data-i18n="btnEscalateNow">${i18n.t('btnEscalateNow')}</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  openEscalateModal(id) {
    this.activeActionComplaintId = id;
    const directiveInput = document.getElementById('escalate-directive-text');
    if (directiveInput) {
      directiveInput.value = i18n.getLanguage() === 'te'
        ? 'జిల్లా కలెక్టర్ వారి అత్యవసర ఆదేశాలు: 24 గంటలలోపు ప్రత్యేక ఫీల్డ్ బృందాన్ని పంపి సమస్యను పరిష్కరించి సాయంత్రం 5 గంటలలోపు నివేదిక సమర్పించాలి.'
        : 'Emergency directive issued by District Collector. Dispatch emergency engineering unit within 24 hours. Submit compliance report by 5 PM.';
    }
    this.openModal('modal-escalate');
  }

  async confirmEscalateAction() {
    if (!this.activeActionComplaintId) return;

    const directiveInput = document.getElementById('escalate-directive-text');
    const directive = directiveInput ? directiveInput.value.trim() : 'Collectorate Escalation Mandate';

    await window.dataStore.escalateComplaint(
      this.activeActionComplaintId,
      directive,
      'District Collector (Dr. Ananya Reddy, IAS)'
    );

    this.closeModal('modal-escalate');
    this.showToast(`Collector Executive Order issued for ${this.activeActionComplaintId}!`, 'error');

    this.renderAuthorityConsole();
    this.refreshAllViews();
    if (this.currentActiveComplaintId === this.activeActionComplaintId) {
      this.renderTrackingDossier(this.currentActiveComplaintId);
    }
  }

  /* ==========================================================================
     SCREEN 5: VILLAGE TRANSPARENCY PAGE
     ========================================================================== */
  async renderTransparencyPage() {
    const stats = await window.dataStore.getStats();
    const complaints = await window.dataStore.getAllComplaints();

    // Metric counters
    const tTotal = document.getElementById('trans-stat-total');
    const tResolved = document.getElementById('trans-stat-resolved');
    const tPending = document.getElementById('trans-stat-pending');
    const tOverdue = document.getElementById('trans-stat-overdue');

    if (tTotal) tTotal.textContent = stats.total;
    if (tResolved) tResolved.textContent = stats.resolved;
    if (tPending) tPending.textContent = stats.inProgress + stats.assigned + stats.submitted;
    if (tOverdue) tOverdue.textContent = stats.overdue;

    // Category breakdown bars
    const catBarsContainer = document.getElementById('transparency-category-bars');
    if (catBarsContainer && stats.categoryStats) {
      const catLabels = {
        roads: i18n.t('catRoads'),
        water: i18n.t('catWater'),
        electricity: i18n.t('catElectricity'),
        drainage: i18n.t('catDrainage'),
        sanitation: i18n.t('catSanitation'),
        other: i18n.t('catOther')
      };

      catBarsContainer.innerHTML = Object.keys(stats.categoryStats).map(key => {
        const count = stats.categoryStats[key];
        const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
        return `
          <div class="dept-bar-item">
            <div class="dept-bar-labels">
              <span>${catLabels[key] || key}</span>
              <span>${count} (${pct}%)</span>
            </div>
            <div class="progress-track"><div class="progress-fill high" style="width: ${Math.max(pct, 5)}%;"></div></div>
          </div>
        `;
      }).join('');
    }

    // Recent Anonymized Public Feed
    const feedContainer = document.getElementById('transparency-public-feed');
    if (feedContainer) {
      const isTe = i18n.getLanguage() === 'te';
      const recentFive = complaints.slice(0, 5);

      feedContainer.innerHTML = recentFive.map(c => {
        const title = isTe && c.titleTe ? c.titleTe : c.title;
        return `
          <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="id-badge">${c.id}</span>
              <span class="status-pill ${this.getStatusClass(c.status)}">${this.getStatusLabel(c.status)}</span>
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--gray-800);">${this.escapeHtml(title)}</div>
            <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 4px;">
              <i class="fa-solid fa-location-dot"></i> ${this.escapeHtml(c.ward || c.village)} • ${this.formatTimeAgo(c.createdAt)}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /* ==========================================================================
     COMMON HELPERS & REFRESH LOGIC
     ========================================================================== */
  async updateStatsCounters() {
    const stats = await window.dataStore.getStats();

    // Welcome stats
    const wResolved = document.getElementById('stat-resolved-count');
    const wSla = document.getElementById('stat-sla-pct');
    const wActive = document.getElementById('stat-active-count');
    if (wResolved) wResolved.textContent = stats.resolved;
    if (wSla) wSla.textContent = `${stats.slaAdherenceRate}%`;
    if (wActive) wActive.textContent = stats.total - stats.resolved;

    // Official stats
    const offTotal = document.getElementById('off-stat-total');
    const offPending = document.getElementById('off-stat-pending');
    const offProgress = document.getElementById('off-stat-progress');
    const offResolved = document.getElementById('off-stat-resolved');
    if (offTotal) offTotal.textContent = stats.total;
    if (offPending) offPending.textContent = stats.submitted + stats.assigned;
    if (offProgress) offProgress.textContent = stats.inProgress + stats.escalated + stats.reopened;
    if (offResolved) offResolved.textContent = stats.resolved;

    // Authority SLA
    const authSla = document.getElementById('auth-sla-stat');
    if (authSla) authSla.textContent = `${stats.slaAdherenceRate}%`;
  }

  async refreshAllViews() {
    await this.updateStatsCounters();
    await this.renderCitizenDashboard();
    await this.renderOfficialTable();
    await this.renderAuthorityConsole();
    await this.renderTransparencyPage();
  }

  async confirmResetData() {
    if (confirm('Reset prototype sample complaints to initial demonstration state?')) {
      await window.dataStore.resetData();
      this.currentActiveComplaintId = 'PP-2025-RD-1042';
      this.renderTrackingDossier(this.currentActiveComplaintId);
      this.showToast('Sample dataset restored to initial hackathon seed state!', 'success');
    }
  }

  toggleWalkthroughDrawer() {
    const drawer = document.getElementById('demo-walkthrough-drawer');
    if (drawer) drawer.classList.toggle('open');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-bell';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  getStatusClass(status) {
    switch (status) {
      case 'Submitted': return 'status-submitted';
      case 'Assigned': return 'status-assigned';
      case 'In Progress': return 'status-inprogress';
      case 'Resolved': return 'status-resolved';
      case 'Reopened': return 'status-reopened';
      case 'Escalated': return 'status-escalated';
      default: return 'status-submitted';
    }
  }

  getStatusLabel(status) {
    switch (status) {
      case 'Submitted': return i18n.t('statusSubmitted');
      case 'Assigned': return i18n.t('statusAssigned');
      case 'In Progress': return i18n.t('statusInProgress');
      case 'Resolved': return i18n.t('statusResolved');
      case 'Reopened': return i18n.t('statusReopened');
      case 'Escalated': return i18n.t('statusEscalated');
      default: return status;
    }
  }

  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTimeAgo(isoString) {
    if (!isoString) return '';
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global App singleton instance
window.app = new AppController();
