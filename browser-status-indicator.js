// Browser Status Indicator - Native browser integration
class BrowserStatusIndicator {
  constructor() {
    this.currentPageData = null;
    this.statusElement = null;
    this.warningBanner = null;
    this.interstitial = null;
    this.alternativesPanel = null;
    this.userSettings = null;
    this.bannerDismissed = false;
    this.interstitialShown = false;
    this.continueCountdownInterval = null;
    this.init();
  }

  async init() {
    // Check if status indicators are enabled
    const enabled = await this.checkIfEnabled();
    if (!enabled) return;

    // Load user settings for warning preferences
    await this.loadUserSettings();

    // Get page data from background script
    this.getPageData();
    // Get weekly summary from background script
    this.getWeeklySummary();

    // Create and inject the status indicator
    this.createStatusIndicator();

    // Create warning components
    this.createWarningBanner();
    this.createInterstitialOverlay();

    // Listen for page changes
    this.setupPageChangeListener();
  }

  async loadUserSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getUserData'
      });
      this.userSettings = response?.userData?.settings || {};
    } catch (error) {
      console.error('Error loading user settings:', error);
      this.userSettings = {};
    }
  }

  createWarningBanner() {
    this.warningBanner = document.createElement('div');
    this.warningBanner.id = 'mindset-warning-banner';
    this.warningBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 12px 20px;
      background: linear-gradient(90deg, #FFA726 0%, #FF7043 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: none;
      align-items: center;
      justify-content: space-between;
      z-index: 999998;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(this.warningBanner);
  }

  createInterstitialOverlay() {
    this.interstitial = document.createElement('div');
    this.interstitial.id = 'mindset-interstitial';
    this.interstitial.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      color: white;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      text-align: center;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(this.interstitial);
  }

  determineWarningLevel(pageData) {
    if (!pageData) return 0;

    const { credibility, politicalBias, category } = pageData;
    const interventionLevel = this.userSettings?.interventionLevel || 'balanced';

    // Check if warnings are disabled
    if (interventionLevel === 'minimal') {
      return 0; // Only status bar, no warnings
    }

    // Tier 3: Interstitial (very low credibility or dangerous categories)
    if (this.userSettings?.enableInterstitials !== false) {
      if (credibility !== null && credibility < 3) return 3;
      if (['conspiracy', 'state-media'].includes(category)) return 3;
    }

    // Tier 2: Banner (low credibility or extreme bias)
    if (this.userSettings?.showCredibilityWarnings !== false) {
      if (credibility !== null && credibility < 5) return 2;
    }
    if (this.userSettings?.showBiasWarnings !== false) {
      if (['far-left', 'far-right'].includes(politicalBias)) return 2;
    }

    // Tier 1: Enhanced status bar (moderate concerns) - only in strict mode
    if (interventionLevel === 'strict') {
      if (this.userSettings?.showCredibilityWarnings !== false) {
        if (credibility !== null && credibility < 6) return 1;
      }
      if (this.userSettings?.showBiasWarnings !== false) {
        if (['left', 'right'].includes(politicalBias)) return 1;
      }
    }

    // No warning needed
    return 0;
  }

  async showWarnings(pageData) {
    const warningLevel = this.determineWarningLevel(pageData);

    // Reset states for new page
    this.bannerDismissed = false;
    this.hideWarningBanner();
    this.hideInterstitial();

    if (warningLevel === 0) return;

    // Get alternative sources
    const alternatives = await this.getAlternatives(pageData);

    switch (warningLevel) {
      case 1:
        // Tier 1: Enhanced status bar only (handled in addVisualIndicators)
        this.enhanceStatusBarWarning(pageData);
        break;
      case 2:
        // Tier 2: Warning banner
        this.showWarningBanner(pageData, alternatives);
        break;
      case 3:
        // Tier 3: Interstitial
        if (!this.interstitialShown) {
          this.showInterstitial(pageData, alternatives);
          this.interstitialShown = true;
        }
        break;
    }
  }

  enhanceStatusBarWarning(pageData) {
    if (!this.statusElement) return;
    this.statusElement.style.borderTop = '3px solid #FF9800';
    this.statusElement.style.background = 'linear-gradient(90deg, rgba(255,152,0,0.2) 0%, rgba(0,0,0,0.8) 100%)';
  }

  async getAlternatives(pageData) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAlternativeSources',
        currentBias: pageData.politicalBias,
        category: pageData.category
      });
      return response?.alternatives || [];
    } catch (error) {
      console.error('Error getting alternatives:', error);
      return [];
    }
  }

  showWarningBanner(pageData, alternatives) {
    if (this.bannerDismissed) return;

    const { credibility, politicalBias, sourceName, category } = pageData;

    let message = '';
    let icon = '⚠️';

    if (credibility !== null && credibility < 5) {
      message = `${sourceName || 'This source'} has a credibility rating of ${credibility}/10.`;
    } else if (['far-left', 'far-right'].includes(politicalBias)) {
      const direction = politicalBias.includes('left') ? 'left' : 'right';
      message = `${sourceName || 'This source'} has a strong ${direction}-leaning perspective.`;
      icon = politicalBias.includes('left') ? '🔵' : '🔴';
    }

    this.warningBanner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 20px;">${icon}</span>
        <span>${message} Consider checking other sources.</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="mindset-see-alternatives" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.4);
          color: white;
          padding: 6px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        ">See Other Perspectives</button>
        <button id="mindset-dismiss-banner" style="
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        ">Dismiss</button>
      </div>
    `;

    this.warningBanner.style.display = 'flex';
    this.setupBannerListeners(alternatives, pageData);

    // Adjust status indicator position
    if (this.statusElement) {
      this.statusElement.style.marginTop = '50px';
    }
  }

  setupBannerListeners(alternatives, pageData) {
    const alternativesBtn = document.getElementById('mindset-see-alternatives');
    const dismissBtn = document.getElementById('mindset-dismiss-banner');

    if (alternativesBtn) {
      alternativesBtn.addEventListener('click', () => {
        this.showAlternativesPanel(alternatives, pageData.sourceName || pageData.domain);
      });
      alternativesBtn.addEventListener('mouseover', () => {
        alternativesBtn.style.background = 'rgba(255,255,255,0.3)';
      });
      alternativesBtn.addEventListener('mouseout', () => {
        alternativesBtn.style.background = 'rgba(255,255,255,0.2)';
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.hideWarningBanner();
        this.bannerDismissed = true;
      });
      dismissBtn.addEventListener('mouseover', () => {
        dismissBtn.style.background = 'rgba(255,255,255,0.1)';
      });
      dismissBtn.addEventListener('mouseout', () => {
        dismissBtn.style.background = 'transparent';
      });
    }
  }

  hideWarningBanner() {
    if (this.warningBanner) {
      this.warningBanner.style.display = 'none';
    }
    if (this.statusElement) {
      this.statusElement.style.marginTop = '0';
    }
  }

  showInterstitial(pageData, alternatives) {
    const { credibility, sourceName, category } = pageData;

    let title = 'Caution: Low Credibility Source';
    let description = '';
    let iconEmoji = '⚠️';

    if (category === 'conspiracy') {
      title = 'Warning: Known Misinformation Source';
      description = 'This website frequently publishes unverified claims and conspiracy theories.';
      iconEmoji = '🚫';
    } else if (category === 'state-media') {
      title = 'Notice: State-Controlled Media';
      description = 'This source is controlled by a government and may present a biased perspective.';
      iconEmoji = '🏛️';
    } else {
      description = `This source has a credibility rating of ${credibility}/10 based on fact-checking accuracy and editorial standards.`;
    }

    this.interstitial.innerHTML = `
      <div style="max-width: 500px;">
        <div style="font-size: 64px; margin-bottom: 20px;">${iconEmoji}</div>
        <h2 style="font-size: 28px; margin-bottom: 16px; font-weight: 600;">${title}</h2>
        <p style="font-size: 16px; opacity: 0.9; margin-bottom: 24px; line-height: 1.6;">${description}</p>
        <p style="font-size: 14px; opacity: 0.7; margin-bottom: 30px;">
          Consider fact-checking claims on this site with reputable sources.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 300px; margin: 0 auto;">
          <button id="mindset-see-alternatives-interstitial" style="
            background: #4CAF50;
            border: none;
            color: white;
            padding: 14px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            transition: background 0.2s;
          ">See Balanced Alternatives</button>
          <button id="mindset-continue-anyway" style="
            background: transparent;
            border: 2px solid rgba(255,255,255,0.3);
            color: rgba(255,255,255,0.7);
            padding: 14px 24px;
            border-radius: 8px;
            cursor: not-allowed;
            font-size: 15px;
            transition: all 0.2s;
          " disabled>Continue to Site (5s)</button>
          <button id="mindset-go-back" style="
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.5);
            padding: 10px 24px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: underline;
            transition: color 0.2s;
          ">Go Back</button>
        </div>
      </div>
    `;

    this.interstitial.style.display = 'flex';
    this.setupInterstitialListeners(alternatives, pageData);
    this.startContinueCountdown();
  }

  setupInterstitialListeners(alternatives, pageData) {
    const alternativesBtn = document.getElementById('mindset-see-alternatives-interstitial');
    const continueBtn = document.getElementById('mindset-continue-anyway');
    const goBackBtn = document.getElementById('mindset-go-back');

    if (alternativesBtn) {
      alternativesBtn.addEventListener('click', () => {
        this.hideInterstitial();
        this.showAlternativesPanel(alternatives, pageData.sourceName || pageData.domain);
      });
      alternativesBtn.addEventListener('mouseover', () => {
        alternativesBtn.style.background = '#45a049';
      });
      alternativesBtn.addEventListener('mouseout', () => {
        alternativesBtn.style.background = '#4CAF50';
      });
    }

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (!continueBtn.disabled) {
          this.hideInterstitial();
        }
      });
    }

    if (goBackBtn) {
      goBackBtn.addEventListener('click', () => {
        window.history.back();
      });
      goBackBtn.addEventListener('mouseover', () => {
        goBackBtn.style.color = 'rgba(255,255,255,0.8)';
      });
      goBackBtn.addEventListener('mouseout', () => {
        goBackBtn.style.color = 'rgba(255,255,255,0.5)';
      });
    }
  }

  startContinueCountdown() {
    let countdown = 5;
    const continueBtn = document.getElementById('mindset-continue-anyway');

    if (this.continueCountdownInterval) {
      clearInterval(this.continueCountdownInterval);
    }

    this.continueCountdownInterval = setInterval(() => {
      countdown--;
      if (continueBtn) {
        if (countdown > 0) {
          continueBtn.textContent = `Continue to Site (${countdown}s)`;
        } else {
          continueBtn.textContent = 'Continue to Site';
          continueBtn.disabled = false;
          continueBtn.style.cursor = 'pointer';
          continueBtn.style.borderColor = 'rgba(255,255,255,0.5)';
          continueBtn.style.color = 'white';
          clearInterval(this.continueCountdownInterval);
        }
      }
    }, 1000);
  }

  hideInterstitial() {
    if (this.interstitial) {
      this.interstitial.style.display = 'none';
    }
    if (this.continueCountdownInterval) {
      clearInterval(this.continueCountdownInterval);
    }
  }

  showAlternativesPanel(alternatives, currentSource) {
    // Remove existing panel if any
    const existingPanel = document.getElementById('mindset-alternatives-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    this.alternativesPanel = document.createElement('div');
    this.alternativesPanel.id = 'mindset-alternatives-panel';
    this.alternativesPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      color: #333;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 99999999;
      max-width: 450px;
      width: 90%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const alternativesList = alternatives.length > 0
      ? alternatives.map(alt => `
          <a href="https://${alt.domain}" target="_blank" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #f8f9fa;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            margin-bottom: 8px;
            transition: background 0.2s;
          " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
            <div style="flex: 1;">
              <span style="font-weight: 500; display: block;">${alt.name}</span>
              <span style="font-size: 12px; color: #666;">${this.formatBias(alt.bias)}</span>
            </div>
            <div style="
              background: ${this.getCredibilityBadgeColor(alt.credibility)};
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              flex-shrink: 0;
            ">${alt.credibility}/10</div>
          </a>
        `).join('')
      : '<p style="text-align: center; color: #666; padding: 20px 0;">No alternatives available for this category.</p>';

    this.alternativesPanel.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Balance Your Perspective</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">You're reading ${currentSource}. Here are other viewpoints:</p>
      </div>
      <div style="margin-bottom: 16px;">
        ${alternativesList}
      </div>
      <button id="mindset-close-alternatives" style="
        width: 100%;
        padding: 12px;
        background: #667EEA;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      ">Close</button>
    `;

    // Add overlay backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'mindset-alternatives-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99999998;
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(this.alternativesPanel);

    // Setup close listeners
    const closeBtn = document.getElementById('mindset-close-alternatives');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideAlternativesPanel());
      closeBtn.addEventListener('mouseover', () => closeBtn.style.background = '#5a67d8');
      closeBtn.addEventListener('mouseout', () => closeBtn.style.background = '#667EEA');
    }

    backdrop.addEventListener('click', () => this.hideAlternativesPanel());
  }

  hideAlternativesPanel() {
    const panel = document.getElementById('mindset-alternatives-panel');
    const backdrop = document.getElementById('mindset-alternatives-backdrop');
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();
  }

  formatBias(bias) {
    const biasLabels = {
      'far-left': '⬅️ Far Left',
      'left': '↙️ Left',
      'left-center': '◀️ Left-Center',
      'center': '⚖️ Center',
      'right-center': '▶️ Right-Center',
      'right': '↗️ Right',
      'far-right': '➡️ Far Right',
      'varies': '🔄 Varies',
      'unknown': '❓ Unknown'
    };
    return biasLabels[bias] || bias;
  }

  getCredibilityBadgeColor(credibility) {
    if (credibility >= 8) return '#4CAF50';
    if (credibility >= 6) return '#FF9800';
    return '#F44336';
  }

  async checkIfEnabled() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getUserData'
      });
      
      return response?.userData?.settings?.tabIndicators !== false;
    } catch (error) {
      console.error('Error checking status indicators setting:', error);
      return true; // Default to enabled
    }
  }

  async getPageData() {
    try {
      // Reset interstitial flag for new page
      this.interstitialShown = false;

      // Extract basic page info
      const pageInfo = {
        domain: window.location.hostname,
        path: window.location.pathname,
        title: document.title,
        url: window.location.href
      };

      // Send to background script for analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzePageForTab',
        pageInfo: pageInfo
      });

      if (response && response.pageData) {
        this.currentPageData = response.pageData;
        this.updateStatusIndicator();

        // Show warnings based on page data
        await this.showWarnings(response.pageData);
      }
    } catch (error) {
      console.error('Error getting page data for status indicator:', error);
    }
  }

  async getWeeklySummary() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getWeekData' });
      if (response && response.weekData) {
        this.weeklyData = response.weekData;
        this.updateStatusIndicator();
      }
    } catch (error) {
      console.error('Error getting weekly summary:', error);
    }
  }

  createStatusIndicator() {
    // Create status indicator element
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'mindset-status-indicator';
    this.statusElement.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      min-height: 38px;
      background: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.1);
    `;

    // Add rows for short-term and long-term feedback
    this.shortTermRow = document.createElement('div');
    this.shortTermRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin: 2px 0;';
    this.longTermRow = document.createElement('div');
    this.longTermRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin: 2px 0; opacity: 0.85; font-size: 10px;';

    this.statusElement.appendChild(this.shortTermRow);
    this.statusElement.appendChild(this.longTermRow);
    document.body.appendChild(this.statusElement);
    
    // Show indicator after a short delay
    setTimeout(() => {
      if (this.statusElement) {
        this.statusElement.style.opacity = '1';
      }
    }, 1000);
    
    // Initial state
    this.updateStatusIndicator();
  }

  updateStatusIndicator() {
    // Short-term (current page)
    const data = this.currentPageData || this.getDefaultData();
    this.shortTermRow.innerHTML = this.getShortTermText(data);
    this.shortTermRow.title = this.getShortTermTooltip(data);

    // Long-term (weekly summary)
    const week = this.weeklyData;
    this.longTermRow.innerHTML = week ? this.getLongTermText(week) : '<span style="color:#bbb;">Loading weekly summary...</span>';
    this.longTermRow.title = week ? this.getLongTermTooltip(week) : '';
    
    // Visual indicators
    this.addVisualIndicators(data);
  }

  getShortTermText(data) {
    const { category, credibility, politicalBias, tone } = data;
    const biasText = politicalBias === 'liberal' ? '🔵 Liberal' : politicalBias === 'conservative' ? '🔴 Conservative' : politicalBias === 'centrist' ? '🟡 Centrist' : '⚪ Unknown';
    const toneText = tone === 'uplifting' ? '😊 Uplifting' : tone === 'cynical' ? '😔 Cynical' : '😐 Neutral';
    return `<span style="margin-right:8px;"><span style="color:#64B5F6;">📄</span> ${category.charAt(0).toUpperCase() + category.slice(1)}</span><span style="margin-right:8px;"><span style="color:${this.getCredibilityColor(credibility)};">🔍</span> ${credibility.toFixed(1)}/10</span><span style="margin-right:8px;"><span style="color:#9C27B0;">🏛️</span> ${biasText}</span><span><span style="color:#FFB74D;">💭</span> ${toneText}</span>`;
  }

  getShortTermTooltip(data) {
    return `This page: ${data.politicalBias} bias, ${data.tone} tone.`;
  }

  getLongTermText(week) {
    // Calculate bias/tone breakdowns
    const visits = week.visits || [];
    const biasCounts = { liberal: 0, conservative: 0, centrist: 0, unknown: 0 };
    const toneCounts = { cynical: 0, uplifting: 0, neutral: 0 };
    visits.forEach(v => { biasCounts[v.politicalBias] = (biasCounts[v.politicalBias]||0)+1; toneCounts[v.tone] = (toneCounts[v.tone]||0)+1; });
    const total = visits.length || 1;
    const biasPct = k => Math.round((biasCounts[k]||0)/total*100);
    const tonePct = k => Math.round((toneCounts[k]||0)/total*100);
    return `<span style="margin-right:8px;">This week: <span style="color:#2196F3;">🔵</span> ${biasPct('liberal')}% <span style="color:#FF9800;">🟡</span> ${biasPct('centrist')}% <span style="color:#F44336;">🔴</span> ${biasPct('conservative')}%</span><span style="margin-right:8px;"> <span style="color:#FFB74D;">😊</span> ${tonePct('uplifting')}% <span style="color:#aaa;">😐</span> ${tonePct('neutral')}% <span style="color:#607D8B;">😔</span> ${tonePct('cynical')}%</span>`;
  }

  getLongTermTooltip(week) {
    return `This week: ${week.visits.length} pages\nLiberal: ${week.visits.filter(v=>v.politicalBias==='liberal').length}\nConservative: ${week.visits.filter(v=>v.politicalBias==='conservative').length}\nCentrist: ${week.visits.filter(v=>v.politicalBias==='centrist').length}\nUplifting: ${week.visits.filter(v=>v.tone==='uplifting').length}\nCynical: ${week.visits.filter(v=>v.tone==='cynical').length}`;
  }

  getCredibilityColor(credibility) {
    if (credibility >= 8.0) return '#4CAF50'; // Green
    if (credibility >= 6.0) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }

  addVisualIndicators(data) {
    // Add subtle visual indicators
    if (data.credibility < 6.0) {
      this.statusElement.style.borderTop = '2px solid #F44336';
    } else if (data.credibility >= 8.0) {
      this.statusElement.style.borderTop = '2px solid #4CAF50';
    } else {
      this.statusElement.style.borderTop = '2px solid #FF9800';
    }
  }

  getDefaultData() {
    return {
      category: 'unknown',
      credibility: 5.0,
      tone: 'neutral'
    };
  }

  setupPageChangeListener() {
    // Listen for navigation events
    let currentUrl = window.location.href;
    
    const checkForPageChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          this.getPageData();
        }, 1000); // Wait for page to load
      }
    };

    // Check periodically for SPA navigation
    setInterval(checkForPageChange, 2000);
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.getPageData();
      }, 1000);
    });
  }

  // Public method to update indicator from external calls
  updateFromExternal(data) {
    this.currentPageData = data;
    this.updateStatusIndicator();
  }

  // Public method to show/hide indicator
  setVisibility(visible) {
    if (this.statusElement) {
      this.statusElement.style.opacity = visible ? '1' : '0';
    }
  }
}

// Initialize browser status indicator
const browserStatusIndicator = new BrowserStatusIndicator();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateTabIndicator') {
    browserStatusIndicator.updateFromExternal(request.pageData);
    sendResponse({ success: true });
  } else if (request.action === 'setTabIndicatorVisibility') {
    browserStatusIndicator.setVisibility(request.visible);
    sendResponse({ success: true });
  }
}); 