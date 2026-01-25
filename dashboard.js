// Dashboard script for Mindset extension
class DashboardManager {
  constructor() {
    this.userData = null;
    this.currentWeekData = null;
    this.historicalWeeksLimit = 8;
    this.visitsPageSize = 25;
    this.visitsCurrentPage = 0;
    this.currentSortColumn = 'timestamp';
    this.currentSortDirection = 'desc';
    this.selectedWeekKey = null;
    this.selectedCategory = 'all';
    this.activeMetrics = ['overallHealth', 'credibility', 'contentTone', 'politicalBalance'];
    this.metricColors = {
      overallHealth: '#667eea',
      credibility: '#48bb78',
      contentTone: '#ed8936',
      politicalBalance: '#9f7aea',
      contentBalance: '#4299e1',
      sourceDiversity: '#f56565',
      timeManagement: '#38b2ac'
    };
    this.init();
  }

  init() {
    this.loadData();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportReport();
    });

    // Share button
    document.getElementById('shareBtn').addEventListener('click', () => {
      this.shareReport();
    });

    // Download image button
    document.getElementById('downloadImageBtn').addEventListener('click', () => {
      this.downloadAsImage();
    });

    // Copy link button
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
      this.copyLink();
    });

    // Footer links
    document.getElementById('settingsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });

    document.getElementById('exportDataLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.exportData();
    });

    document.getElementById('deleteDataLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.deleteData();
    });

    // Historical trends event listeners
    document.getElementById('prevWeeksBtn').addEventListener('click', () => {
      this.showMoreWeeks();
    });

    // Legend toggle for trend chart
    document.getElementById('trendLegend').addEventListener('click', (e) => {
      const legendItem = e.target.closest('.legend-item');
      if (legendItem) {
        const metric = legendItem.dataset.metric;
        this.toggleMetric(metric, legendItem);
      }
    });

    // Week selector for visits table
    document.getElementById('weekSelect').addEventListener('change', (e) => {
      this.selectedWeekKey = e.target.value;
      this.visitsCurrentPage = 0;
      this.renderVisitsTable();
    });

    // Category filter for visits table
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      this.selectedCategory = e.target.value;
      this.visitsCurrentPage = 0;
      this.renderVisitsTable();
    });

    // Load more visits button
    document.getElementById('loadMoreVisitsBtn').addEventListener('click', () => {
      this.visitsCurrentPage++;
      this.renderVisitsTable(true);
    });

    // Table header sorting
    document.getElementById('visitsTable').querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (th && th.dataset.sort) {
        this.sortVisitsTable(th.dataset.sort);
      }
    });

    // Import history buttons
    document.getElementById('importHistoryBtn').addEventListener('click', () => {
      this.importBrowserHistory();
    });

    document.getElementById('showImportBtn').addEventListener('click', () => {
      document.getElementById('importHistoryBanner').style.display = 'block';
    });

    document.getElementById('dismissImportBtn').addEventListener('click', () => {
      document.getElementById('importHistoryBanner').style.display = 'none';
      // Remember dismissal
      localStorage.setItem('mindset_import_dismissed', 'true');
    });
  }

  async loadData() {
    try {
      console.log('Dashboard: Loading data...');
      // Get user data from background script
      const response = await this.sendMessage({ action: 'getUserData' });
      console.log('Dashboard: Got response', response);
      this.userData = response.userData;

      if (this.userData) {
        console.log('Dashboard: userData loaded, getting current week');
        this.currentWeekData = this.getCurrentWeekData();
        console.log('Dashboard: currentWeekData', this.currentWeekData);
        this.updateDashboard();
        console.log('Dashboard: updateDashboard complete');
      } else {
        console.log('Dashboard: No userData, showing empty state');
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showErrorState(error.message || error.toString());
    }
  }

  getCurrentWeekData() {
    const weekKey = this.getWeekKey();
    return this.userData.weeklyData[weekKey];
  }

  getWeekKey() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toISOString().split('T')[0];
  }

  updateDashboard() {
    const methods = [
      ['updateReportHeader', () => this.updateReportHeader()],
      ['updateScores', () => this.updateScores()],
      ['updateEchoChamberSection', () => this.updateEchoChamberSection()],
      ['updateContentBreakdown', () => this.updateContentBreakdown()],
      ['updateTimeAnalysis', () => this.updateTimeAnalysis()],
      ['updateSourceAnalysis', () => this.updateSourceAnalysis()],
      ['updateTonePoliticalAnalysis', () => this.updateTonePoliticalAnalysis()],
      ['updateInsightsRecommendations', () => this.updateInsightsRecommendations()],
      ['updateHistoricalTrends', () => this.updateHistoricalTrends()],
      ['updateVisitsSection', () => this.updateVisitsSection()],
      ['updateShareableReport', () => this.updateShareableReport()],
      ['checkShowImportBanner', () => this.checkShowImportBanner()]
    ];

    for (const [name, fn] of methods) {
      try {
        fn();
      } catch (error) {
        console.error(`Dashboard error in ${name}:`, error);
      }
    }
  }

  updateReportHeader() {
    // Update report date
    const weekKey = this.getWeekKey();
    const startDate = new Date(weekKey);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    document.getElementById('reportDate').textContent = 
      `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Update tracking start date
    const trackingStart = new Date(this.userData.trackingStartDate);
    document.getElementById('trackingStartDate').textContent = 
      trackingStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Update data points
    const totalVisits = this.currentWeekData ? this.currentWeekData.visits.length : 0;
    document.getElementById('totalDataPoints').textContent = totalVisits;
  }

  updateScores() {
    const scores = this.userData.scores;
    if (!scores) return;

    // Update all score displays
    this.updateScoreDisplay('overallHealthScore', scores.overallHealth);
    this.updateScoreDisplay('contentBalanceScore', scores.contentBalance);
    this.updateScoreDisplay('sourceDiversityScore', scores.sourceDiversity);
    this.updateScoreDisplay('timeManagementScore', scores.timeManagement);
    this.updateScoreDisplay('contentToneScore', scores.contentTone);
    this.updateScoreDisplay('politicalBalanceScore', scores.politicalBalance);

    // Update stars for overall health
    this.updateStars('overallHealthStars', scores.overallHealth);
  }

  updateScoreDisplay(elementId, score) {
    const element = document.getElementById(elementId);
    if (element && score !== undefined) {
      element.textContent = score.toFixed(1);
      
      // Add color class based on score
      element.className = 'score-value';
      if (score >= 8) {
        element.classList.add('excellent');
      } else if (score >= 6) {
        element.classList.add('good');
      } else if (score >= 4) {
        element.classList.add('average');
      } else {
        element.classList.add('poor');
      }
    }
  }

  updateStars(elementId, score) {
    const element = document.getElementById(elementId);
    if (element && score !== undefined) {
      const fullStars = Math.floor(score);
      const hasHalfStar = score % 1 >= 0.5;
      
      let stars = '';
      for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
      }
      if (hasHalfStar) {
        stars += '⭐';
      }
      
      element.textContent = stars;
    }
  }

  updateContentBreakdown() {
    if (!this.currentWeekData) return;

    const categories = this.currentWeekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return;

    // Generate chart bars
    const chartContainer = document.getElementById('contentChart');
    const categoryOrder = ['news', 'social', 'entertainment', 'educational', 'professional'];
    
    chartContainer.innerHTML = categoryOrder.map(category => {
      const count = categories[category] || 0;
      const percentage = (count / total) * 100;
      const height = Math.max(percentage, 5); // Minimum 5% height for visibility
      
      return `
        <div class="chart-bar ${category}" style="height: ${height}%">
          <div class="chart-label">${Math.round(percentage)}%</div>
        </div>
      `;
    }).join('');

    // Update stats
    const topCategory = Object.entries(categories).reduce((a, b) => categories[a[0]] > categories[b[0]] ? a : b)[0];
    document.getElementById('topCategory').textContent = this.formatCategoryName(topCategory);

    // Calculate balance score
    const ideal = { news: 0.3, social: 0.25, entertainment: 0.25, educational: 0.15, professional: 0.05 };
    let balance = 0;
    Object.keys(ideal).forEach(cat => {
      const actual = (categories[cat] || 0) / total;
      balance += Math.min(actual / ideal[cat], ideal[cat] / actual);
    });
    balance = (balance / Object.keys(ideal).length) * 10;
    
    document.getElementById('categoryBalance').textContent = `${balance.toFixed(1)}/10`;

    // Generate recommendation
    const recommendations = [];
    if ((categories.news || 0) / total > 0.5) {
      recommendations.push('Reduce news consumption');
    }
    if ((categories.social || 0) / total > 0.4) {
      recommendations.push('Limit social media time');
    }
    if ((categories.educational || 0) / total < 0.1) {
      recommendations.push('Add educational content');
    }
    
    document.getElementById('categoryRecommendation').textContent = 
      recommendations.length > 0 ? recommendations[0] : 'Good balance!';
  }

  formatCategoryName(category) {
    const names = {
      news: 'News & Info',
      social: 'Social Media',
      entertainment: 'Entertainment',
      educational: 'Educational',
      professional: 'Professional'
    };
    return names[category] || category;
  }

  // Helper to get domain count (handles both Array and Set)
  getDomainCount(weekData) {
    if (!weekData?.domains) return 0;
    if (Array.isArray(weekData.domains)) return weekData.domains.length;
    if (weekData.domains instanceof Set) return weekData.domains.size;
    return 0;
  }

  updateTimeAnalysis() {
    if (!this.currentWeekData) return;

    const totalMinutes = this.currentWeekData.totalTime;
    const totalHours = totalMinutes / 60;
    const dailyAverage = totalHours / 7;

    // Update time stats
    document.getElementById('totalTime').textContent = `${totalHours.toFixed(1)} hours`;
    document.getElementById('dailyAverage').textContent = `${dailyAverage.toFixed(1)} hours`;

    // Find longest session
    const longestSession = this.currentWeekData.visits.reduce((max, visit) => 
      Math.max(max, visit.duration || 0), 0);
    document.getElementById('longestSession').textContent = `${longestSession} minutes`;

    // Generate daily chart
    this.generateDailyChart();
  }

  generateDailyChart() {
    const dailyData = this.getDailyUsageData();
    const chartContainer = document.getElementById('dailyChart');
    
    chartContainer.innerHTML = dailyData.map((data, index) => {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const height = Math.max((data.hours / 3) * 100, 5); // Scale to 3 hours max
      
      return `
        <div class="daily-bar" style="height: ${height}%">
          <div class="daily-label">${dayNames[index]}</div>
        </div>
      `;
    }).join('');
  }

  getDailyUsageData() {
    // This would be calculated from actual visit data
    // For now, return sample data
    return [
      { day: 0, hours: 1.2 },
      { day: 1, hours: 2.1 },
      { day: 2, hours: 1.8 },
      { day: 3, hours: 2.5 },
      { day: 4, hours: 1.9 },
      { day: 5, hours: 3.2 },
      { day: 6, hours: 2.8 }
    ];
  }

  updateSourceAnalysis() {
    if (!this.currentWeekData) return;

    const visits = this.currentWeekData.visits;
    const uniqueDomains = this.getDomainCount(this.currentWeekData);

    // Update source stats
    document.getElementById('uniqueDomains').textContent = uniqueDomains;

    // Calculate average credibility (only from known sources)
    const knownCredibilityVisits = visits.filter(v => v.credibility != null);
    if (knownCredibilityVisits.length > 0) {
      const totalCredibility = knownCredibilityVisits.reduce((sum, visit) => sum + visit.credibility, 0);
      const avgCredibility = totalCredibility / knownCredibilityVisits.length;
      document.getElementById('avgCredibility').textContent = `${avgCredibility.toFixed(1)}/10`;
    } else {
      document.getElementById('avgCredibility').textContent = 'N/A';
    }

    // Assess echo chamber risk
    const domainCount = uniqueDomains;
    let echoRisk = 'Low';
    if (domainCount < 5) echoRisk = 'High';
    else if (domainCount < 10) echoRisk = 'Medium';
    document.getElementById('echoChamberRisk').textContent = echoRisk;

    // Generate top sources list
    this.generateTopSourcesList(visits);
  }

  generateTopSourcesList(visits) {
    const sourceCounts = {};
    visits.forEach(visit => {
      sourceCounts[visit.domain] = (sourceCounts[visit.domain] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const container = document.getElementById('topSources');
    container.innerHTML = topSources.map(([domain, count]) => {
      const visit = visits.find(v => v.domain === domain);
      const credibility = visit?.credibility;
      const credibilityDisplay = credibility != null ? `${credibility.toFixed(1)}/10` : 'Unknown';

      return `
        <div class="source-item">
          <span class="source-name">${domain}</span>
          <span class="source-credibility">${credibilityDisplay} (${count} visits)</span>
        </div>
      `;
    }).join('');
  }

  updateTonePoliticalAnalysis() {
    if (!this.currentWeekData) return;

    const visits = this.currentWeekData.visits;
    
    // Calculate tone breakdown
    const toneCounts = { cynical: 0, uplifting: 0, neutral: 0 };
    visits.forEach(visit => {
      toneCounts[visit.tone] = (toneCounts[visit.tone] || 0) + 1;
    });

    const total = visits.length;
    if (total > 0) {
      this.updateToneBars(toneCounts, total);
    }

    // Calculate political breakdown
    const biasCounts = { liberal: 0, conservative: 0, centrist: 0, unknown: 0 };
    visits.forEach(visit => {
      biasCounts[visit.politicalBias] = (biasCounts[visit.politicalBias] || 0) + 1;
    });

    if (total > 0) {
      this.updatePoliticalBars(biasCounts, total);
    }
  }

  updateToneBars(toneCounts, total) {
    const cynicalPercent = (toneCounts.cynical / total) * 100;
    const upliftingPercent = (toneCounts.uplifting / total) * 100;
    const neutralPercent = (toneCounts.neutral / total) * 100;

    document.getElementById('cynicalBar').style.width = `${cynicalPercent}%`;
    document.getElementById('upliftingBar').style.width = `${upliftingPercent}%`;
    document.getElementById('neutralBar').style.width = `${neutralPercent}%`;

    document.getElementById('cynicalPercentage').textContent = `${Math.round(cynicalPercent)}%`;
    document.getElementById('upliftingPercentage').textContent = `${Math.round(upliftingPercent)}%`;
    document.getElementById('neutralPercentage').textContent = `${Math.round(neutralPercent)}%`;
  }

  updatePoliticalBars(biasCounts, total) {
    const liberalPercent = (biasCounts.liberal / total) * 100;
    const conservativePercent = (biasCounts.conservative / total) * 100;
    const centristPercent = (biasCounts.centrist / total) * 100;

    document.getElementById('liberalBar').style.width = `${liberalPercent}%`;
    document.getElementById('conservativeBar').style.width = `${conservativePercent}%`;
    document.getElementById('centristBar').style.width = `${centristPercent}%`;

    document.getElementById('liberalPercentage').textContent = `${Math.round(liberalPercent)}%`;
    document.getElementById('conservativePercentage').textContent = `${Math.round(conservativePercent)}%`;
    document.getElementById('centristPercentage').textContent = `${Math.round(centristPercent)}%`;
  }

  updateInsightsRecommendations() {
    if (!this.currentWeekData) return;

    const insights = this.generateInsights();
    const goals = this.generateGoals();

    // Update insights list
    const insightsContainer = document.getElementById('insightsList');
    insightsContainer.innerHTML = insights.map(insight => `
      <div class="insight-item ${insight.type}">
        <div class="insight-text">${insight.message}</div>
      </div>
    `).join('');

    // Update goals list
    const goalsContainer = document.getElementById('goalsList');
    goalsContainer.innerHTML = goals.map(goal => `
      <div class="goal-item">${goal}</div>
    `).join('');
  }

  generateInsights() {
    const insights = [];
    const weekData = this.currentWeekData;
    const scores = this.userData.scores;

    // Source diversity insight
    const domainCount = this.getDomainCount(weekData);
    if (domainCount >= 10) {
      insights.push({
        type: 'positive',
        message: `Excellent source diversity! You visited ${domainCount} different websites this week.`
      });
    } else if (domainCount >= 5) {
      insights.push({
        type: 'suggestion',
        message: `Good start! Try visiting more diverse sources. You visited ${domainCount} websites.`
      });
    } else {
      insights.push({
        type: 'warning',
        message: `Consider visiting more diverse sources. You visited ${domainCount} websites.`
      });
    }

    // Content balance insight
    const categories = weekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (categories.news && categories.news / total > 0.5) {
      insights.push({
        type: 'warning',
        message: 'You\'re consuming a lot of news content. Consider adding more entertainment or educational content.'
      });
    }

    if (categories.social && categories.social / total > 0.4) {
      insights.push({
        type: 'warning',
        message: 'High social media usage detected. Consider setting time limits.'
      });
    }

    // Tone insight
    if (scores.contentTone < 5) {
      insights.push({
        type: 'warning',
        message: 'Your content is mostly cynical. Try adding more uplifting, solution-focused content.'
      });
    } else if (scores.contentTone > 7) {
      insights.push({
        type: 'positive',
        message: 'Great balance of uplifting content! Keep it up.'
      });
    }

    // Political balance insight
    if (scores.politicalBalance < 5) {
      insights.push({
        type: 'warning',
        message: 'You might be in an echo chamber. Try reading from diverse political viewpoints.'
      });
    } else if (scores.politicalBalance > 7) {
      insights.push({
        type: 'positive',
        message: 'Excellent political diversity! You\'re getting balanced viewpoints.'
      });
    }

    return insights.slice(0, 4); // Limit to 4 insights
  }

  generateGoals() {
    const goals = [];
    const weekData = this.currentWeekData;
    const scores = this.userData.scores;

    // Content balance goal
    const categories = weekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (categories.educational && categories.educational / total < 0.1) {
      goals.push('Add 30 minutes of educational content daily');
    }

    if (categories.social && categories.social / total > 0.4) {
      goals.push('Limit social media to 1 hour per day');
    }

    // Tone goal
    if (scores.contentTone < 6) {
      goals.push('Read 2-3 uplifting articles daily');
    }

    // Source diversity goal
    if (this.getDomainCount(weekData) < 10) {
      goals.push('Visit 3 new websites this week');
    }

    return goals.slice(0, 3); // Limit to 3 goals
  }

  updateShareableReport() {
    const scores = this.userData.scores;
    if (!scores) return;

    // Update share card
    document.getElementById('shareOverallHealth').textContent = `${scores.overallHealth.toFixed(1)}/10`;

    // Generate content breakdown for sharing
    if (this.currentWeekData) {
      const categories = this.currentWeekData.categories;
      const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
      
      const breakdown = Object.entries(categories)
        .map(([cat, count]) => `${this.formatCategoryName(cat)}: ${Math.round((count / total) * 100)}%`)
        .join(', ');
      
      document.getElementById('shareContentBreakdown').textContent = breakdown;
    }

    // Generate achievement
    const achievements = [];
    if (scores.overallHealth >= 8) achievements.push('Excellent digital diet');
    if (scores.sourceDiversity >= 8) achievements.push('Great source diversity');
    if (scores.contentTone >= 7) achievements.push('Balanced content tone');
    if (scores.politicalBalance >= 7) achievements.push('Diverse viewpoints');
    
    document.getElementById('shareAchievement').textContent = 
      achievements.length > 0 ? achievements[0] : 'Making progress on digital wellness';
  }

  // Export and sharing functions
  exportReport() {
    // Generate PDF or export data
    console.log('Exporting report...');
    // Implementation would use a library like jsPDF
  }

  shareReport() {
    // Share functionality
    console.log('Sharing report...');
    // Implementation would use Web Share API or generate shareable link
  }

  downloadAsImage() {
    // Convert share card to image
    console.log('Downloading as image...');
    // Implementation would use html2canvas
  }

  copyLink() {
    // Copy shareable link to clipboard
    console.log('Copying link...');
    // Implementation would use Clipboard API
  }

  openSettings() {
    // Open settings page
    console.log('Opening settings...');
    // Implementation would open settings modal or page
  }

  exportData() {
    // Export raw data
    console.log('Exporting data...');
    const dataStr = JSON.stringify(this.userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mindset-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  deleteData() {
    // Delete all data
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      console.log('Deleting data...');
      // Implementation would clear storage and reload
    }
  }

  showEmptyState() {
    // Show empty state when no data
    document.querySelector('.dashboard-main').innerHTML = `
      <div class="empty-state">
        <h2>No Data Available</h2>
        <p>Start browsing to see your digital diet insights!</p>
      </div>
    `;
  }

  showErrorState(errorMsg = '') {
    // Show error state
    document.querySelector('.dashboard-main').innerHTML = `
      <div class="error-state">
        <h2>Error Loading Data</h2>
        <p>Unable to load your data. Please try refreshing the page.</p>
        ${errorMsg ? `<p style="color: #666; font-size: 12px; margin-top: 10px;">Error: ${errorMsg}</p>` : ''}
        <p style="margin-top: 20px;"><button onclick="location.reload()">Reload Page</button></p>
      </div>
    `;
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

  // ==================== Echo Chamber Section ====================

  async updateEchoChamberSection() {
    try {
      const response = await this.sendMessage({ action: 'getEchoChamberAnalysis' });
      const analysis = response.weekly;
      const realtimeStatus = response.realtime;

      if (!analysis) {
        this.showEchoChamberEmptyState();
        return;
      }

      // Update balance indicator position
      // Position: -100% = all left, 0 = center, 100% = all right
      const leftPercent = analysis.percentages?.left || 0;
      const rightPercent = analysis.percentages?.right || 0;
      const centerPercent = analysis.percentages?.center || 0;
      const unknownPercent = analysis.percentages?.unknown || 0;

      // Calculate balance position (-50 to 50, with 0 being center)
      let balancePosition = 0;
      const knownPercent = leftPercent + rightPercent + centerPercent;
      if (knownPercent > 0) {
        // Weight: left = -1, center = 0, right = +1
        balancePosition = ((rightPercent - leftPercent) / knownPercent) * 50;
      }

      const indicator = document.getElementById('balanceIndicator');
      if (indicator) {
        // Transform position: 50% is center, 0% is far left, 100% is far right
        indicator.style.left = `${50 + balancePosition}%`;
      }

      // Update percentage displays
      this.updatePercentageDisplay('leftPercent', 'leftBar', leftPercent);
      this.updatePercentageDisplay('centerPercent', 'centerBar', centerPercent);
      this.updatePercentageDisplay('rightPercent', 'rightBar', rightPercent);
      this.updatePercentageDisplay('unknownPercent', 'unknownBar', unknownPercent);

      // Update status text
      const statusEl = document.getElementById('balanceStatus');
      if (statusEl) {
        const statusText = statusEl.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = this.getBalanceStatusText(analysis);
        }
        statusEl.className = 'balance-status ' + this.getBalanceStatusClass(analysis);
      }

      // Show/hide echo chamber alert or balanced message
      const alertEl = document.getElementById('echoChamberAlert');
      const balancedEl = document.getElementById('balancedMessage');

      if (analysis.isEchoChamber) {
        // Show echo chamber warning
        if (alertEl) {
          alertEl.style.display = 'block';
          const alertText = document.getElementById('echoChamberAlertText');
          if (alertText) {
            alertText.textContent = this.getEchoChamberAlertText(analysis);
          }
        }
        if (balancedEl) balancedEl.style.display = 'none';

        // Calculate dominant percentage from the bias that triggered echo chamber
        const dominantPercentage = analysis.dominantBias === 'left' ? leftPercent :
                                   analysis.dominantBias === 'right' ? rightPercent : 0;

        // Update recent consumption info
        const recentEl = document.getElementById('recentConsumption');
        if (recentEl && analysis.dominantBias) {
          recentEl.textContent = `${Math.round(dominantPercentage)}% of your weekly content leans ${analysis.dominantBias}`;
        }

        // Update consecutive info from realtime status
        const consecutiveEl = document.getElementById('consecutiveInfo');
        const consecutiveCount = realtimeStatus?.consecutiveCount || 0;
        if (consecutiveEl && consecutiveCount >= 3) {
          const realtimeBias = realtimeStatus?.dominantBias || analysis.dominantBias;
          consecutiveEl.textContent = `You've viewed ${consecutiveCount} ${realtimeBias}-leaning sources in a row`;
          consecutiveEl.style.display = 'block';
        } else if (consecutiveEl) {
          consecutiveEl.style.display = 'none';
        }

      } else if (this.isWellBalanced(analysis)) {
        // Show balanced message
        if (balancedEl) balancedEl.style.display = 'block';
        if (alertEl) alertEl.style.display = 'none';
      } else {
        // Neither in echo chamber nor well balanced - hide both
        if (alertEl) alertEl.style.display = 'none';
        if (balancedEl) balancedEl.style.display = 'none';
      }

    } catch (error) {
      console.error('Error updating echo chamber section:', error);
      this.showEchoChamberEmptyState();
    }
  }

  updatePercentageDisplay(percentId, barId, value) {
    const percentEl = document.getElementById(percentId);
    const barEl = document.getElementById(barId);

    if (percentEl) {
      percentEl.textContent = `${Math.round(value)}%`;
    }
    if (barEl) {
      barEl.style.width = `${value}%`;
    }
  }

  getBalanceStatusText(analysis) {
    if (analysis.isEchoChamber) {
      return `Echo chamber detected - ${analysis.dominantBias}-leaning`;
    }

    const leftPercent = analysis.percentages?.left || 0;
    const rightPercent = analysis.percentages?.right || 0;
    const centerPercent = analysis.percentages?.center || 0;

    if (this.isWellBalanced(analysis)) {
      return 'Well balanced perspective';
    }

    if (leftPercent > rightPercent + 20) {
      return 'Leaning left';
    } else if (rightPercent > leftPercent + 20) {
      return 'Leaning right';
    } else if (centerPercent > 50) {
      return 'Mostly center sources';
    }

    return 'Moderately balanced';
  }

  getBalanceStatusClass(analysis) {
    if (analysis.isEchoChamber) {
      return 'danger';
    }
    if (this.isWellBalanced(analysis)) {
      return 'good';
    }
    return 'warning';
  }

  isWellBalanced(analysis) {
    const leftPercent = analysis.percentages?.left || 0;
    const rightPercent = analysis.percentages?.right || 0;
    const centerPercent = analysis.percentages?.center || 0;

    // Well balanced if:
    // 1. Left and right are within 15% of each other AND
    // 2. No single viewpoint exceeds 50% AND
    // 3. At least 20% center content
    const leftRightDiff = Math.abs(leftPercent - rightPercent);
    const maxSingleViewpoint = Math.max(leftPercent, rightPercent, centerPercent);

    return leftRightDiff <= 15 && maxSingleViewpoint <= 50 && centerPercent >= 20;
  }

  getEchoChamberAlertText(analysis) {
    const bias = analysis.dominantBias;
    // Calculate dominant percentage from percentages object
    const percent = bias === 'left' ? Math.round(analysis.percentages?.left || 0) :
                    bias === 'right' ? Math.round(analysis.percentages?.right || 0) : 0;

    if (percent >= 80) {
      return `Strong echo chamber: ${percent}% of your content is ${bias}-leaning. Consider diversifying your sources.`;
    } else if (percent >= 70) {
      return `Echo chamber detected: ${percent}% ${bias}-leaning content. Try exploring different perspectives.`;
    } else {
      return `You may be in an echo chamber with ${percent}% ${bias}-leaning content.`;
    }
  }

  showEchoChamberEmptyState() {
    const statusEl = document.getElementById('balanceStatus');
    if (statusEl) {
      const statusText = statusEl.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'Not enough data yet';
      }
      statusEl.className = 'balance-status';
    }

    // Reset bars to 0
    ['left', 'center', 'right', 'unknown'].forEach(type => {
      this.updatePercentageDisplay(`${type}Percent`, `${type}Bar`, 0);
    });

    // Hide alerts
    const alertEl = document.getElementById('echoChamberAlert');
    const balancedEl = document.getElementById('balancedMessage');
    if (alertEl) alertEl.style.display = 'none';
    if (balancedEl) balancedEl.style.display = 'none';
  }

  // ==================== Historical Trends Methods ====================

  getHistoricalWeeks(limit = 8) {
    if (!this.userData || !this.userData.weeklyData) return [];
    return Object.keys(this.userData.weeklyData)
      .sort()
      .slice(-limit);
  }

  calculateWeekScores(weekKey) {
    const weekData = this.userData.weeklyData[weekKey];
    if (!weekData) return null;

    // If scores are already stored, return them
    if (weekData.scores) {
      return weekData.scores;
    }

    // Calculate scores from raw visit data
    const visits = weekData.visits || [];
    if (visits.length === 0) return null;

    const scores = {};

    // Source Diversity
    const uniqueDomains = this.getDomainCount(weekData) || new Set(visits.map(v => v.domain)).size;
    scores.sourceDiversity = Math.min(uniqueDomains / 10, 1) * 10;

    // Content Balance
    const categories = weekData.categories || {};
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    if (total > 0) {
      const ideal = { news: 0.3, entertainment: 0.25, professional: 0.2, educational: 0.15, other: 0.1 };
      let deviation = 0;
      Object.keys(ideal).forEach(cat => {
        const actual = (categories[cat] || 0) / total;
        deviation += Math.abs(actual - ideal[cat]);
      });
      scores.contentBalance = Math.max(0, 10 - deviation * 20);
    } else {
      scores.contentBalance = 5;
    }

    // Time Management
    const totalHours = (weekData.totalTime || 0) / 60;
    const avgDailyHours = totalHours / 7;
    if (avgDailyHours >= 1 && avgDailyHours <= 3) {
      scores.timeManagement = 10;
    } else if (avgDailyHours < 1) {
      scores.timeManagement = 8;
    } else if (avgDailyHours <= 5) {
      scores.timeManagement = 6;
    } else {
      scores.timeManagement = 3;
    }

    // Credibility
    const totalCredibility = visits.reduce((sum, visit) => sum + (visit.credibility || 6), 0);
    scores.credibility = totalCredibility / visits.length;

    // Content Tone
    const toneCounts = { cynical: 0, uplifting: 0, neutral: 0 };
    visits.forEach(visit => {
      toneCounts[visit.tone] = (toneCounts[visit.tone] || 0) + 1;
    });
    const upliftingRatio = toneCounts.uplifting / visits.length;
    const neutralRatio = toneCounts.neutral / visits.length;
    scores.contentTone = (upliftingRatio * 10) + (neutralRatio * 5);

    // Political Balance
    const biasCounts = { liberal: 0, conservative: 0, centrist: 0, unknown: 0 };
    visits.forEach(visit => {
      biasCounts[visit.politicalBias] = (biasCounts[visit.politicalBias] || 0) + 1;
    });
    const liberalRatio = biasCounts.liberal / visits.length;
    const conservativeRatio = biasCounts.conservative / visits.length;
    const centristRatio = biasCounts.centrist / visits.length;
    const diversity = 1 - Math.max(liberalRatio, conservativeRatio);
    scores.politicalBalance = (diversity * 8) + (centristRatio * 2);

    // Overall Health
    scores.overallHealth = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

    return scores;
  }

  updateHistoricalTrends() {
    const weeks = this.getHistoricalWeeks(this.historicalWeeksLimit);

    if (weeks.length === 0) {
      document.getElementById('trendChart').innerHTML = '<div class="visits-empty"><h4>No historical data yet</h4><p>Keep browsing to see your trends over time.</p></div>';
      document.getElementById('wowSummary').innerHTML = '';
      return;
    }

    document.getElementById('weekRangeLabel').textContent = `Last ${weeks.length} week${weeks.length > 1 ? 's' : ''}`;

    this.renderTrendChart(weeks);
    this.renderWowSummary(weeks);
  }

  renderTrendChart(weeks) {
    const container = document.getElementById('trendChart');

    // Collect data for all weeks
    const chartData = weeks.map(weekKey => {
      const scores = this.calculateWeekScores(weekKey);
      return {
        weekKey,
        label: this.formatWeekLabel(weekKey),
        scores: scores || {}
      };
    });

    // SVG dimensions
    const width = container.clientWidth - 40 || 700;
    const height = 260;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Create SVG
    let svg = `<svg class="trend-chart-svg" viewBox="0 0 ${width} ${height}">`;

    // Draw grid lines (horizontal)
    for (let i = 0; i <= 10; i += 2) {
      const y = padding.top + chartHeight - (i / 10) * chartHeight;
      svg += `<line class="grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
      svg += `<text class="axis-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#718096" font-size="12">${i}</text>`;
    }

    // Draw x-axis labels
    const xStep = chartWidth / (chartData.length - 1 || 1);
    chartData.forEach((data, index) => {
      const x = padding.left + index * xStep;
      svg += `<text class="axis-label" x="${x}" y="${height - 10}" text-anchor="middle" fill="#718096" font-size="11">${data.label}</text>`;
    });

    // Draw lines for each active metric
    this.activeMetrics.forEach(metric => {
      const color = this.metricColors[metric];
      const points = chartData
        .map((data, index) => {
          const score = data.scores[metric];
          if (score === undefined || score === null) return null;
          const x = padding.left + index * xStep;
          const y = padding.top + chartHeight - (score / 10) * chartHeight;
          return { x, y, score, label: data.label };
        })
        .filter(p => p !== null);

      if (points.length > 1) {
        // Draw line
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        svg += `<path class="data-line" d="${pathData}" stroke="${color}" fill="none" stroke-width="2"/>`;
      }

      // Draw dots
      points.forEach(p => {
        svg += `<circle class="data-dot" cx="${p.x}" cy="${p.y}" r="4" fill="${color}" data-metric="${metric}" data-score="${p.score.toFixed(1)}" data-label="${p.label}"/>`;
      });
    });

    svg += '</svg>';
    svg += '<div class="tooltip" id="chartTooltip"></div>';

    container.innerHTML = svg;

    // Add tooltip interactivity
    this.setupChartTooltips(container);
  }

  setupChartTooltips(container) {
    const tooltip = container.querySelector('.tooltip');
    const dots = container.querySelectorAll('.data-dot');

    dots.forEach(dot => {
      dot.addEventListener('mouseenter', (e) => {
        const metric = dot.dataset.metric;
        const score = dot.dataset.score;
        const label = dot.dataset.label;
        const metricName = this.formatMetricName(metric);

        tooltip.textContent = `${label}: ${metricName} ${score}`;
        tooltip.classList.add('visible');

        const rect = container.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();
        tooltip.style.left = `${dotRect.left - rect.left + 10}px`;
        tooltip.style.top = `${dotRect.top - rect.top - 30}px`;
      });

      dot.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    });
  }

  formatMetricName(metric) {
    const names = {
      overallHealth: 'Overall Health',
      credibility: 'Credibility',
      contentTone: 'Content Tone',
      politicalBalance: 'Political Balance',
      contentBalance: 'Content Balance',
      sourceDiversity: 'Source Diversity',
      timeManagement: 'Time Management'
    };
    return names[metric] || metric;
  }

  formatWeekLabel(weekKey) {
    const date = new Date(weekKey);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  renderWowSummary(weeks) {
    const container = document.getElementById('wowSummary');

    if (weeks.length < 2) {
      container.innerHTML = '<div class="wow-card"><h4>Week-over-Week</h4><p style="color: #718096; font-size: 14px;">Need at least 2 weeks of data</p></div>';
      return;
    }

    const currentWeek = weeks[weeks.length - 1];
    const previousWeek = weeks[weeks.length - 2];

    const currentScores = this.calculateWeekScores(currentWeek);
    const previousScores = this.calculateWeekScores(previousWeek);

    if (!currentScores || !previousScores) {
      container.innerHTML = '';
      return;
    }

    const metrics = ['overallHealth', 'credibility', 'contentTone', 'politicalBalance'];

    container.innerHTML = metrics.map(metric => {
      const current = currentScores[metric] || 0;
      const previous = previousScores[metric] || 0;
      const delta = current - previous;
      const deltaPercent = previous > 0 ? ((delta / previous) * 100).toFixed(0) : 0;

      let deltaClass = 'neutral';
      let arrow = '→';
      if (delta > 0.1) {
        deltaClass = 'positive';
        arrow = '↑';
      } else if (delta < -0.1) {
        deltaClass = 'negative';
        arrow = '↓';
      }

      return `
        <div class="wow-card">
          <h4>${this.formatMetricName(metric)}</h4>
          <div class="wow-change">
            <span class="previous">${previous.toFixed(1)}</span>
            <span class="arrow">→</span>
            <span class="current">${current.toFixed(1)}</span>
          </div>
          <div class="wow-delta ${deltaClass}">
            ${arrow} ${Math.abs(deltaPercent)}%
          </div>
        </div>
      `;
    }).join('');
  }

  toggleMetric(metric, legendItem) {
    const index = this.activeMetrics.indexOf(metric);
    if (index > -1) {
      this.activeMetrics.splice(index, 1);
      legendItem.classList.remove('active');
    } else {
      this.activeMetrics.push(metric);
      legendItem.classList.add('active');
    }

    const weeks = this.getHistoricalWeeks(this.historicalWeeksLimit);
    this.renderTrendChart(weeks);
  }

  showMoreWeeks() {
    this.historicalWeeksLimit += 4;
    const totalWeeks = Object.keys(this.userData.weeklyData || {}).length;

    if (this.historicalWeeksLimit >= totalWeeks) {
      document.getElementById('prevWeeksBtn').disabled = true;
      document.getElementById('prevWeeksBtn').textContent = 'All Weeks Shown';
    }

    this.updateHistoricalTrends();
  }

  // ==================== Visits Table Methods ====================

  updateVisitsSection() {
    this.populateWeekSelector();
    this.renderVisitsTable();
  }

  populateWeekSelector() {
    const select = document.getElementById('weekSelect');
    const weeks = this.getHistoricalWeeks(52); // Up to a year of data

    if (weeks.length === 0) {
      select.innerHTML = '<option value="">No data available</option>';
      return;
    }

    // Default to current week
    if (!this.selectedWeekKey) {
      this.selectedWeekKey = weeks[weeks.length - 1];
    }

    select.innerHTML = weeks.reverse().map(weekKey => {
      const startDate = new Date(weekKey);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const label = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      const selected = weekKey === this.selectedWeekKey ? 'selected' : '';

      return `<option value="${weekKey}" ${selected}>${label}</option>`;
    }).join('');
  }

  getFilteredVisits() {
    if (!this.selectedWeekKey || !this.userData.weeklyData[this.selectedWeekKey]) {
      return [];
    }

    let visits = [...(this.userData.weeklyData[this.selectedWeekKey].visits || [])];

    // Apply category filter
    if (this.selectedCategory !== 'all') {
      visits = visits.filter(v => v.category === this.selectedCategory);
    }

    // Apply sorting
    visits.sort((a, b) => {
      let aVal = a[this.currentSortColumn];
      let bVal = b[this.currentSortColumn];

      // Handle special cases
      if (this.currentSortColumn === 'timestamp') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return this.currentSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.currentSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return visits;
  }

  renderVisitsTable(append = false) {
    const tbody = document.getElementById('visitsTableBody');
    const visits = this.getFilteredVisits();

    const startIndex = append ? this.visitsCurrentPage * this.visitsPageSize : 0;
    const endIndex = (this.visitsCurrentPage + 1) * this.visitsPageSize;
    const visitsToShow = visits.slice(0, endIndex);

    if (visitsToShow.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="visits-empty">
            <h4>No visits found</h4>
            <p>No browsing data matches your current filters.</p>
          </td>
        </tr>
      `;
      document.getElementById('visitsCount').textContent = '0 visits';
      document.getElementById('loadMoreVisitsBtn').disabled = true;
      return;
    }

    tbody.innerHTML = visitsToShow.map(visit => this.formatVisitRow(visit)).join('');

    // Update count and load more button
    document.getElementById('visitsCount').textContent = `Showing ${visitsToShow.length} of ${visits.length} visits`;
    document.getElementById('loadMoreVisitsBtn').disabled = endIndex >= visits.length;

    // Update sort indicators
    this.updateSortIndicators();
  }

  formatVisitRow(visit) {
    const timestamp = visit.timestamp ? new Date(visit.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }) : '-';

    const credibility = visit.credibility;
    const credibilityKnown = visit.credibilityKnown !== false && credibility !== null;
    let credibilityClass = 'unknown';
    let rowClass = '';
    let credibilityDisplay = '?';

    if (credibilityKnown && credibility !== null) {
      credibilityDisplay = credibility.toFixed(1);
      if (credibility >= 8) {
        credibilityClass = 'high';
        rowClass = 'credibility-high';
      } else if (credibility >= 6) {
        credibilityClass = 'medium';
        rowClass = 'credibility-medium';
      } else {
        credibilityClass = 'low';
        rowClass = 'credibility-low';
      }
    }

    const category = visit.category || 'other';
    const tone = visit.tone || 'neutral';
    const bias = visit.politicalBias || 'unknown';
    const duration = visit.duration ? `${visit.duration}m` : '-';
    const displayDomain = visit.sourceName || visit.domain;

    return `
      <tr class="${rowClass}">
        <td>${timestamp}</td>
        <td class="domain-cell" title="${visit.domain}">${displayDomain}</td>
        <td class="title-cell" title="${visit.title || '-'}">${visit.title || '-'}</td>
        <td><span class="category-badge ${category}">${this.formatCategoryName(category)}</span></td>
        <td><span class="credibility-score ${credibilityClass}">${credibilityDisplay}</span></td>
        <td><span class="tone-badge ${tone}">${tone}</span></td>
        <td><span class="bias-badge ${bias}">${bias}</span></td>
        <td>${duration}</td>
      </tr>
    `;
  }

  sortVisitsTable(column) {
    if (this.currentSortColumn === column) {
      this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSortColumn = column;
      this.currentSortDirection = column === 'timestamp' ? 'desc' : 'asc';
    }

    this.visitsCurrentPage = 0;
    this.renderVisitsTable();
  }

  updateSortIndicators() {
    const headers = document.querySelectorAll('#visitsTable th[data-sort]');
    headers.forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === this.currentSortColumn) {
        th.classList.add(this.currentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  // ==================== Import Browser History ====================

  checkShowImportBanner() {
    const dominated = localStorage.getItem('mindset_import_dismissed');
    if (dominated) return;

    // Show banner if user has less than 2 weeks of data
    const weeks = this.getHistoricalWeeks(52);
    if (weeks.length < 2) {
      document.getElementById('importHistoryBanner').style.display = 'block';
    }
  }

  async importBrowserHistory() {
    // First, request the history permission
    try {
      const granted = await this.requestHistoryPermission();
      if (!granted) {
        alert('Permission denied. You can try again anytime by clicking "Import History".');
        return;
      }

      // Show progress UI
      document.getElementById('importHistoryBanner').style.display = 'none';
      document.getElementById('importProgress').style.display = 'block';
      this.updateImportProgress(0, 'Starting import...');

      // Request history import from background script
      const response = await this.sendMessage({
        action: 'importBrowserHistory',
        days: 90  // Import last 90 days
      });

      if (response.success) {
        this.updateImportProgress(100, `Imported ${response.imported} visits!`);

        // Reload data after short delay
        setTimeout(async () => {
          document.getElementById('importProgress').style.display = 'none';
          await this.loadData();
        }, 1500);
      } else {
        document.getElementById('importProgress').style.display = 'none';
        alert('Import failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Import error:', error);
      document.getElementById('importProgress').style.display = 'none';
      alert('Import failed. Please try again.');
    }
  }

  async requestHistoryPermission() {
    return new Promise((resolve) => {
      chrome.permissions.request(
        { permissions: ['history'] },
        (granted) => resolve(granted)
      );
    });
  }

  updateImportProgress(percent, text) {
    document.getElementById('importProgressFill').style.width = `${percent}%`;
    document.getElementById('importProgressText').textContent = text;
  }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
}); 