/**
 * Praja Voice - Main Application Controller
 * Handles routing, role switching, forms, voice recognition, official actions,
 * citizen verification, authority escalations, and real-time reactive state updates.
 */

class AppController {
  constructor() {
    this.currentRole = 'citizen';
    this.currentVillagerSubView = 'welcome';
    this.selectedCategory = 'roads';
    this.uploadedPhotoFile = null;
    this.photoPreviewUrl = null;
    this.currentActiveComplaintId = 'PP-2025-RD-1042';
    this.activeActionComplaintId = null;
    this.pendingInspectionFile = null;
    this.pendingProgressFile = null;
    this.pendingResolutionFile = null;
    this.selectedRating = 5;

    this.init();
  }

  async init() {
    // Setup i18n
    i18n.applyTranslations();

    // Listen to data store events
    window.addEventListener('pallepraja:data-updated', () => this.refreshAllViews());
    window.addEventListener('pallepraja:auth-expired', () => {
      if (this.currentRole === 'official' || this.currentRole === 'authority') {
        this.updatePortalAccess(this.currentRole);
      }
      this.showToast('Your sign-in session has expired. Please sign in again.', 'warning');
    });
    window.addEventListener('pallepraja:language-changed', () => {
      this.refreshAllViews();
      this.syncVoiceLanguage();
    });

    try {
      await window.dataStore.restoreSession();
    } catch (error) {
      console.error('Unable to restore the officer session:', error);
    }

    // Initial render of all dashboards
    await this.refreshAllViews();

    // Pre-track the first complaint so tracking tab is immediately populated
    await this.renderTrackingDossier(this.currentActiveComplaintId);

    // Set voice language according to current i18n
    this.syncVoiceLanguage();

    const portal = new URLSearchParams(window.location.search).get('portal');
    const requestedRole = window.location.pathname.startsWith('/grama-sachivalayam')
      ? 'official'
      : window.location.pathname.startsWith('/district-authority')
        ? 'authority'
        : portal === 'grama'
          ? 'official'
          : portal === 'district'
            ? 'authority'
            : null;
    if (requestedRole) this.switchRole(requestedRole);
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
    const moduleName = role === 'citizen' ? 'villager' : role;
    const targetModule = document.getElementById(`module-${moduleName}`);
    if (!targetModule) {
      this.showToast('That section is unavailable. Please reload the application.', 'error');
      return;
    }

    this.currentRole = role;
    if (role === 'official' || role === 'authority') {
      this.updatePortalAccess(role);
      const portal = role === 'official' ? 'grama' : 'district';
      window.history.replaceState(null, '', `/?portal=${portal}`);
    } else {
      window.history.replaceState(null, '', '/');
    }

    // Update top bar buttons
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-role-${role}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update visible module
    document.querySelectorAll('.module-view').forEach(mod => mod.classList.remove('active'));
    targetModule.classList.add('active');

    // Update persona tag in header
    const personaTag = document.getElementById('header-persona-tag');
    if (personaTag) {
      if (role === 'citizen') personaTag.textContent = i18n.t('personaCitizen');
      else if (role === 'official') personaTag.textContent = i18n.t('personaOfficial');
      else if (role === 'authority') personaTag.textContent = i18n.t('personaAuthority');
      else if (role === 'transparency') personaTag.textContent = i18n.t('roleTransparency');
    }

    const renderPromise = this.refreshAllViews();
    this.showToast(`Switched view to ${i18n.t(role === 'citizen' ? 'roleCitizen' : role === 'official' ? 'roleOfficial' : role === 'authority' ? 'roleAuthority' : 'roleTransparency')}`, 'info');
    return renderPromise;
  }

  updatePortalAccess(portal) {
    const isGrama = portal === 'official';
    const expectedRole = isGrama ? 'GRAMA_SACHIVALAYAM' : 'DISTRICT_AUTHORITY';
    const loginPanel = document.getElementById(isGrama ? 'grama-login-panel' : 'district-login-panel');
    const dashboard = document.getElementById(isGrama ? 'grama-dashboard-content' : 'district-dashboard-content');
    const error = document.getElementById(isGrama ? 'grama-login-error' : 'district-login-error');
    const logout = document.getElementById(isGrama ? 'grama-login-logout' : 'district-login-logout');
    const user = window.dataStore.authUser;
    const authorized = Boolean(user && user.role === expectedRole);
    if (loginPanel) loginPanel.hidden = authorized;
    if (dashboard) dashboard.hidden = !authorized;
    if (logout) logout.hidden = !user || authorized;
    if (error) {
      error.textContent = user && !authorized
        ? `Your ${user.role.replace(/_/g, ' ')} account cannot access this portal. Sign out and use an authorized account.`
        : '';
    }
    const userLabel = document.getElementById(isGrama ? 'official-session-user' : 'district-session-user');
    if (userLabel) userLabel.textContent = authorized ? user.username : '';
    return authorized;
  }

  async loginPortal(role) {
    const isGrama = role === 'GRAMA_SACHIVALAYAM';
    const prefix = isGrama ? 'grama' : 'district';
    const usernameInput = document.getElementById(`${prefix}-username`);
    const passwordInput = document.getElementById(`${prefix}-password`);
    const error = document.getElementById(`${prefix}-login-error`);
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    if (!username || !password) {
      if (error) error.textContent = 'Enter your username and password.';
      return;
    }

    if (error) error.textContent = '';
    try {
      await window.dataStore.login(username, password, role);
      if (passwordInput) passwordInput.value = '';
      await this.switchRole(isGrama ? 'official' : 'authority');
    } catch (loginError) {
      if (passwordInput) passwordInput.value = '';
      if (error) error.textContent = loginError.message;
    }
  }

  async logoutPortal() {
    try {
      await window.dataStore.logout();
      this.updatePortalAccess(this.currentRole);
      this.showToast('You have been signed out.', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
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
    if (!file) return;

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      event.target.value = '';
      this.showToast('Choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      this.showToast('Image is too large. Maximum upload size is 5 MB.', 'error');
      return;
    }

    this.uploadedPhotoFile = file;
    this.updatePhotoPreview(file);
  }

  updatePhotoPreview(file) {
    const previewBox = document.getElementById('photo-preview-box');
    const previewImg = document.getElementById('photo-preview-img');
    if (previewBox && previewImg) {
      if (this.photoPreviewUrl) URL.revokeObjectURL(this.photoPreviewUrl);
      this.photoPreviewUrl = URL.createObjectURL(file);
      previewImg.src = this.photoPreviewUrl;
      previewBox.style.display = 'block';
    }
  }

  removePhoto(event) {
    if (event) event.stopPropagation();
    this.uploadedPhotoFile = null;
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
      this.photoPreviewUrl = null;
    }
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
      gpsCoordinates: gpsInput ? gpsInput.value : '16.5062° N, 80.6480° E'
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i18n.t('submitting')}`;
    }

    try {
      const created = await window.dataStore.createComplaint(newComplaintPayload);
      this.currentActiveComplaintId = created.id;
      let photoUploadError = '';
      if (this.uploadedPhotoFile) {
        try {
          await window.dataStore.uploadEvidence(created.id, 'complaint', this.uploadedPhotoFile);
        } catch (error) {
          photoUploadError = error.message;
        }
      }

      // Show success celebration modal
      const modalIdElem = document.getElementById('success-modal-id');
      if (modalIdElem) modalIdElem.textContent = created.id;
      this.openModal('modal-success');
      const modalSubtitle = document.querySelector('#modal-success [data-i18n="modalSuccessSubtitle"]');
      if (modalSubtitle && photoUploadError) {
        modalSubtitle.textContent = `Complaint ${created.id} was created, but the photo was not saved: ${photoUploadError}`;
      }

      // Spoken voice confirmation
      if (window.voiceManager) {
        window.voiceManager.speakConfirmation('మీ ఫిర్యాదు విజయవంతంగా నమోదైంది. ఫిర్యాదు సంఖ్య: ' + created.id, i18n.getLanguage());
      }

      this.showToast(
        photoUploadError
          ? `Complaint ${created.id} was created, but its photo upload failed.`
          : `Complaint registered successfully: ${created.id}`,
        photoUploadError ? 'warning' : 'success'
      );
      this.removePhoto();
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

    const complaints = (await window.dataStore.getAllComplaints())
      .filter(complaint => !complaint.isHackathonSample);
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
          <p style="color: var(--gray-500); margin-top: 6px;">Please verify the ID or choose one of the complaint IDs above.</p>
        </div>
      `;
      return;
    }
    if (complaint.isHackathonSample) {
      container.innerHTML = `
        <div class="dossier-card" style="text-align: center; padding: 48px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: var(--accent-gold); margin-bottom: 12px;"></i>
          <h3>Complaint ID "${this.escapeHtml(id)}" Not Found</h3>
          <p style="color: var(--gray-500); margin-top: 6px;">Please verify the ID or contact your Grama Sachivalayam.</p>
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
    const complaintEvidence = (complaint.evidence || []).find(item => item.type === 'complaint');
    const inspectionEvidence = (complaint.evidence || []).filter(item => item.type === 'inspection').reverse();
    const progressEvidence = (complaint.evidence || []).filter(item => item.type === 'progress').reverse();
    const resolutionEvidence = (complaint.evidence || []).filter(item => item.type === 'resolution').reverse();
    const resolvedEvent = (complaint.timeline || []).slice().reverse().find(item => item.status === 'Resolved');
    const resolvedAt = complaint.resolvedAt || (resolvedEvent && resolvedEvent.timestamp);
    const renderEvidenceItem = (item, label) => `
      <img class="evidence-img" src="${this.escapeHtml(item.url)}" alt="${label}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="evidence-unavailable" style="display: none;"><i class="fa-regular fa-image"></i><span>${i18n.t('evidenceUnavailable')}</span></div>
      <div class="evidence-metadata">
        ${this.escapeHtml(i18n.t('evidenceUploader'))}: ${this.escapeHtml(item.uploaderId)}
        <br>${this.escapeHtml(this.formatDate(item.uploadedAt))}
        ${item.inspectionNotes ? `<br>${this.escapeHtml(item.inspectionNotes)}` : ''}
      </div>
    `;

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
          ${complaint.status === 'Resolved' && resolvedAt ? `
            <div class="dossier-field">
              <span class="label">Resolved</span>
              <span class="value">${this.escapeHtml(this.formatDate(resolvedAt))}</span>
            </div>
          ` : ''}
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
              ${complaintEvidence
                ? renderEvidenceItem(complaintEvidence, 'Original complaint evidence')
                : `<div class="no-evidence-placeholder"><i class="fa-regular fa-image" style="font-size: 2.2rem;"></i><span data-i18n="noBeforePhoto">${i18n.t('noBeforePhoto')}</span></div>`}
            </div>

            ${inspectionEvidence.length > 0 ? `
              <div class="evidence-card">
                <div class="evidence-card-label before">
                  <i class="fa-solid fa-clipboard-check"></i>
                  <span>${i18n.t('sectionInspectionPhoto')}</span>
                </div>
                ${inspectionEvidence.map(item => renderEvidenceItem(item, 'Officer-submitted inspection evidence')).join('')}
              </div>
            ` : ''}

            ${progressEvidence.length > 0 ? `
              <div class="evidence-card">
                <div class="evidence-card-label before">
                  <i class="fa-solid fa-person-digging"></i>
                  <span>${i18n.t('workInProgressPhotos')}</span>
                </div>
                ${progressEvidence.map(item => renderEvidenceItem(item, 'Officer-submitted work-in-progress evidence')).join('')}
              </div>
            ` : ''}

            <div class="evidence-card">
              <div class="evidence-card-label after">
                <i class="fa-solid fa-circle-check"></i>
                <span data-i18n="photoAfterTitle">${i18n.t('photoAfterTitle')}</span>
              </div>
              ${resolutionEvidence.length > 0
                ? resolutionEvidence.map(item => renderEvidenceItem(item, 'Officer-submitted resolution evidence')).join('')
                : `
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
        ${complaint.status === 'Resolved' && complaint.resolutionRemarks ? `
          <div style="background: var(--primary-50); border-left: 4px solid var(--primary-600); padding: 14px 18px; border-radius: var(--radius-sm); margin: 24px 0;">
            <strong style="color: var(--primary-900); font-size: 0.88rem;"><i class="fa-solid fa-circle-check"></i> Resolution Remarks:</strong>
            <p style="font-size: 0.88rem; color: var(--gray-700); margin-top: 4px;">${this.escapeHtml(complaint.resolutionRemarks)}</p>
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

    try {
      await window.dataStore.submitFeedback(this.currentActiveComplaintId, {
        rating: this.selectedRating,
        comment: comment,
        isSatisfied: true,
        citizenName: 'Rama Rao (రామారావు)'
      });

      this.closeModal('modal-feedback');
      this.showToast('Thank you! Citizen satisfaction rating recorded.', 'success');
      await this.renderTrackingDossier(this.currentActiveComplaintId);
      await this.refreshAllViews();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
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

    try {
      await window.dataStore.submitFeedback(this.currentActiveComplaintId, {
        isSatisfied: false,
        reopenReason: reason,
        citizenName: 'Rama Rao (రామారావు)'
      });

      this.closeModal('modal-reopen');
      this.showToast('Grievance reopened and flagged for immediate official re-inspection!', 'warning');
      await this.renderTrackingDossier(this.currentActiveComplaintId);
      await this.refreshAllViews();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  /* ==========================================================================
     MODULE B: VILLAGE OFFICIAL DASHBOARD
     ========================================================================== */
  async renderOfficialTable() {
    const tbody = document.getElementById('official-complaints-tbody');
    if (!tbody) return;
    if (!this.updatePortalAccess('official')) return;

    const searchInput = document.getElementById('official-search-input');
    const catFilter = document.getElementById('official-cat-filter');
    const statusFilter = document.getElementById('official-status-filter');

    const filters = {
      search: searchInput ? searchInput.value.trim() : '',
      category: catFilter ? catFilter.value : 'all',
      status: statusFilter ? statusFilter.value : 'all'
    };

    await window.dataStore.getPortalDashboard('GRAMA_SACHIVALAYAM');
    const complaints = (await window.dataStore.getAllComplaints(filters, true))
      .filter(complaint => complaint.status !== 'FORWARDED_TO_DISTRICT');

    if (complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--gray-500);">No complaints matching current filters.</td></tr>`;
      return;
    }

    const isTe = i18n.getLanguage() === 'te';

    tbody.innerHTML = complaints.map(c => {
      const title = isTe && c.titleTe ? c.titleTe : c.title;
      const statusPillClass = this.getStatusClass(c.status);
      const statusLabel = this.getStatusLabel(c.status);
      const canForwardToDistrict = ![
        'FORWARDED_TO_DISTRICT',
        'DISTRICT_ESCALATED',
        'URGENT_ESCALATION',
        'Resolved'
      ].includes(c.status) && c.assignedDepartment && c.assignedDepartment !== 'Pending Assignment';

      let slaClock = `<span style="color: var(--primary-700); font-weight: 600;"><i class="fa-regular fa-clock"></i> 72h SLA Active</span>`;
      if (c.urgentEscalation && c.urgentEscalation.deadlineAt && c.status !== 'Resolved') {
        slaClock = `<span style="color: var(--primary-700); font-weight: 600;">24h deadline: ${this.escapeHtml(this.formatDate(c.urgentEscalation.deadlineAt))}</span>`;
      }
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
            <strong>${c.isHackathonSample ? 'Citizen details unavailable' : this.escapeHtml(c.citizenName)}</strong>
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
            ${canForwardToDistrict ? `
              <button class="btn-dash-outline" style="margin-top: 6px;" onclick="app.openForwardToDistrictModal('${this.escapeHtml(c.id)}')">
                Forward to District
              </button>
            ` : ''}
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

  openOfficerRegistrationModal() {
    ['register-admin-username', 'register-admin-password', 'register-officer-username', 'register-officer-password']
      .forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
    document.getElementById('register-officer-role').value = 'GRAMA_SACHIVALAYAM';
    document.getElementById('register-officer-active').value = 'true';
    const accountList = document.getElementById('managed-account-list');
    if (accountList) accountList.textContent = '';
    this.openModal('modal-officer-registration');
  }

  async registerOfficerFromAdmin() {
    const previousAuthToken = window.dataStore.authToken;
    const previousAuthUser = window.dataStore.authUser;
    const adminUsername = document.getElementById('register-admin-username').value.trim();
    const adminPasswordInput = document.getElementById('register-admin-password');
    const officerUsername = document.getElementById('register-officer-username').value.trim();
    const officerPasswordInput = document.getElementById('register-officer-password');
    const role = document.getElementById('register-officer-role').value;
    const active = document.getElementById('register-officer-active').value === 'true';
    const department = document.getElementById('register-officer-department').value;
    const adminPassword = adminPasswordInput.value;
    const officerPassword = officerPasswordInput.value;

    if (!adminUsername || !adminPassword || !officerUsername || !officerPassword) {
      this.showToast('Enter the ADMIN credentials and all new account details.', 'error');
      return;
    }

    try {
      const login = await window.dataStore.login(adminUsername, adminPassword);
      if (login.user.role !== 'ADMIN') {
        throw new Error('Only an ADMIN account can manage government accounts.');
      }
      const officer = await window.dataStore.registerOfficer({
        username: officerUsername,
        password: officerPassword,
        department: ['OFFICER', 'GRAMA_SACHIVALAYAM'].includes(role) ? department : '',
        role,
        active
      }, login.accessToken);
      adminPasswordInput.value = '';
      officerPasswordInput.value = '';
      document.getElementById('register-officer-username').value = '';
      this.showToast(`${officer.role} account ${officer.username} created (${officer.active ? 'active' : 'inactive'}).`, 'success');
      const accounts = await window.dataStore.getAccounts(login.accessToken);
      this.renderManagedAccounts(accounts);
    } catch (error) {
      adminPasswordInput.value = '';
      officerPasswordInput.value = '';
      this.showToast(error.message, 'error');
    } finally {
      if (previousAuthUser && previousAuthUser.role !== 'ADMIN') {
        window.dataStore.authToken = previousAuthToken;
        window.dataStore.authUser = previousAuthUser;
      }
    }
  }

  async loadManagedAccounts() {
    const previousAuthToken = window.dataStore.authToken;
    const previousAuthUser = window.dataStore.authUser;
    const adminUsername = document.getElementById('register-admin-username').value.trim();
    const adminPasswordInput = document.getElementById('register-admin-password');
    const adminPassword = adminPasswordInput.value;
    if (!adminUsername || !adminPassword) {
      this.showToast('Enter ADMIN credentials to manage accounts.', 'error');
      return;
    }

    try {
      const login = await window.dataStore.login(adminUsername, adminPassword);
      if (login.user.role !== 'ADMIN') throw new Error('Only an ADMIN account can manage government accounts.');
      const accounts = await window.dataStore.getAccounts(login.accessToken);
      this.renderManagedAccounts(accounts);
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      adminPasswordInput.value = '';
      if (previousAuthUser && previousAuthUser.role !== 'ADMIN') {
        window.dataStore.authToken = previousAuthToken;
        window.dataStore.authUser = previousAuthUser;
      }
    }
  }

  renderManagedAccounts(accounts) {
    const list = document.getElementById('managed-account-list');
    if (!list) return;
    list.innerHTML = accounts.map(account => `
      <div class="managed-account-row">
        <span><strong>${this.escapeHtml(account.username)}</strong> · ${this.escapeHtml(account.role)} · ${account.active ? 'Active' : 'Inactive'}</span>
        <div>
          <button type="button" class="btn-dash-outline" data-account-status="${this.escapeHtml(account.username)}" data-next-active="${!account.active}">
            ${account.active ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" class="btn-dash-outline" data-account-reset="${this.escapeHtml(account.username)}">
            Reset Password
          </button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('[data-account-status]').forEach(button => {
      button.addEventListener('click', () => {
        this.setManagedAccountStatus(button.dataset.accountStatus, button.dataset.nextActive === 'true');
      });
    });
    list.querySelectorAll('[data-account-reset]').forEach(button => {
      button.addEventListener('click', () => {
        this.resetManagedAccountPassword(button.dataset.accountReset);
      });
    });
  }

  async resetManagedAccountPassword(username) {
    const passwordInput = document.getElementById('reset-account-password');
    const password = passwordInput ? passwordInput.value : '';
    const adminToken = window.dataStore.adminToken;
    if (!adminToken) {
      this.showToast('Sign in with an ADMIN account to reset passwords.', 'error');
      return;
    }
    if (password.length < 12) {
      this.showToast('Use a password of at least 12 characters.', 'error');
      return;
    }
    try {
      await window.dataStore.resetAccountPassword(username, password, adminToken);
      if (passwordInput) passwordInput.value = '';
      this.showToast(`Password reset for ${username}.`, 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async setManagedAccountStatus(username, active) {
    const adminToken = window.dataStore.adminToken;
    if (!adminToken) {
      this.showToast('Sign in with an ADMIN account to change account status.', 'error');
      return;
    }
    try {
      await window.dataStore.setAccountActive(username, active, adminToken);
      const accounts = await window.dataStore.getAccounts(adminToken);
      this.renderManagedAccounts(accounts);
      this.showToast(`${username} is now ${active ? 'active' : 'inactive'}.`, 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async openOfficialActionModal(id) {
    if (!window.dataStore.authUser || window.dataStore.authUser.role !== 'GRAMA_SACHIVALAYAM') {
      this.showToast('Sign in with a Grama Sachivalayam account to update complaints.', 'error');
      return;
    }
    this.activeActionComplaintId = id;
    this.pendingInspectionFile = null;
    this.pendingProgressFile = null;
    this.pendingResolutionFile = null;
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
          ${complaint.isHackathonSample
            ? '<span>Citizen contact details unavailable.</span>'
            : `<span><i class="fa-solid fa-user"></i> ${this.escapeHtml(complaint.citizenName)} (${this.escapeHtml(complaint.citizenPhone)})</span>`}
          <span><i class="fa-solid fa-location-dot"></i> ${this.escapeHtml(complaint.landmark)}, ${this.escapeHtml(complaint.ward)}</span>
        </div>

        ${(complaint.evidence || []).some(item => item.type === 'complaint') ? `
          <div style="margin-top: 12px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--gray-600);">Citizen Defect Photo:</span>
            ${(complaint.evidence || []).filter(item => item.type === 'complaint').map(item => `
              <img src="${this.escapeHtml(item.url)}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: var(--radius-sm); margin-top: 4px; display: block;" alt="Original complaint evidence">
            `).join('')}
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
          <option value="DISTRICT_ESCALATED" ${complaint.status === 'DISTRICT_ESCALATED' ? 'selected' : ''}>District return to Grama (24h)</option>
          <option value="URGENT_ESCALATION" ${complaint.status === 'URGENT_ESCALATION' ? 'selected' : ''}>Legacy District return (24h)</option>
        </select>
      </div>

      <!-- 3. Official Remarks -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionRemarks')}${complaint.status === 'DISTRICT_ESCALATED' || complaint.status === 'URGENT_ESCALATION' ? ' (resolution remarks required)' : ''}</label>
        <textarea id="modal-official-remarks" class="form-textarea" maxlength="4000" placeholder="${i18n.t('remarksPlaceholder')}">${this.escapeHtml(complaint.inspectionNotes || complaint.officialRemarks || '')}</textarea>
      </div>

      <!-- 4. Inspection Evidence Upload -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionInspectionPhoto')}</label>
        <p style="font-size: 0.78rem; color: var(--gray-500); margin-bottom: 6px;">${i18n.t('inspectionPhotoUploadHint')}</p>
        <input type="file" id="modal-inspection-file" class="form-input" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange="app.handleInspectionEvidenceChange(event)">
        <p id="inspection-evidence-file-name" style="font-size: 0.78rem; color: var(--gray-600); margin-top: 6px;">${i18n.t('noInspectionFileSelected')}</p>
      </div>

      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('workInProgressPhoto')}</label>
        <p style="font-size: 0.78rem; color: var(--gray-500); margin-bottom: 6px;">${i18n.t('workInProgressPhotoHint')}</p>
        <input type="file" id="modal-progress-file" class="form-input" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange="app.handleProgressEvidenceChange(event)">
        <p id="progress-evidence-file-name" style="font-size: 0.78rem; color: var(--gray-600); margin-top: 6px;">${i18n.t('noProgressFileSelected')}</p>
      </div>

      <!-- 5. Resolution Evidence Upload -->
      <div class="form-group">
        <label style="font-weight: 700; color: var(--primary-900);">${i18n.t('sectionResolutionPhoto')}</label>
        <p style="font-size: 0.78rem; color: var(--gray-500); margin-bottom: 6px;">${i18n.t('resPhotoUploadHint')}</p>
        <input type="file" id="modal-resolution-file" class="form-input" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange="app.handleResolutionEvidenceChange(event)">
        <p id="resolution-evidence-file-name" style="font-size: 0.78rem; color: var(--gray-600); margin-top: 6px;">${i18n.t('noResolutionFileSelected')}</p>
      </div>
    `;

    this.openModal('modal-official-action');
  }

  handleResolutionEvidenceChange(event) {
    const file = event.target.files[0];
    if (!file) {
      this.pendingResolutionFile = null;
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.target.value = '';
      this.pendingResolutionFile = null;
      this.showToast('Choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      this.pendingResolutionFile = null;
      this.showToast('Image is too large. Maximum upload size is 5 MB.', 'error');
      return;
    }

    this.pendingResolutionFile = file;
    const fileName = document.getElementById('resolution-evidence-file-name');
    if (fileName) fileName.textContent = file.name;
  }

  handleInspectionEvidenceChange(event) {
    const file = event.target.files[0];
    if (!file) {
      this.pendingInspectionFile = null;
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.target.value = '';
      this.pendingInspectionFile = null;
      this.showToast('Choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      this.pendingInspectionFile = null;
      this.showToast('Image is too large. Maximum upload size is 5 MB.', 'error');
      return;
    }

    this.pendingInspectionFile = file;
    const fileName = document.getElementById('inspection-evidence-file-name');
    if (fileName) fileName.textContent = file.name;
  }

  handleProgressEvidenceChange(event) {
    const file = event.target.files[0];
    if (!file) {
      this.pendingProgressFile = null;
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      event.target.value = '';
      this.pendingProgressFile = null;
      this.showToast('Choose a JPEG, PNG, or WebP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      this.pendingProgressFile = null;
      this.showToast('Image is too large. Maximum upload size is 5 MB.', 'error');
      return;
    }

    this.pendingProgressFile = file;
    const fileName = document.getElementById('progress-evidence-file-name');
    if (fileName) fileName.textContent = file.name;
  }

  async saveOfficialAction() {
    if (!this.activeActionComplaintId) return;
    if (!window.dataStore.authUser || window.dataStore.authUser.role !== 'GRAMA_SACHIVALAYAM') {
      this.showToast('Sign in with a Grama Sachivalayam account to update complaints.', 'error');
      return;
    }

    const deptSelect = document.getElementById('modal-assign-dept');
    const officerInput = document.getElementById('modal-assign-officer');
    const phoneInput = document.getElementById('modal-assign-phone');
    const statusSelect = document.getElementById('modal-status-select');
    const remarksInput = document.getElementById('modal-official-remarks');
    const inspectionNotes = remarksInput ? remarksInput.value.trim() : '';

    const updates = {
      assignedDepartment: deptSelect ? deptSelect.value : undefined,
      assignedOfficer: officerInput ? officerInput.value.trim() : undefined,
      officerContact: phoneInput ? phoneInput.value.trim() : undefined,
      status: statusSelect ? statusSelect.value : undefined,
      officialRemarks: remarksInput ? remarksInput.value.trim() : undefined,
      resolutionRemarks: remarksInput ? remarksInput.value.trim() : undefined
    };

    if (this.pendingInspectionFile && !inspectionNotes) {
      this.showToast(i18n.t('inspectionNotesRequired'), 'error');
      return;
    }

    try {
      if (this.pendingInspectionFile) {
        await window.dataStore.uploadEvidence(
          this.activeActionComplaintId,
          'inspection',
          this.pendingInspectionFile,
          undefined,
          inspectionNotes
        );
      }

      if (this.pendingProgressFile) {
        await window.dataStore.uploadEvidence(
          this.activeActionComplaintId,
          'progress',
          this.pendingProgressFile
        );
      }

      if (this.pendingResolutionFile) {
        await window.dataStore.uploadEvidence(
          this.activeActionComplaintId,
          'resolution',
          this.pendingResolutionFile
        );
      }

      const updatedComplaint = await window.dataStore.updateComplaint(this.activeActionComplaintId, updates);
      if (!updatedComplaint) {
        throw new Error('The server did not return the updated complaint.');
      }
      this.closeModal('modal-official-action');
      this.showToast(`Complaint ${this.activeActionComplaintId} updated successfully.`, 'success');
      await this.refreshAllViews();
      if (this.currentActiveComplaintId === this.activeActionComplaintId) {
        await this.renderTrackingDossier(this.currentActiveComplaintId);
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  /* ==========================================================================
     MODULE C: HIGHER AUTHORITY ESCALATION CHAMBER
     ========================================================================== */
  async renderAuthorityConsole() {
    const chamberList = document.getElementById('overdue-chamber-list');
    const overdueBadge = document.getElementById('overdue-pill-badge');
    if (!chamberList) return;
    if (!this.updatePortalAccess('authority')) return;

    await this.renderDistrictReviewQueue();
    const complaints = await window.dataStore.getPortalDashboard('DISTRICT_AUTHORITY');
    this.updateDistrictDashboardStats(complaints);
    this.renderDistrictComplaints(complaints);
    const overdueItems = complaints.filter(c =>
      (c.isOverdue || c.status === 'Escalated') &&
      c.status !== 'Resolved' &&
      c.status !== 'FORWARDED_TO_DISTRICT' &&
      !c.urgentEscalation
    );

    if (overdueBadge) overdueBadge.textContent = `${overdueItems.length} Urgent Escalation Items`;

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
            <p>${this.escapeHtml(c.assignedDepartment)} | ${c.isHackathonSample ? 'Citizen details unavailable' : `Filed by: ${this.escapeHtml(c.citizenName)}`} at ${this.escapeHtml(c.ward || c.village)}</p>
          </div>
          <div>
            ${isAlreadyEscalated ? `
              <button class="btn-dash-outline" style="border-color: var(--accent-red); color: var(--accent-red); font-size: 0.8rem;" onclick="app.viewOrder('${c.id}')">
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

  async viewOrder(id, isDistrictReview = false) {
    const content = document.getElementById('order-details-content');
    if (!content) {
      this.showToast('The order details view is unavailable. Please reload the application.', 'error');
      return;
    }

    content.innerHTML = '<p role="status">Loading order details...</p>';
    this.openModal('modal-order-details');

    try {
      const complaint = isDistrictReview
        ? await window.dataStore.getDistrictReview(id)
        : await window.dataStore.getOrderDetails(id);
      if (!complaint) {
        content.innerHTML = `
          <div class="order-message" role="status">
            <h4>No order is available</h4>
            <p>No complaint or order was found for ID "${this.escapeHtml(id)}". Check the ID and try again.</p>
          </div>
        `;
        return;
      }

      const escalation = (complaint.timeline || []).slice().reverse()
        .find(item => item.status === 'Escalated');
      if (!isDistrictReview && !escalation) {
        content.innerHTML = `
          <div class="order-message" role="status">
            <h4>No order is available</h4>
            <p>Complaint ${this.escapeHtml(complaint.id)} does not have a District Authority escalation order.</p>
          </div>
        `;
        return;
      }

      const location = [
        complaint.landmark,
        complaint.ward,
        complaint.village,
        complaint.gpsCoordinates
      ].filter(Boolean).join(', ') || 'Location not provided';
      const reviewDirective = isDistrictReview
        ? complaint.districtReviewReason
        : escalation.note;
      const reviewIssuer = isDistrictReview ? complaint.source : escalation.actor;
      const orderTimestamp = isDistrictReview
        ? (complaint.forwardedAt || complaint.districtReviewReceivedAt)
        : escalation.timestamp;
      const timeline = (complaint.timeline || []).map(item => `
        <li class="order-timeline-item">
          <div>
            <strong>${this.escapeHtml(item.status || 'Update')}</strong>
            <span>${this.escapeHtml(item.actor || 'System')}</span>
          </div>
          <time>${this.escapeHtml(this.formatDate(item.timestamp) || 'Timestamp unavailable')}</time>
          ${item.note ? `<p>${this.escapeHtml(item.note)}</p>` : ''}
        </li>
      `).join('');
      const evidence = (complaint.evidence || []).map(item => `
        <a class="evidence-thumbnail" href="${this.escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
          <img src="${this.escapeHtml(item.url)}" alt="${this.escapeHtml(`${item.type || 'Complaint'} evidence`)}">
          <span>${this.escapeHtml(item.type || 'Evidence')}</span>
        </a>
      `).join('');

      content.innerHTML = `
        <div class="order-summary">
          <div class="order-complaint-heading">
            <span class="id-badge">${this.escapeHtml(complaint.id)}</span>
            <span class="status-pill ${this.getStatusClass(complaint.status)}">${this.escapeHtml(this.getStatusLabel(complaint.status))}</span>
          </div>
          <p>${this.escapeHtml(complaint.description || 'No description provided.')}</p>
        </div>
        <div class="dossier-grid">
          <div class="dossier-field">
            <span class="label">Location</span>
            <span class="value">${this.escapeHtml(location)}</span>
          </div>
          <div class="dossier-field">
            <span class="label">Assigned Department</span>
            <span class="value">${this.escapeHtml(complaint.assignedDepartment || 'Pending Assignment')}</span>
          </div>
          <div class="dossier-field">
            <span class="label">Assigned Officer</span>
            <span class="value">${this.escapeHtml(complaint.assignedOfficer || 'Unassigned')}</span>
          </div>
          <div class="dossier-field">
            <span class="label">Officer Contact</span>
            <span class="value">${this.escapeHtml(complaint.officerContact || 'Not provided')}</span>
          </div>
          <div class="dossier-field">
            <span class="label">Complaint Filed</span>
            <span class="value">${this.escapeHtml(this.formatDate(complaint.createdAt) || 'Timestamp unavailable')}</span>
          </div>
          <div class="dossier-field">
            <span class="label">${isDistrictReview ? 'Forwarded for Review' : 'Order Issued'}</span>
            <span class="value">${this.escapeHtml(isDistrictReview
              ? this.formatForwardedAt(complaint)
              : (this.formatDate(orderTimestamp) || 'Timestamp unavailable'))}</span>
          </div>
          ${isDistrictReview ? `
            <div class="dossier-field">
              <span class="label">Source</span>
              <span class="value">${this.escapeHtml(complaint.source || 'Unknown')}</span>
            </div>
          ` : ''}
        </div>
        <section class="order-directive">
          <h4>${isDistrictReview ? 'Reason for District Review' : 'District Authority Directive'}</h4>
          <p>${this.escapeHtml(reviewDirective || 'No directive details were recorded.')}</p>
          <span>${isDistrictReview ? 'Forwarded by' : 'Issued by'} ${this.escapeHtml(reviewIssuer || 'District Authority')}</span>
        </section>
        ${isDistrictReview && complaint.districtAuthorityRemarks ? `
          <section class="order-directive">
            <h4>District Authority Review Remarks</h4>
            <p>${this.escapeHtml(complaint.districtAuthorityRemarks)}</p>
            <span>Escalated ${this.escapeHtml(this.formatDate(complaint.districtEscalatedAt) || 'Timestamp unavailable')}</span>
          </section>
        ` : ''}
        <section>
          <h4 class="order-timeline-heading">Complaint Evidence</h4>
          ${evidence
            ? `<div class="order-evidence-list">${evidence}</div>`
            : '<p>No evidence photos are attached to this complaint.</p>'}
        </section>
        <section>
          <h4 class="order-timeline-heading">Complaint and Order Timestamps</h4>
          ${timeline
            ? `<ol class="order-timeline">${timeline}</ol>`
            : '<p>No status timestamps are available for this complaint.</p>'}
        </section>
      `;
    } catch (error) {
      content.innerHTML = `
        <div class="order-message order-message-error" role="alert">
          <h4>Unable to load order details</h4>
          <p>${this.escapeHtml(error.message || 'The order details request failed. Please try again.')}</p>
        </div>
      `;
    }
  }

  async loadDistrictReviews() {
    if (!window.dataStore.authUser || window.dataStore.authUser.role !== 'DISTRICT_AUTHORITY') {
      this.showToast('Sign in with a District Authority account to view pending reviews.', 'error');
      return;
    }
    await this.renderDistrictReviewQueue();
  }

  async renderDistrictReviewQueue() {
    const list = document.getElementById('district-review-list');
    const count = document.getElementById('district-review-count');
    if (!list) return;
    const user = window.dataStore.authUser;
    if (!user || !['ADMIN', 'DISTRICT_AUTHORITY'].includes(user.role)) {
      if (count) count.textContent = 'Sign in required';
      list.textContent = 'Sign in with an ADMIN account to view District Authority reviews.';
      return;
    }

    try {
      const reviews = await window.dataStore.getDistrictReviews();
      if (count) count.textContent = `${reviews.length} Pending Review${reviews.length === 1 ? '' : 's'}`;
      if (reviews.length === 0) {
        list.innerHTML = '<p class="empty-queue-message">There are no complaints awaiting District Authority review.</p>';
        return;
      }
      list.innerHTML = reviews.map(complaint => `
        <article class="district-review-item">
          <div class="district-review-item-main">
            <div class="order-complaint-heading">
              <span class="id-badge">${this.escapeHtml(complaint.id)}</span>
              <span class="status-pill status-forwarded">FORWARDED TO DISTRICT</span>
              <span class="status-pill ${complaint.priority === 'High' ? 'status-high-priority' : ''}">${this.escapeHtml(complaint.priority || 'Unspecified')} PRIORITY</span>
            </div>
            <h4>${this.escapeHtml(complaint.title)}</h4>
            <p>${this.escapeHtml(complaint.category)} | ${this.escapeHtml(complaint.assignedDepartment)}</p>
            <p><strong>Submitted:</strong> ${this.escapeHtml(this.formatDate(complaint.createdAt) || 'Timestamp unavailable')} | <strong>Forwarded:</strong> ${this.escapeHtml(this.formatForwardedAt(complaint))}</p>
            <p><strong>Source:</strong> ${this.escapeHtml(complaint.source || 'Unknown')}</p>
            <p><strong>Review reason:</strong> ${this.escapeHtml(complaint.districtReviewReason || 'No reason provided.')}</p>
          </div>
          <div class="district-review-actions">
            <button type="button" class="btn-dash-outline" onclick="app.viewOrder('${this.escapeHtml(complaint.id)}', true)">View Order</button>
            <button type="button" class="btn-escalate-action" onclick="app.openReturnToVillageModal('${this.escapeHtml(complaint.id)}')">Escalate to Grama Sachivalayam</button>
          </div>
        </article>
      `).join('');
    } catch (error) {
      if (count) count.textContent = 'Reviews unavailable';
      list.innerHTML = `<p class="order-message-error" role="alert">${this.escapeHtml(error.message)}</p>`;
    }
  }

  updateDistrictDashboardStats(complaints) {
    const districtComplaints = complaints.filter(complaint =>
      complaint.forwardedAt || complaint.districtReviewReceivedAt
    );
    const counts = {
      total: complaints.length,
      pending: districtComplaints.filter(complaint => complaint.status === 'FORWARDED_TO_DISTRICT').length,
      escalated: districtComplaints.filter(complaint =>
        complaint.status === 'DISTRICT_ESCALATED' || complaint.status === 'URGENT_ESCALATION'
      ).length,
      resolved: complaints.filter(complaint => complaint.status === 'Resolved').length,
      overdue: complaints.filter(complaint => complaint.isOverdue && complaint.status !== 'Resolved').length
    };
    const values = {
      'district-total-count': counts.total,
      'district-pending-count': counts.pending,
      'district-escalated-count': counts.escalated,
      'district-resolved-count': counts.resolved,
      'auth-breach-count': counts.overdue
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  renderDistrictComplaints(complaints) {
    const tbody = document.getElementById('district-complaints-tbody');
    if (!tbody) return;
    const districtComplaints = complaints
      .filter(complaint => complaint.forwardedAt || complaint.districtReviewReceivedAt)
      .sort((a, b) => {
        const aTime = Date.parse(a.forwardedAt || a.districtReviewReceivedAt) || 0;
        const bTime = Date.parse(b.forwardedAt || b.districtReviewReceivedAt) || 0;
        return bTime - aTime;
      });

    if (districtComplaints.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-queue-message">No complaints have been forwarded to District Authority.</td></tr>';
      return;
    }

    tbody.innerHTML = districtComplaints.map(complaint => `
      <tr>
        <td><span class="id-badge">${this.escapeHtml(complaint.id)}</span></td>
        <td>
          <strong>${this.escapeHtml(complaint.title || 'Untitled complaint')}</strong>
          ${complaint.isHackathonSample ? '<p class="sample-data-label">SAMPLE / HACKATHON TEST DATA</p>' : ''}
        </td>
        <td>${this.escapeHtml([complaint.village, complaint.landmark || complaint.ward].filter(Boolean).join(' • ') || 'Location unavailable')}</td>
        <td>${this.escapeHtml(complaint.assignedDepartment || 'Pending Assignment')}</td>
        <td>${this.escapeHtml(complaint.priority || 'Unspecified')}</td>
        <td>${this.escapeHtml(this.formatDate(complaint.createdAt) || 'Timestamp unavailable')}</td>
        <td>${this.escapeHtml(this.formatForwardedAt(complaint))}</td>
        <td>${this.escapeHtml(complaint.assignedOfficer || 'Unassigned')}</td>
        <td>
          <span class="status-pill ${this.getStatusClass(complaint.status)}">${this.escapeHtml(this.getStatusLabel(complaint.status))}</span>
          ${complaint.urgentEscalation && complaint.urgentEscalation.deadlineAt
            ? `<p class="district-resolution-deadline">24h deadline: ${this.escapeHtml(this.formatDate(complaint.urgentEscalation.deadlineAt))}</p>`
            : ''}
        </td>
        <td>
          <button type="button" class="btn-dash-outline" onclick="app.viewOrder('${this.escapeHtml(complaint.id)}', true)">View Order</button>
        </td>
      </tr>
    `).join('');
  }

  openForwardToDistrictModal(id) {
    const user = window.dataStore.authUser;
    if (!user || user.role !== 'GRAMA_SACHIVALAYAM') {
      this.showToast('Sign in with a Grama Sachivalayam account before forwarding a complaint.', 'error');
      return;
    }
    this.activeActionComplaintId = id;
    const reason = document.getElementById('district-forward-reason');
    if (reason) reason.value = '';
    this.openModal('modal-forward-to-district');
  }

  async confirmForwardToDistrict() {
    if (!this.activeActionComplaintId) return;
    const reasonInput = document.getElementById('district-forward-reason');
    const reason = reasonInput ? reasonInput.value.trim() : '';
    if (!reason) {
      this.showToast('Enter a reason before forwarding this complaint.', 'warning');
      return;
    }

    try {
      await window.dataStore.forwardComplaintToDistrict(this.activeActionComplaintId, reason);
      this.closeModal('modal-forward-to-district');
      this.showToast('Complaint forwarded to District Authority for review.', 'success');
      await this.refreshAllViews();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  openReturnToVillageModal(id) {
    const user = window.dataStore.authUser;
    if (!user || !['DISTRICT_AUTHORITY', 'ADMIN'].includes(user.role)) {
      this.showToast('Sign in with a District Authority account before returning a review.', 'error');
      return;
    }
    this.activeActionComplaintId = id;
    const instructions = document.getElementById('district-return-instructions');
    if (instructions) {
      instructions.value = '';
    }
    this.openModal('modal-return-to-village');
  }

  async confirmReturnToVillage() {
    if (!this.activeActionComplaintId) return;
    const instructionsInput = document.getElementById('district-return-instructions');
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    if (!instructions) {
      this.showToast('Enter District Authority instructions before escalation.', 'warning');
      return;
    }

    try {
      const complaint = await window.dataStore.returnDistrictReview(
        this.activeActionComplaintId,
        instructions
      );
      this.closeModal('modal-return-to-village');
      this.showToast(`Complaint returned to Grama Sachivalayam with a 24-hour deadline.`, 'success');
      await this.refreshAllViews();
      return complaint;
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async loadOfficialUrgentEscalations() {
    if (!window.dataStore.authUser || window.dataStore.authUser.role !== 'GRAMA_SACHIVALAYAM') {
      this.showToast('Sign in with a Grama Sachivalayam account to view urgent returns.', 'error');
      return;
    }
    await this.renderOfficialUrgentEscalations();
  }

  async renderOfficialUrgentEscalations() {
    const list = document.getElementById('official-urgent-list');
    const count = document.getElementById('official-urgent-count');
    if (!list) return;
    const user = window.dataStore.authUser;
    if (!user || user.role !== 'GRAMA_SACHIVALAYAM') {
      if (count) count.textContent = 'Authentication required';
      list.textContent = 'Sign in with an officer account to view department-appropriate urgent escalations.';
      return;
    }

    try {
      const complaints = await window.dataStore.getUrgentEscalations();
      if (count) count.textContent = `${complaints.length} Urgent Return${complaints.length === 1 ? '' : 's'}`;
      if (complaints.length === 0) {
        list.innerHTML = '<p class="empty-queue-message">There are no open District Authority returns for this department.</p>';
        return;
      }
      list.innerHTML = complaints.map(complaint => `
        <article class="urgent-escalation-item">
          <div class="order-complaint-heading">
            <span class="id-badge">${this.escapeHtml(complaint.id)}</span>
            <span class="status-pill status-urgent">24-HOUR DISTRICT ESCALATION</span>
          </div>
          <h4>${this.escapeHtml(complaint.title)}</h4>
          <p>${this.escapeHtml(complaint.description)}</p>
          <p><strong>Department:</strong> ${this.escapeHtml(complaint.assignedDepartment)}</p>
          <p><strong>District instructions:</strong> ${this.escapeHtml(complaint.urgentEscalation.instructions)}</p>
          <p><strong>Deadline:</strong> ${this.escapeHtml(this.formatDate(complaint.urgentEscalation.deadlineAt))}</p>
          <button type="button" class="btn-dash-outline" onclick="app.openOfficialActionModal('${this.escapeHtml(complaint.id)}')">Review Urgent Escalation</button>
        </article>
      `).join('');
    } catch (error) {
      if (count) count.textContent = 'Escalations unavailable';
      list.innerHTML = `<p class="order-message-error" role="alert">${this.escapeHtml(error.message)}</p>`;
    }
  }

  openEscalateModal(id) {
    this.activeActionComplaintId = id;
    const directiveInput = document.getElementById('escalate-directive-text');
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    if (directiveInput) {
      directiveInput.value = i18n.getLanguage() === 'te'
        ? 'జిల్లా కలెక్టర్ వారి అత్యవసర ఆదేశాలు: 24 గంటలలోపు ప్రత్యేక ఫీల్డ్ బృందాన్ని పంపి సమస్యను పరిష్కరించి సాయంత్రం 5 గంటలలోపు నివేదిక సమర్పించాలి.'
        : 'Emergency directive issued by District Collector. Dispatch emergency engineering unit within 24 hours. Submit compliance report by 5 PM.';
    }
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    this.openModal('modal-escalate');
  }

  async confirmEscalateAction() {
    if (!this.activeActionComplaintId) return;

    const directiveInput = document.getElementById('escalate-directive-text');
    const directive = directiveInput ? directiveInput.value.trim() : 'Collectorate Escalation Mandate';
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    if (!username || !password) {
      this.showToast(i18n.t('adminLoginRequired'), 'error');
      return;
    }

    try {
      const login = await window.dataStore.login(username, password);
      if (passwordInput) passwordInput.value = '';
      if (login.user.role !== 'ADMIN') {
        this.showToast(i18n.t('adminLoginRequired'), 'error');
        return;
      }
      await window.dataStore.escalateComplaint(
        this.activeActionComplaintId,
        directive,
        login.accessToken
      );

      this.closeModal('modal-escalate');
      this.showToast(`Collector Executive Order issued for ${this.activeActionComplaintId}!`, 'error');

      this.renderAuthorityConsole();
      this.refreshAllViews();
      if (this.currentActiveComplaintId === this.activeActionComplaintId) {
        this.renderTrackingDossier(this.currentActiveComplaintId);
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  /* ==========================================================================
     SCREEN 5: VILLAGE TRANSPARENCY PAGE
     ========================================================================== */
  async renderTransparencyPage() {
    const stats = await window.dataStore.getStats();
    const complaints = (await window.dataStore.getAllComplaints())
      .filter(complaint => !complaint.isHackathonSample);

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
    await this.renderOfficialUrgentEscalations();
    await this.renderAuthorityConsole();
    await this.renderTransparencyPage();
  }

  async confirmResetData() {
    if (confirm('Restore complaint records to their initial state?')) {
      try {
        await window.dataStore.resetData();
        this.currentActiveComplaintId = 'PP-2025-RD-1042';
        this.renderTrackingDossier(this.currentActiveComplaintId);
        this.showToast('Complaint records restored to their initial state.', 'success');
      } catch (error) {
        this.showToast(error.message, 'error');
      }
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
      case 'FORWARDED_TO_DISTRICT': return 'status-forwarded';
      case 'DISTRICT_ESCALATED':
      case 'URGENT_ESCALATION': return 'status-urgent';
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
      case 'FORWARDED_TO_DISTRICT': return 'Forwarded to District';
      case 'DISTRICT_ESCALATED': return 'Escalated to Grama Sachivalayam';
      case 'URGENT_ESCALATION': return 'Urgent Grama Sachivalayam Action (24h)';
      default: return status;
    }
  }

  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short'
    });
  }

  formatForwardedAt(complaint) {
    const forwardedAt = complaint.forwardedAt || complaint.districtReviewReceivedAt;
    if (!forwardedAt) return 'Not recorded';
    const forwardedTime = Date.parse(forwardedAt);
    const createdTime = Date.parse(complaint.createdAt);
    if (!Number.isFinite(forwardedTime) || forwardedTime === createdTime) {
      return 'Not recorded (legacy complaint)';
    }
    return this.formatDate(forwardedAt) || 'Timestamp unavailable';
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
