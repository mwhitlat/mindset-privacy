// Settings script for Mindset extension
class SettingsManager {
  constructor() {
    this.userData = null;
    this.currentSection = 'privacy';
    this.init();
  }

  init() {
    this.loadData();
    this.setupEventListeners();
    this.setupRangeInputs();
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      this.goBack();
    });

    // Data management
    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
      this.showClearDataConfirmation();
    });

    // Encryption controls
    document.getElementById('dataEncryption').addEventListener('change', (e) => {
      this.handleEncryptionToggle(e.target.checked);
    });

    document.getElementById('setEncryptionPasswordBtn').addEventListener('click', () => {
      this.setEncryptionPassword();
    });

    // Form controls
    this.setupFormControls();

    // Footer links
    document.getElementById('privacyPolicyLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openPrivacyPolicy();
    });

    document.getElementById('termsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openTerms();
    });

    // Support buttons
    document.getElementById('reportIssueBtn').addEventListener('click', () => {
      this.reportIssue();
    });

    document.getElementById('featureRequestBtn').addEventListener('click', () => {
      this.requestFeature();
    });

    // Modal controls
    document.getElementById('modalClose').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('modalCancel').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('modalConfirm').addEventListener('click', () => {
      this.confirmModalAction();
    });

    // Close modal when clicking outside
    document.getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target.id === 'confirmModal') {
        this.closeModal();
      }
    });
  }

  setupFormControls() {
    // Data retention
    document.getElementById('dataRetention').addEventListener('change', (e) => {
      this.updateSetting('dataRetention', parseInt(e.target.value));
    });

    // Content analysis toggle
    document.getElementById('contentAnalysis').addEventListener('change', (e) => {
      this.updateSetting('contentAnalysis', e.target.checked);
    });

    document.getElementById('tabIndicators').addEventListener('change', (e) => {
      this.updateSetting('tabIndicators', e.target.checked);
    });

    // Time tracking toggle
    document.getElementById('timeTracking').addEventListener('change', (e) => {
      this.updateSetting('timeTracking', e.target.checked);
    });

    // Daily time limit
    document.getElementById('dailyTimeLimit').addEventListener('change', (e) => {
      this.updateSetting('dailyTimeLimit', parseFloat(e.target.value));
    });

    // Tracking hours
    document.getElementById('trackingStart').addEventListener('change', (e) => {
      this.updateSetting('trackingStart', e.target.value);
    });

    document.getElementById('trackingEnd').addEventListener('change', (e) => {
      this.updateSetting('trackingEnd', e.target.value);
    });

    // Content category toggles
    document.getElementById('trackNews').addEventListener('change', (e) => {
      this.updateSetting('trackNews', e.target.checked);
    });

    document.getElementById('trackSocial').addEventListener('change', (e) => {
      this.updateSetting('trackSocial', e.target.checked);
    });

    document.getElementById('trackEntertainment').addEventListener('change', (e) => {
      this.updateSetting('trackEntertainment', e.target.checked);
    });

    document.getElementById('trackEducational').addEventListener('change', (e) => {
      this.updateSetting('trackEducational', e.target.checked);
    });

    document.getElementById('trackProfessional').addEventListener('change', (e) => {
      this.updateSetting('trackProfessional', e.target.checked);
    });

    // Weekly report day
    document.getElementById('weeklyReportDay').addEventListener('change', (e) => {
      this.updateSetting('weeklyReportDay', parseInt(e.target.value));
    });

    // Session break time
    document.getElementById('sessionBreakTime').addEventListener('change', (e) => {
      this.updateSetting('sessionBreakTime', parseInt(e.target.value));
    });

    // Notifications
    document.getElementById('smartNotifications').addEventListener('change', (e) => {
      this.updateSetting('smartNotifications', e.target.checked);
    });

    document.getElementById('toneAlerts').addEventListener('change', (e) => {
      this.updateSetting('toneAlerts', e.target.checked);
    });

    document.getElementById('credibilityWarnings').addEventListener('change', (e) => {
      this.updateSetting('credibilityWarnings', e.target.checked);
    });

    document.getElementById('echoChamberAlerts').addEventListener('change', (e) => {
      this.updateSetting('echoChamberAlerts', e.target.checked);
    });

    document.getElementById('sessionInsights').addEventListener('change', (e) => {
      this.updateSetting('sessionInsights', e.target.checked);
    });

    document.getElementById('weeklyReportNotification').addEventListener('change', (e) => {
      this.updateSetting('weeklyReportNotification', e.target.checked);
    });

    document.getElementById('reportTime').addEventListener('change', (e) => {
      this.updateSetting('reportTime', e.target.value);
    });

    document.getElementById('dailyGoalNotification').addEventListener('change', (e) => {
      this.updateSetting('dailyGoalNotification', e.target.checked);
    });

    document.getElementById('timeLimitNotification').addEventListener('change', (e) => {
      this.updateSetting('timeLimitNotification', e.target.checked);
    });

    // Content Warnings settings
    document.getElementById('interventionLevel').addEventListener('change', (e) => {
      this.updateSetting('interventionLevel', e.target.value);
    });

    document.getElementById('showCredibilityWarnings').addEventListener('change', (e) => {
      this.updateSetting('showCredibilityWarnings', e.target.checked);
    });

    document.getElementById('showBiasWarnings').addEventListener('change', (e) => {
      this.updateSetting('showBiasWarnings', e.target.checked);
    });

    document.getElementById('enableInterstitials').addEventListener('change', (e) => {
      this.updateSetting('enableInterstitials', e.target.checked);
    });
  }

  setupRangeInputs() {
    // Educational goal range
    const educationalGoal = document.getElementById('educationalGoal');
    const educationalGoalValue = document.getElementById('educationalGoalValue');
    
    educationalGoal.addEventListener('input', (e) => {
      educationalGoalValue.textContent = `${e.target.value}%`;
      this.updateSetting('educationalGoal', parseInt(e.target.value));
    });

    // Source diversity goal
    document.getElementById('sourceDiversityGoal').addEventListener('change', (e) => {
      this.updateSetting('sourceDiversityGoal', parseInt(e.target.value));
    });

    // Uplifting goal range
    const upliftingGoal = document.getElementById('upliftingGoal');
    const upliftingGoalValue = document.getElementById('upliftingGoalValue');
    
    upliftingGoal.addEventListener('input', (e) => {
      upliftingGoalValue.textContent = `${e.target.value}%`;
      this.updateSetting('upliftingGoal', parseInt(e.target.value));
    });
  }

  async loadData() {
    try {
      const response = await this.sendMessage({ action: 'getUserData' });
      this.userData = response.userData;
      
      if (this.userData) {
        this.populateSettings();
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
      this.showErrorState();
    }
  }

  populateSettings() {
    const settings = this.userData.settings || {};

    // Data retention
    if (settings.dataRetention !== undefined) {
      document.getElementById('dataRetention').value = settings.dataRetention;
    }

    // Content analysis
    if (settings.contentAnalysis !== undefined) {
      document.getElementById('contentAnalysis').checked = settings.contentAnalysis;
    }

    if (settings.tabIndicators !== undefined) {
      document.getElementById('tabIndicators').checked = settings.tabIndicators;
    }

    // Time tracking
    if (settings.timeTracking !== undefined) {
      document.getElementById('timeTracking').checked = settings.timeTracking;
    }

    // Daily time limit
    if (settings.dailyTimeLimit !== undefined) {
      document.getElementById('dailyTimeLimit').value = settings.dailyTimeLimit;
    }

    // Tracking hours
    if (settings.trackingStart) {
      document.getElementById('trackingStart').value = settings.trackingStart;
    }
    if (settings.trackingEnd) {
      document.getElementById('trackingEnd').value = settings.trackingEnd;
    }

    // Content categories
    if (settings.trackNews !== undefined) {
      document.getElementById('trackNews').checked = settings.trackNews;
    }
    if (settings.trackSocial !== undefined) {
      document.getElementById('trackSocial').checked = settings.trackSocial;
    }
    if (settings.trackEntertainment !== undefined) {
      document.getElementById('trackEntertainment').checked = settings.trackEntertainment;
    }
    if (settings.trackEducational !== undefined) {
      document.getElementById('trackEducational').checked = settings.trackEducational;
    }
    if (settings.trackProfessional !== undefined) {
      document.getElementById('trackProfessional').checked = settings.trackProfessional;
    }

    // Goals
    if (settings.educationalGoal !== undefined) {
      document.getElementById('educationalGoal').value = settings.educationalGoal;
      document.getElementById('educationalGoalValue').textContent = `${settings.educationalGoal}%`;
    }
    if (settings.sourceDiversityGoal !== undefined) {
      document.getElementById('sourceDiversityGoal').value = settings.sourceDiversityGoal;
    }
    if (settings.upliftingGoal !== undefined) {
      document.getElementById('upliftingGoal').value = settings.upliftingGoal;
      document.getElementById('upliftingGoalValue').textContent = `${settings.upliftingGoal}%`;
    }

    // Time management
    if (settings.weeklyReportDay !== undefined) {
      document.getElementById('weeklyReportDay').value = settings.weeklyReportDay;
    }
    if (settings.sessionBreakTime !== undefined) {
      document.getElementById('sessionBreakTime').value = settings.sessionBreakTime;
    }

    // Notifications
    if (settings.smartNotifications !== undefined) {
      document.getElementById('smartNotifications').checked = settings.smartNotifications;
    }
    if (settings.toneAlerts !== undefined) {
      document.getElementById('toneAlerts').checked = settings.toneAlerts;
    }
    if (settings.credibilityWarnings !== undefined) {
      document.getElementById('credibilityWarnings').checked = settings.credibilityWarnings;
    }
    if (settings.echoChamberAlerts !== undefined) {
      document.getElementById('echoChamberAlerts').checked = settings.echoChamberAlerts;
    }
    if (settings.sessionInsights !== undefined) {
      document.getElementById('sessionInsights').checked = settings.sessionInsights;
    }
    if (settings.weeklyReportNotification !== undefined) {
      document.getElementById('weeklyReportNotification').checked = settings.weeklyReportNotification;
    }
    if (settings.reportTime) {
      document.getElementById('reportTime').value = settings.reportTime;
    }
    if (settings.dailyGoalNotification !== undefined) {
      document.getElementById('dailyGoalNotification').checked = settings.dailyGoalNotification;
    }
    if (settings.timeLimitNotification !== undefined) {
      document.getElementById('timeLimitNotification').checked = settings.timeLimitNotification;
    }

    // Content Warnings settings
    if (settings.interventionLevel !== undefined) {
      document.getElementById('interventionLevel').value = settings.interventionLevel;
    }
    if (settings.showCredibilityWarnings !== undefined) {
      document.getElementById('showCredibilityWarnings').checked = settings.showCredibilityWarnings;
    }
    if (settings.showBiasWarnings !== undefined) {
      document.getElementById('showBiasWarnings').checked = settings.showBiasWarnings;
    }
    if (settings.enableInterstitials !== undefined) {
      document.getElementById('enableInterstitials').checked = settings.enableInterstitials;
    }
  }

  switchSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.settings-section').forEach(sectionEl => {
      sectionEl.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');

    this.currentSection = section;
  }

  async updateSetting(key, value) {
    if (!this.userData.settings) {
      this.userData.settings = {};
    }
    
    this.userData.settings[key] = value;
    
    try {
      await this.sendMessage({ 
        action: 'updateSettings', 
        settings: this.userData.settings 
      });
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  }

  async exportData() {
    try {
      const dataStr = JSON.stringify(this.userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mindset-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      this.showSuccessMessage('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showErrorMessage('Failed to export data');
    }
  }

  showClearDataConfirmation() {
    this.showModal(
      'Clear All Data',
      'This action will permanently delete all your browsing data and reset the extension. This cannot be undone. Are you sure you want to continue?',
      'clearData'
    );
  }

  async clearData() {
    try {
      await this.sendMessage({ action: 'clearAllData' });
      this.showSuccessMessage('All data cleared successfully!');
      
      // Reset the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showErrorMessage('Failed to clear data');
    }
  }

  showModal(title, message, action) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').dataset.action = action;
    document.getElementById('confirmModal').style.display = 'block';
  }

  closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
  }

  confirmModalAction() {
    const action = document.getElementById('confirmModal').dataset.action;
    
    switch (action) {
      case 'clearData':
        this.clearData();
        break;
      default:
        console.log('Unknown modal action:', action);
    }
    
    this.closeModal();
  }

  goBack() {
    // Go back to dashboard or popup
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }

  openPrivacyPolicy() {
    // Open privacy policy in new tab
    chrome.tabs.create({
      url: 'https://example.com/privacy-policy' // Replace with actual URL
    });
  }

  openTerms() {
    // Open terms of service in new tab
    chrome.tabs.create({
      url: 'https://example.com/terms' // Replace with actual URL
    });
  }

  reportIssue() {
    // Open issue reporting form
    chrome.tabs.create({
      url: 'https://github.com/your-repo/mindset/issues/new' // Replace with actual URL
    });
  }

  requestFeature() {
    // Open feature request form
    chrome.tabs.create({
      url: 'https://github.com/your-repo/mindset/issues/new?template=feature_request.md' // Replace with actual URL
    });
  }

  showSuccessMessage(message) {
    // Create and show success message
    const messageEl = document.createElement('div');
    messageEl.className = 'message success';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #38a169;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  showErrorMessage(message) {
    // Create and show error message
    const messageEl = document.createElement('div');
    messageEl.className = 'message error';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e53e3e;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  showErrorState() {
    // Show error state
    document.querySelector('.settings-content').innerHTML = `
      <div class="error-state">
        <h2>Error Loading Settings</h2>
        <p>Unable to load your settings. Please try refreshing the page.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
      </div>
    `;
  }

  async handleEncryptionToggle(enabled) {
    if (enabled) {
      // Show password input
      document.getElementById('encryptionPasswordItem').style.display = 'block';
      this.showSuccessMessage('Please set an encryption password');
    } else {
      // Disable encryption
      const success = await this.disableEncryption();
      if (success) {
        document.getElementById('encryptionPasswordItem').style.display = 'none';
        this.showSuccessMessage('Encryption disabled');
      } else {
        // Revert toggle on failure
        document.getElementById('dataEncryption').checked = false;
        this.showErrorMessage('Failed to disable encryption');
      }
    }
  }

  async setEncryptionPassword() {
    const password = document.getElementById('encryptionPassword').value;
    
    if (!password || password.length < 8) {
      this.showErrorMessage('Password must be at least 8 characters long');
      return;
    }

    try {
      const success = await this.sendMessage({ 
        action: 'enableEncryption', 
        password: password 
      });
      
      if (success) {
        document.getElementById('encryptionPasswordItem').style.display = 'none';
        document.getElementById('encryptionPassword').value = '';
        this.showSuccessMessage('Encryption enabled successfully!');
      } else {
        this.showErrorMessage('Failed to enable encryption');
      }
    } catch (error) {
      console.error('Error setting encryption password:', error);
      this.showErrorMessage('Failed to set encryption password');
    }
  }

  async disableEncryption() {
    try {
      const success = await this.sendMessage({ 
        action: 'disableEncryption' 
      });
      return success;
    } catch (error) {
      console.error('Error disabling encryption:', error);
      return false;
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);

// Initialize the settings manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
}); 