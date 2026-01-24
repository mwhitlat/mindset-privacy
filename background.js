// Background service worker for Mindset extension
class MindsetTracker {
  constructor() {
    this.isTracking = true;
    this.currentSession = {
      startTime: Date.now(),
      sites: new Map(),
      currentSite: null
    };
    this.rateLimitMap = new Map();
    this.maxRequestsPerMinute = 60; // Rate limiting
    this.encryptionEnabled = false;
    this.encryptionKey = null;

    // Media sources database
    this.mediaSources = null;

    // Engagement hooks
    this.notificationCooldowns = new Map();
    this.lastBadgeUpdate = 0;
    this.currentSessionScore = 7.0;

    this.init().catch(error => {
      console.error('Failed to initialize MindsetTracker:', error);
    });
  }

  async init() {
    // Load media sources database
    await this.loadMediaSources();

    // Load tracking state from storage
    try {
      const result = await chrome.storage.local.get(['isTracking', 'userData', 'encryptedData', 'encryptionEnabled']);
      
      if (result.encryptionEnabled && result.encryptedData) {
        // Handle encrypted data
        this.encryptionEnabled = true;
        const decryptedData = await this.decryptData(result.encryptedData);
        this.isTracking = decryptedData.isTracking !== false;
        this.userData = decryptedData.userData || this.initializeUserData();
      } else {
        // Handle unencrypted data
        this.isTracking = result.isTracking !== false;
        this.userData = result.userData || this.initializeUserData();
      }
      
      // Initialize empty weekly data if none exists
      if (!this.userData.weeklyData) {
        this.userData.weeklyData = {};
      }
      
      // Start tracking if enabled
      if (this.isTracking) {
        this.startTracking();
      }
      
      // Initialize badge with current score
      const initialScore = this.calculateSessionScore();
      await this.updateExtensionBadge(initialScore);
    } catch (error) {
      console.error('Failed to initialize:', error);
      // Fallback to default state
      this.isTracking = true;
      this.userData = this.initializeUserData();

      // Initialize badge with default score
      await this.updateExtensionBadge(7.0);
    }

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.isTracking) {
        this.trackPageVisit(tab);
      }
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      if (this.isTracking) {
        this.handleTabActivation(activeInfo);
      }
    });

    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  initializeUserData() {
    return {
      trackingStartDate: new Date().toISOString(),
      weeklyData: {},
      settings: {
        isTracking: true,
        weeklyReportDay: 0, // Sunday
        dailyTimeLimit: 180, // 3 hours in minutes
        educationalGoal: 20, // 20% educational content
        sourceDiversityGoal: 10 // 10+ unique domains
      },
      scores: {
        overallHealth: 7.2,
        contentBalance: 6.8,
        sourceDiversity: 8.1,
        timeManagement: 6.5,
        credibility: 7.0,
        contentTone: 7.4,
        politicalBalance: 7.8
      }
    };
  }

  addSampleData() {
    // Generate sample data for 8 weeks to test historical trends
    const now = new Date();

    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - (weekOffset * 7));
      const startOfWeek = new Date(weekDate.setDate(weekDate.getDate() - weekDate.getDay()));
      const weekKey = startOfWeek.toISOString().split('T')[0];

      // Vary the data slightly for each week to show trends
      const variationFactor = 1 + (Math.sin(weekOffset * 0.8) * 0.3);
      const baseTimestamp = startOfWeek.getTime();

      const visits = [
        {
          domain: 'nytimes.com',
          path: '/article1',
          title: 'Positive Economic Growth Reported',
          category: 'news',
          credibility: 9.5,
          politicalBias: 'liberal',
          tone: weekOffset % 3 === 0 ? 'uplifting' : 'neutral',
          duration: Math.floor(15 * variationFactor),
          timestamp: baseTimestamp + 86400000
        },
        {
          domain: 'foxnews.com',
          path: '/article2',
          title: 'Conservative Policy Analysis',
          category: 'news',
          credibility: 7.0,
          politicalBias: 'conservative',
          tone: 'neutral',
          duration: Math.floor(12 * variationFactor),
          timestamp: baseTimestamp + 172800000
        },
        {
          domain: 'facebook.com',
          path: '/feed',
          title: 'Social Media Feed',
          category: 'social',
          credibility: 5.0,
          politicalBias: 'unknown',
          tone: weekOffset % 2 === 0 ? 'neutral' : 'cynical',
          duration: Math.floor(45 * variationFactor),
          timestamp: baseTimestamp + 259200000
        },
        {
          domain: 'youtube.com',
          path: '/watch',
          title: 'Educational Video Tutorial',
          category: 'educational',
          credibility: 6.5,
          politicalBias: 'unknown',
          tone: 'uplifting',
          duration: Math.floor(20 * variationFactor),
          timestamp: baseTimestamp + 345600000
        },
        {
          domain: 'reddit.com',
          path: '/r/entertainment',
          title: 'Entertainment Discussion',
          category: 'entertainment',
          credibility: 5.5,
          politicalBias: 'unknown',
          tone: 'neutral',
          duration: Math.floor(18 * variationFactor),
          timestamp: baseTimestamp + 432000000
        }
      ];

      // Add some extra visits for variety in newer weeks
      if (weekOffset < 4) {
        visits.push({
          domain: 'reuters.com',
          path: '/world',
          title: 'World News Update',
          category: 'news',
          credibility: 9.0,
          politicalBias: 'centrist',
          tone: 'neutral',
          duration: 10,
          timestamp: baseTimestamp + 518400000
        });

        if (weekOffset < 2) {
          visits.push({
            domain: 'coursera.org',
            path: '/course',
            title: 'Learning Python Programming',
            category: 'educational',
            credibility: 8.0,
            politicalBias: 'unknown',
            tone: 'uplifting',
            duration: 30,
            timestamp: baseTimestamp + 604800000
          });
        }
      }

      const categories = {};
      visits.forEach(v => {
        categories[v.category] = (categories[v.category] || 0) + 1;
      });

      const weekData = {
        visits,
        domains: new Set(visits.map(v => v.domain)),
        categories,
        totalTime: visits.reduce((sum, v) => sum + v.duration, 0)
      };

      // Calculate and store scores for this week
      const scores = {
        sourceDiversity: Math.min(weekData.domains.size / 10, 1) * 10,
        contentBalance: 6.5 + (Math.sin(weekOffset * 0.5) * 1.5),
        timeManagement: 7.0 + (Math.cos(weekOffset * 0.4) * 1.2),
        credibility: 6.8 + (weekOffset * 0.2),
        contentTone: 6.0 + (Math.sin(weekOffset * 0.6) * 1.8),
        politicalBalance: 7.2 + (Math.cos(weekOffset * 0.3) * 0.8)
      };
      scores.overallHealth = Object.values(scores).reduce((sum, s) => sum + s, 0) / 6;

      weekData.scores = scores;
      this.userData.weeklyData[weekKey] = weekData;
    }

    // Set current scores to the most recent week
    const currentWeekKey = this.getWeekKey();
    if (this.userData.weeklyData[currentWeekKey]?.scores) {
      this.userData.scores = { ...this.userData.weeklyData[currentWeekKey].scores };
    }

    // Save the sample data
    this.saveTrackingState();
  }

  startTracking() {
    this.isTracking = true;
    this.currentSession.startTime = Date.now();
    this.saveTrackingState();
  }

  stopTracking() {
    this.isTracking = false;
    this.saveTrackingState();
  }

  async trackPageVisit(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname;
    const path = url.pathname;
    
    // Get page content for analysis
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      
      if (response && response.content) {
        this.analyzePageContent(domain, path, response.content, tab.title);
      }
    } catch (error) {
      // Fallback to basic tracking without content analysis
      this.trackBasicVisit(domain, path, tab.title);
    }
  }

  trackBasicVisit(domain, path, title) {
    // Sanitize inputs
    const sanitizedDomain = this.sanitizeDomain(domain);
    const sanitizedPath = this.sanitizeText(path);
    const sanitizedTitle = this.sanitizeText(title);
    
    const credibility = this.assessCredibility(sanitizedDomain);
    const visitData = {
      domain: sanitizedDomain,
      path: sanitizedPath,
      title: sanitizedTitle,
      timestamp: Date.now(),
      duration: 0,
      category: this.getSourceCategory(sanitizedDomain) || this.categorizeContent(sanitizedDomain, sanitizedPath, sanitizedTitle),
      credibility: credibility,
      credibilityKnown: credibility !== null,
      politicalBias: this.assessPoliticalBias(sanitizedDomain),
      tone: this.assessTone(sanitizedTitle),
      sourceName: this.getSourceName(sanitizedDomain)
    };

    // Update current session
    if (this.currentSession.currentSite && this.currentSession.currentSite.domain === domain) {
      // Same site, update duration
      this.currentSession.currentSite.duration += 1;
    } else {
      // New site
      if (this.currentSession.currentSite) {
        this.saveSiteVisit(this.currentSession.currentSite);
      }
      this.currentSession.currentSite = visitData;
    }

    // Save to storage
    this.saveVisitData(visitData);
  }

  analyzePageContent(domain, path, content, title) {
    const credibility = this.assessCredibility(domain);
    const visitData = {
      domain,
      path,
      title,
      timestamp: Date.now(),
      duration: 0,
      category: this.getSourceCategory(domain) || this.categorizeContent(domain, path, title),
      credibility: credibility,
      credibilityKnown: credibility !== null,
      politicalBias: this.assessPoliticalBias(domain),
      tone: this.assessTone(title, content),
      sourceName: this.getSourceName(domain)
    };

    // Update current session
    if (this.currentSession.currentSite && this.currentSession.currentSite.domain === domain) {
      this.currentSession.currentSite.duration += 1;
    } else {
      if (this.currentSession.currentSite) {
        this.saveSiteVisit(this.currentSession.currentSite);
      }
      this.currentSession.currentSite = visitData;
    }

    this.saveVisitData(visitData);
  }

  categorizeContent(domain, path, title) {
    const domainLower = domain.toLowerCase();
    const titleLower = title.toLowerCase();
    const pathLower = path.toLowerCase();

    // News and Information
    if (domainLower.includes('news') || domainLower.includes('times') || 
        domainLower.includes('post') || domainLower.includes('tribune') ||
        titleLower.includes('news') || titleLower.includes('breaking')) {
      return 'news';
    }

    // Social Media
    if (domainLower.includes('facebook') || domainLower.includes('twitter') || 
        domainLower.includes('instagram') || domainLower.includes('linkedin') ||
        domainLower.includes('reddit') || domainLower.includes('tiktok')) {
      return 'social';
    }

    // Entertainment
    if (domainLower.includes('youtube') || domainLower.includes('netflix') || 
        domainLower.includes('spotify') || domainLower.includes('twitch') ||
        titleLower.includes('entertainment') || titleLower.includes('movie')) {
      return 'entertainment';
    }

    // Educational
    if (domainLower.includes('wikipedia') || domainLower.includes('khan') || 
        domainLower.includes('coursera') || domainLower.includes('ted') ||
        titleLower.includes('learn') || titleLower.includes('tutorial')) {
      return 'educational';
    }

    // Professional
    if (domainLower.includes('linkedin') || domainLower.includes('github') || 
        domainLower.includes('stackoverflow') || domainLower.includes('medium') ||
        titleLower.includes('career') || titleLower.includes('professional')) {
      return 'professional';
    }

    return 'other';
  }

  async loadMediaSources() {
    try {
      const response = await fetch(chrome.runtime.getURL('media-sources.json'));
      const data = await response.json();
      this.mediaSources = data.domains;
      console.log(`Loaded ${Object.keys(this.mediaSources).length} media sources`);
    } catch (error) {
      console.error('Failed to load media sources database:', error);
      this.mediaSources = {};
    }
  }

  getSourceInfo(domain) {
    if (!this.mediaSources) return null;

    const domainLower = domain.toLowerCase();

    // Try exact match first
    if (this.mediaSources[domainLower]) {
      return this.mediaSources[domainLower];
    }

    // Try without www.
    const withoutWww = domainLower.replace(/^www\./, '');
    if (this.mediaSources[withoutWww]) {
      return this.mediaSources[withoutWww];
    }

    // Try to find partial match (for subdomains like news.google.com)
    for (const [sourceDomain, info] of Object.entries(this.mediaSources)) {
      if (domainLower.endsWith('.' + sourceDomain) || domainLower === sourceDomain) {
        return info;
      }
    }

    return null;
  }

  assessCredibility(domain) {
    const sourceInfo = this.getSourceInfo(domain);

    if (sourceInfo && sourceInfo.credibility !== undefined) {
      return sourceInfo.credibility;
    }

    // Fallback for unknown sources
    // TODO: Future LLM integration point for unknown domains
    return null; // Return null to indicate unknown
  }

  assessPoliticalBias(domain) {
    const sourceInfo = this.getSourceInfo(domain);

    if (sourceInfo && sourceInfo.bias) {
      return sourceInfo.bias;
    }

    // Fallback for unknown sources
    // TODO: Future LLM integration point for unknown domains
    return 'unknown';
  }

  getSourceCategory(domain) {
    const sourceInfo = this.getSourceInfo(domain);

    if (sourceInfo && sourceInfo.category) {
      return sourceInfo.category;
    }

    return null;
  }

  getSourceName(domain) {
    const sourceInfo = this.getSourceInfo(domain);

    if (sourceInfo && sourceInfo.name) {
      return sourceInfo.name;
    }

    return domain;
  }

  assessTone(title, content = '') {
    const text = (title + ' ' + content).toLowerCase();
    
    // Cynical indicators
    const cynicalWords = ['broken', 'disaster', 'crisis', 'failed', 'corrupt', 
                         'scandal', 'outrage', 'terrible', 'worst', 'doom'];
    
    // Uplifting indicators
    const upliftingWords = ['hope', 'progress', 'success', 'breakthrough', 
                           'solution', 'improve', 'better', 'positive', 'win', 'achieve'];
    
    let cynicalCount = 0;
    let upliftingCount = 0;
    
    cynicalWords.forEach(word => {
      if (text.includes(word)) cynicalCount++;
    });
    
    upliftingWords.forEach(word => {
      if (text.includes(word)) upliftingCount++;
    });
    
    if (cynicalCount > upliftingCount) {
      return 'cynical';
    } else if (upliftingCount > cynicalCount) {
      return 'uplifting';
    } else {
      return 'neutral';
    }
  }

  saveVisitData(visitData) {
    const weekKey = this.getWeekKey();
    
    chrome.storage.local.get(['userData'], (result) => {
      const userData = result.userData || this.userData;
      
      if (!userData.weeklyData[weekKey]) {
        userData.weeklyData[weekKey] = {
          visits: [],
          domains: new Set(),
          categories: {},
          totalTime: 0
        };
      }
      
      userData.weeklyData[weekKey].visits.push(visitData);
      userData.weeklyData[weekKey].domains.add(visitData.domain);
      
      // Update category counts
      const category = visitData.category;
      userData.weeklyData[weekKey].categories[category] = 
        (userData.weeklyData[weekKey].categories[category] || 0) + 1;
      
      this.userData = userData;
      chrome.storage.local.set({ userData });
      
      // Calculate scores weekly
      this.calculateScores(weekKey);
      
      // Engagement hooks
      this.checkAndShowNotifications(visitData);
      this.updateSessionInsights();
    });
  }

  saveSiteVisit(siteData) {
    // Save the final duration for the site
    const duration = Math.floor((Date.now() - siteData.timestamp) / 1000 / 60); // minutes
    siteData.duration = duration;
    
    const weekKey = this.getWeekKey();
    chrome.storage.local.get(['userData'], (result) => {
      const userData = result.userData || this.userData;
      
      if (userData.weeklyData[weekKey]) {
        userData.weeklyData[weekKey].totalTime += duration;
      }
      
      this.userData = userData;
      chrome.storage.local.set({ userData });
    });
  }

  getWeekKey() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toISOString().split('T')[0];
  }

  calculateScores(weekKey) {
    const weekData = this.userData.weeklyData[weekKey];
    if (!weekData) return;

    // Calculate various scores
    const scores = {
      sourceDiversity: this.calculateSourceDiversityScore(weekData),
      contentBalance: this.calculateContentBalanceScore(weekData),
      timeManagement: this.calculateTimeManagementScore(weekData),
      credibility: this.calculateCredibilityScore(weekData),
      contentTone: this.calculateToneScore(weekData),
      politicalBalance: this.calculatePoliticalBalanceScore(weekData)
    };

    // Calculate overall health score
    scores.overallHealth = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

    // Store scores with the week data for historical tracking
    this.userData.weeklyData[weekKey].scores = { ...scores };

    this.userData.scores = scores;
    chrome.storage.local.set({ userData: this.userData });
  }

  calculateSourceDiversityScore(weekData) {
    const uniqueDomains = weekData.domains.size;
    const score = Math.min(uniqueDomains / 10, 1) * 10; // 10+ domains = 10/10
    return Math.round(score * 10) / 10;
  }

  calculateContentBalanceScore(weekData) {
    const categories = weekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return 0;
    
    // Ideal distribution: news 30%, entertainment 25%, professional 20%, educational 15%, other 10%
    const ideal = { news: 0.3, entertainment: 0.25, professional: 0.2, educational: 0.15, other: 0.1 };
    const actual = {};
    
    Object.keys(ideal).forEach(cat => {
      actual[cat] = (categories[cat] || 0) / total;
    });
    
    // Calculate deviation from ideal
    let deviation = 0;
    Object.keys(ideal).forEach(cat => {
      deviation += Math.abs(actual[cat] - ideal[cat]);
    });
    
    const score = Math.max(0, 10 - deviation * 20); // Max 10, reduce by deviation
    return Math.round(score * 10) / 10;
  }

  calculateTimeManagementScore(weekData) {
    const totalHours = weekData.totalTime / 60;
    const avgDailyHours = totalHours / 7;
    
    // Ideal: 1-3 hours per day
    if (avgDailyHours >= 1 && avgDailyHours <= 3) {
      return 10;
    } else if (avgDailyHours < 1) {
      return 8;
    } else if (avgDailyHours <= 5) {
      return 6;
    } else {
      return 3;
    }
  }

  calculateCredibilityScore(weekData) {
    const visits = weekData.visits;
    if (visits.length === 0) return 0;
    
    const totalCredibility = visits.reduce((sum, visit) => sum + (visit.credibility || 6), 0);
    const avgCredibility = totalCredibility / visits.length;
    
    return Math.round(avgCredibility * 10) / 10;
  }

  calculateToneScore(weekData) {
    const visits = weekData.visits;
    if (visits.length === 0) return 0;
    
    const toneCounts = { cynical: 0, uplifting: 0, neutral: 0 };
    visits.forEach(visit => {
      toneCounts[visit.tone] = (toneCounts[visit.tone] || 0) + 1;
    });
    
    const total = visits.length;
    const cynicalRatio = toneCounts.cynical / total;
    const upliftingRatio = toneCounts.uplifting / total;
    
    // Score based on balance: more uplifting = higher score
    const score = (upliftingRatio * 10) + (toneCounts.neutral / total * 5);
    return Math.round(score * 10) / 10;
  }

  calculatePoliticalBalanceScore(weekData) {
    const visits = weekData.visits;
    if (visits.length === 0) return 0;
    
    const biasCounts = { liberal: 0, conservative: 0, centrist: 0, unknown: 0 };
    visits.forEach(visit => {
      biasCounts[visit.politicalBias] = (biasCounts[visit.politicalBias] || 0) + 1;
    });
    
    const total = visits.length;
    const liberalRatio = biasCounts.liberal / total;
    const conservativeRatio = biasCounts.conservative / total;
    const centristRatio = biasCounts.centrist / total;
    
    // Score based on diversity: more diverse = higher score
    const diversity = 1 - Math.max(liberalRatio, conservativeRatio);
    const score = (diversity * 8) + (centristRatio * 2);
    return Math.round(score * 10) / 10;
  }

  handleTabActivation(activeInfo) {
    // Update current site tracking
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        this.currentSession.currentSite = {
          domain: new URL(tab.url).hostname,
          timestamp: Date.now(),
          duration: 0
        };
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    // Validate request
    if (!request || typeof request !== 'object') {
      sendResponse({ error: 'Invalid request' });
      return;
    }

    // Validate action
    if (!request.action || typeof request.action !== 'string') {
      sendResponse({ error: 'Invalid action' });
      return;
    }

    // Rate limiting check
    if (!this.checkRateLimit(sender)) {
      sendResponse({ error: 'Rate limit exceeded' });
      return;
    }

    switch (request.action) {
      case 'getTrackingState':
        sendResponse({ isTracking: this.isTracking });
        break;
        
      case 'toggleTracking':
        if (this.isTracking) {
          this.stopTracking();
        } else {
          this.startTracking();
        }
        sendResponse({ isTracking: this.isTracking });
        break;
        
      case 'getUserData':
        sendResponse({ userData: this.userData });
        break;
        
      case 'getCurrentScores':
        sendResponse({ scores: this.userData.scores });
        break;
        
      case 'getWeekData':
        const weekKey = this.getWeekKey();
        const weekData = this.userData.weeklyData[weekKey];
        sendResponse({ weekData });
        break;
        
      case 'updateSettings':
        if (request.settings && typeof request.settings === 'object') {
          this.userData.settings = { ...this.userData.settings, ...this.sanitizeSettings(request.settings) };
          this.saveTrackingState();
          sendResponse({ success: true });
        } else {
          sendResponse({ error: 'Invalid settings data' });
        }
        break;
        
      case 'clearAllData':
        this.userData = this.initializeUserData();
        this.saveTrackingState();
        sendResponse({ success: true });
        break;
        
      case 'enableEncryption':
        if (request.password && request.password.length >= 8) {
          const success = await this.enableEncryption(request.password);
          sendResponse({ success });
        } else {
          sendResponse({ success: false, error: 'Invalid password' });
        }
        break;
        
      case 'disableEncryption':
        const success = await this.disableEncryption();
        sendResponse({ success });
        break;
        
      case 'testBadge':
        const testScore = request.score || 7.0;
        await this.updateExtensionBadge(testScore);
        sendResponse({ success: true, score: testScore });
        break;
        
      case 'analyzePageForTab':
        const pageData = await this.analyzePageForTab(request.pageInfo);
        sendResponse({ pageData });
        break;
        
      case 'generateReport':
        const report = this.generateWeeklyReport();
        sendResponse({ report });
        break;

      case 'importBrowserHistory':
        this.importBrowserHistory(request.days || 90).then(result => {
          sendResponse(result);
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  generateWeeklyReport() {
    const weekKey = this.getWeekKey();
    const weekData = this.userData.weeklyData[weekKey];
    
    if (!weekData) {
      return { error: 'No data for current week' };
    }
    
    return {
      weekKey,
      scores: this.userData.scores,
      summary: {
        totalVisits: weekData.visits.length,
        uniqueDomains: weekData.domains.size,
        totalTime: weekData.totalTime,
        categories: weekData.categories
      },
      insights: this.generateInsights(weekData)
    };
  }

  async importBrowserHistory(days = 90) {
    try {
      // Check if we have the history permission
      const hasPermission = await chrome.permissions.contains({ permissions: ['history'] });
      if (!hasPermission) {
        return { success: false, error: 'History permission not granted' };
      }

      // Calculate time range
      const endTime = Date.now();
      const startTime = endTime - (days * 24 * 60 * 60 * 1000);

      // Search browser history
      const historyItems = await chrome.history.search({
        text: '',
        startTime: startTime,
        endTime: endTime,
        maxResults: 10000
      });

      let imported = 0;

      for (const item of historyItems) {
        // Skip chrome:// and extension pages
        if (!item.url || item.url.startsWith('chrome://') || item.url.startsWith('chrome-extension://')) {
          continue;
        }

        try {
          const url = new URL(item.url);
          const domain = this.sanitizeDomain(url.hostname);
          const path = this.sanitizeText(url.pathname);
          const title = this.sanitizeText(item.title || '');

          // Create visit data
          const credibility = this.assessCredibility(domain);
          const visitData = {
            domain: domain,
            path: path,
            title: title,
            timestamp: item.lastVisitTime || Date.now(),
            duration: 0,  // Unknown for historical data
            category: this.getSourceCategory(domain) || this.categorizeContent(domain, path, title),
            credibility: credibility,
            credibilityKnown: credibility !== null,
            politicalBias: this.assessPoliticalBias(domain),
            tone: this.assessTone(title),
            sourceName: this.getSourceName(domain),
            imported: true  // Mark as imported
          };

          // Determine which week this visit belongs to
          const visitDate = new Date(visitData.timestamp);
          const startOfWeek = new Date(visitDate);
          startOfWeek.setDate(visitDate.getDate() - visitDate.getDay());
          const weekKey = startOfWeek.toISOString().split('T')[0];

          // Initialize week data if needed
          if (!this.userData.weeklyData[weekKey]) {
            this.userData.weeklyData[weekKey] = {
              visits: [],
              domains: new Set(),
              categories: {},
              totalTime: 0
            };
          }

          // Check if this visit already exists (avoid duplicates)
          const existingVisit = this.userData.weeklyData[weekKey].visits.find(
            v => v.domain === visitData.domain && v.timestamp === visitData.timestamp
          );

          if (!existingVisit) {
            this.userData.weeklyData[weekKey].visits.push(visitData);
            this.userData.weeklyData[weekKey].domains.add(visitData.domain);
            this.userData.weeklyData[weekKey].categories[visitData.category] =
              (this.userData.weeklyData[weekKey].categories[visitData.category] || 0) + 1;
            imported++;
          }
        } catch (e) {
          // Skip invalid URLs
          continue;
        }
      }

      // Recalculate scores for all affected weeks
      Object.keys(this.userData.weeklyData).forEach(weekKey => {
        this.calculateScores(weekKey);
      });

      // Save the data
      await this.saveTrackingState();

      return { success: true, imported: imported };
    } catch (error) {
      console.error('Error importing browser history:', error);
      return { success: false, error: error.message };
    }
  }

  generateInsights(weekData) {
    const insights = [];
    
    // Source diversity insight
    if (weekData.domains.size >= 10) {
      insights.push({ type: 'positive', message: `Great source diversity! You visited ${weekData.domains.size} different websites.` });
    } else {
      insights.push({ type: 'warning', message: `Consider visiting more diverse sources. You visited ${weekData.domains.size} websites.` });
    }
    
    // Content balance insight
    const categories = weekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (categories.news && categories.news / total > 0.5) {
      insights.push({ type: 'warning', message: 'You\'re consuming a lot of news content. Consider adding more entertainment or educational content.' });
    }
    
    if (categories.educational && categories.educational / total < 0.1) {
      insights.push({ type: 'suggestion', message: 'Try adding more educational content to your digital diet.' });
    }
    
    return insights;
  }

  async saveTrackingState() {
    try {
      const dataToStore = {
        isTracking: this.isTracking,
        userData: this.userData,
        encryptionEnabled: this.encryptionEnabled
      };

      if (this.encryptionEnabled) {
        const encryptedData = await this.encryptData(dataToStore);
        await chrome.storage.local.set({ 
          encryptedData: encryptedData,
          encryptionEnabled: true
        });
      } else {
        await chrome.storage.local.set(dataToStore);
      }
    } catch (error) {
      console.error('Failed to save tracking state:', error);
    }
  }

  // Security helper functions
  checkRateLimit(sender) {
    const senderId = sender.id || sender.tab?.id || 'unknown';
    const now = Date.now();
    const minuteAgo = now - 60000;
    
    if (!this.rateLimitMap.has(senderId)) {
      this.rateLimitMap.set(senderId, []);
    }
    
    const requests = this.rateLimitMap.get(senderId);
    const recentRequests = requests.filter(time => time > minuteAgo);
    
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimitMap.set(senderId, recentRequests);
    return true;
  }

  sanitizeSettings(settings) {
    const sanitized = {};
    
    // Data retention (0-365 days)
    if (settings.dataRetention !== undefined) {
      const retention = parseInt(settings.dataRetention);
      if (!isNaN(retention) && retention >= 0 && retention <= 365) {
        sanitized.dataRetention = retention;
      }
    }
    
    // Boolean settings
    const booleanSettings = [
      'contentAnalysis', 'timeTracking', 'tabIndicators', 'trackNews', 'trackSocial',
      'trackEntertainment', 'trackEducational', 'trackProfessional',
      'smartNotifications', 'toneAlerts', 'credibilityWarnings', 'echoChamberAlerts', 'sessionInsights',
      'weeklyReportNotification', 'dailyGoalNotification', 'timeLimitNotification'
    ];
    
    booleanSettings.forEach(setting => {
      if (settings[setting] !== undefined) {
        sanitized[setting] = Boolean(settings[setting]);
      }
    });
    
    // Numeric settings with ranges
    if (settings.dailyTimeLimit !== undefined) {
      const limit = parseFloat(settings.dailyTimeLimit);
      if (!isNaN(limit) && limit >= 0 && limit <= 24) {
        sanitized.dailyTimeLimit = limit;
      }
    }
    
    if (settings.educationalGoal !== undefined) {
      const goal = parseInt(settings.educationalGoal);
      if (!isNaN(goal) && goal >= 0 && goal <= 50) {
        sanitized.educationalGoal = goal;
      }
    }
    
    if (settings.sourceDiversityGoal !== undefined) {
      const goal = parseInt(settings.sourceDiversityGoal);
      if (!isNaN(goal) && goal >= 5 && goal <= 50) {
        sanitized.sourceDiversityGoal = goal;
      }
    }
    
    if (settings.upliftingGoal !== undefined) {
      const goal = parseInt(settings.upliftingGoal);
      if (!isNaN(goal) && goal >= 20 && goal <= 80) {
        sanitized.upliftingGoal = goal;
      }
    }
    
    if (settings.weeklyReportDay !== undefined) {
      const day = parseInt(settings.weeklyReportDay);
      if (!isNaN(day) && day >= 0 && day <= 6) {
        sanitized.weeklyReportDay = day;
      }
    }
    
    if (settings.sessionBreakTime !== undefined) {
      const time = parseInt(settings.sessionBreakTime);
      if (!isNaN(time) && time >= 5 && time <= 60) {
        sanitized.sessionBreakTime = time;
      }
    }
    
    // Time settings (HH:MM format)
    if (settings.trackingStart && this.isValidTimeFormat(settings.trackingStart)) {
      sanitized.trackingStart = settings.trackingStart;
    }
    
    if (settings.trackingEnd && this.isValidTimeFormat(settings.trackingEnd)) {
      sanitized.trackingEnd = settings.trackingEnd;
    }
    
    if (settings.reportTime && this.isValidTimeFormat(settings.reportTime)) {
      sanitized.reportTime = settings.reportTime;
    }
    
    return sanitized;
  }

  isValidTimeFormat(timeString) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  sanitizeDomain(domain) {
    // Remove any potentially dangerous characters
    return domain.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
  }

  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    // Remove script tags and other potentially dangerous content
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Encryption helper functions
  async generateEncryptionKey() {
    // Generate a random encryption key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  async deriveKeyFromPassword(password) {
    // Derive encryption key from user password
    const encoder = new TextEncoder();
    const salt = encoder.encode('mindset-salt-2024');
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encryptData(data) {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return data;
    }

    try {
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBuffer = encoder.encode(dataString);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.encryptionKey,
        dataBuffer
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      return data; // Fallback to unencrypted
    }
  }

  async decryptData(encryptedData) {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return encryptedData;
    }

    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);
      
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.encryptionKey,
        encryptedBuffer
      );
      
      // Convert back to string and parse JSON
      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData; // Fallback to encrypted data
    }
  }

  async enableEncryption(password) {
    try {
      this.encryptionKey = await this.deriveKeyFromPassword(password);
      this.encryptionEnabled = true;
      
      // Re-encrypt existing data
      await this.reEncryptAllData();
      
      return true;
    } catch (error) {
      console.error('Failed to enable encryption:', error);
      return false;
    }
  }

  async disableEncryption() {
    try {
      // Decrypt all data before disabling
      await this.reEncryptAllData();
      
      this.encryptionEnabled = false;
      this.encryptionKey = null;
      
      return true;
    } catch (error) {
      console.error('Failed to disable encryption:', error);
      return false;
    }
  }

  async reEncryptAllData() {
    if (!this.userData) return;

    try {
      // Get current data
      const currentData = { ...this.userData };
      
      // Clear storage
      await chrome.storage.local.clear();
      
      // Save with new encryption state
      await this.saveTrackingState();
      
      console.log('Data re-encryption completed');
    } catch (error) {
      console.error('Failed to re-encrypt data:', error);
    }
  }

  // Engagement hooks and real-time feedback
  async updateExtensionBadge(score) {
    const now = Date.now();
    if (now - this.lastBadgeUpdate < 5000) return; // Throttle updates
    
    this.lastBadgeUpdate = now;
    
    let badgeText = '';
    let badgeColor = '#4CAF50'; // Green
    
    if (score >= 8.0) {
      badgeText = '😊';
      badgeColor = '#4CAF50'; // Green
    } else if (score >= 6.0) {
      badgeText = '😐';
      badgeColor = '#FF9800'; // Orange
    } else {
      badgeText = '😟';
      badgeColor = '#F44336'; // Red
    }
    
    // Fallback to simple text if emoji doesn't work
    if (!badgeText) {
      if (score >= 8.0) {
        badgeText = 'G';
      } else if (score >= 6.0) {
        badgeText = 'Y';
      } else {
        badgeText = 'R';
      }
    }
    
    console.log(`Updating badge: ${badgeText} with color ${badgeColor} for score ${score}`);
    
    try {
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
      console.log('Badge updated successfully');
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  async checkAndShowNotifications(visitData) {
    if (!this.userData?.settings?.smartNotifications) return;
    
    const now = Date.now();
    const cooldownKey = visitData.domain;
    const lastNotification = this.notificationCooldowns.get(cooldownKey) || 0;
    
    // Check cooldown (don't spam notifications)
    if (now - lastNotification < 300000) return; // 5 minutes
    
    const notifications = [];
    
    // Check content tone
    if (visitData.tone === 'cynical' && this.userData?.settings?.toneAlerts) {
      notifications.push({
        type: 'tone',
        title: 'Cynical Content Detected',
        message: `You're reading content with a cynical tone. Consider balancing with uplifting content.`,
        icon: '😔'
      });
    }
    
    // Check credibility
    if (visitData.credibility < 6.0 && this.userData?.settings?.credibilityWarnings) {
      notifications.push({
        type: 'credibility',
        title: 'Low Credibility Source',
        message: `This source has a credibility score of ${visitData.credibility.toFixed(1)}/10. Consider fact-checking.`,
        icon: '⚠️'
      });
    }
    
    // Check echo chamber (same domain visited multiple times)
    if (this.userData?.settings?.echoChamberAlerts) {
      const weekKey = this.getWeekKey();
      const weekData = this.userData.weeklyData[weekKey];
      if (weekData?.visits) {
        const domainVisits = weekData.visits.filter(v => v.domain === visitData.domain).length;
        if (domainVisits > 3) {
          notifications.push({
            type: 'echo_chamber',
            title: 'Echo Chamber Alert',
            message: `You've visited ${visitData.domain} ${domainVisits} times this week. Consider diversifying your sources.`,
            icon: '🔄'
          });
        }
      }
    }
    
    // Show notifications
    for (const notification of notifications) {
      await this.showNotification(notification);
      this.notificationCooldowns.set(cooldownKey, now);
    }
  }

  async showNotification(notification) {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzY2N0VFQSIvPgo8cGF0aCBkPSJNMjQgMTJMMzYgMjRMMjQgMzZMMTIgMjRMMjQgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
        title: `Mindset: ${notification.title}`,
        message: notification.message
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  calculateSessionScore() {
    if (!this.currentSession.sites || this.currentSession.sites.size === 0) {
      return 7.0;
    }
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [domain, siteData] of this.currentSession.sites) {
      const weight = siteData.duration || 1;
      const score = this.calculateSiteScore(siteData);
      totalScore += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 7.0;
  }

  calculateSiteScore(siteData) {
    let score = 7.0; // Base score
    
    // Adjust for credibility
    if (siteData.credibility) {
      score += (siteData.credibility - 5.0) * 0.2;
    }
    
    // Adjust for tone
    if (siteData.tone === 'uplifting') {
      score += 0.5;
    } else if (siteData.tone === 'cynical') {
      score -= 0.5;
    }
    
    // Adjust for content diversity
    if (siteData.category === 'educational') {
      score += 0.3;
    } else if (siteData.category === 'social') {
      score -= 0.2;
    }
    
    return Math.max(1.0, Math.min(10.0, score));
  }

  async updateSessionInsights() {
    const sessionScore = this.calculateSessionScore();
    this.currentSessionScore = sessionScore;
    
    // Update badge
    await this.updateExtensionBadge(sessionScore);
    
    // Check for session insights
    if (this.userData?.settings?.sessionInsights) {
      const sessionDuration = Date.now() - this.currentSession.startTime;
      const sessionMinutes = Math.floor(sessionDuration / 60000);
      
      if (sessionMinutes >= 30 && sessionMinutes % 30 === 0) {
        await this.showSessionInsight(sessionMinutes, sessionScore);
      }
    }
  }

  async showSessionInsight(duration, score) {
    let message = '';
    let title = 'Session Insight';
    
    if (score >= 8.0) {
      title = 'Great Session! 🎉';
      message = `You've been consuming high-quality content for ${duration} minutes. Keep it up!`;
    } else if (score >= 6.0) {
      title = 'Balanced Session 📊';
      message = `Your ${duration}-minute session shows a balanced content diet. Consider adding some educational content.`;
    } else {
      title = 'Session Alert ⚠️';
      message = `Your ${duration}-minute session could be more balanced. Try mixing in some credible news or educational content.`;
    }
    
    await this.showNotification({ title, message, type: 'session_insight' });
  }

  async analyzePageForTab(pageInfo) {
    try {
      const { domain, path, title } = pageInfo;
      
      // Sanitize inputs
      const sanitizedDomain = this.sanitizeDomain(domain);
      const sanitizedPath = this.sanitizeText(path);
      const sanitizedTitle = this.sanitizeText(title);
      
      // Analyze the page
      const category = this.categorizeContent(sanitizedDomain, sanitizedPath, sanitizedTitle);
      const credibility = this.assessCredibility(sanitizedDomain);
      const politicalBias = this.assessPoliticalBias(sanitizedDomain);
      const tone = this.assessTone(sanitizedTitle);
      
      return {
        category,
        credibility,
        politicalBias,
        tone,
        domain: sanitizedDomain,
        title: sanitizedTitle
      };
    } catch (error) {
      console.error('Error analyzing page for tab indicator:', error);
      return {
        category: 'unknown',
        credibility: 5.0,
        politicalBias: 'unknown',
        tone: 'neutral',
        domain: pageInfo.domain,
        title: pageInfo.title
      };
    }
  }
}

// Initialize the tracker
const mindsetTracker = new MindsetTracker(); 