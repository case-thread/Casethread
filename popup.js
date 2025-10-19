// Legal Judgment Analyzer - Popup Script
class LegalJudgmentAnalyzer {
    constructor() {
        this.currentAnalysis = null;
        this.currentUrl = null;
        this.initializeElements();
        this.bindEvents();
        this.loadCachedResult();
        this.setVersionNumber();
        this.initializeModelSelection();
    }

    initializeElements() {
        // State containers
        this.initialState = document.getElementById('initial-state');
        this.loadingState = document.getElementById('loading-state');
        this.resultsState = document.getElementById('results-state');
        this.errorState = document.getElementById('error-state');

        // Buttons
        this.analyzeBtn = document.getElementById('analyze-btn');
        this.kbHomepageBtn = document.getElementById('kb-homepage-btn');
        this.apiSetupBtn = document.getElementById('api-setup-btn');
        this.clearCacheBtn = document.getElementById('clear-cache-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.saveToKbBtn = document.getElementById('save-to-kb-btn');
        this.searchKbBtn = document.getElementById('search-kb-btn');
        this.refreshAnalysisBtn = document.getElementById('refresh-analysis-btn');
        this.newAnalysisBtn = document.getElementById('new-analysis-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.debugBtn = document.getElementById('debug-btn');
        this.apiSetupErrorBtn = document.getElementById('api-setup-error-btn');
        this.disclaimerBtn = document.getElementById('disclaimer-btn');
        this.disclaimerTooltip = document.getElementById('disclaimer-tooltip');
        
        // Options
        this.modelSelectionContainer = document.getElementById('model-selection-container');
        this.enableCrossCheckCheckbox = document.getElementById('enable-cross-check');
        this.crossCheckModelContainer = document.getElementById('cross-check-model-container');
        this.crossCheckModelGroup = document.getElementById('cross-check-model-group');

        // Content areas
        this.jsonViewer = document.getElementById('json-viewer');
        this.errorMessage = document.getElementById('error-message');
        this.debugInfo = document.getElementById('debug-info');
        this.debugContent = document.getElementById('debug-content');
        this.cacheIndicator = document.getElementById('cache-indicator');
        this.verificationBadge = document.getElementById('verification-badge');
        this.crossCheckOptions = document.getElementById('cross-check-options');
        this.verifySecondaryAiBtn = document.getElementById('verify-secondary-ai-btn');
        this.verifyFlashBtn = document.getElementById('verify-flash-btn');
        this.verifyFlashLiteBtn = document.getElementById('verify-flash-lite-btn');
        this.verifyProBtn = document.getElementById('verify-pro-btn');
        this.verifyGrokBtn = document.getElementById('verify-grok-btn');
        this.crossCheckSummary = document.getElementById('cross-check-summary');
        this.crossCheckSummaryContent = document.getElementById('cross-check-summary-content');
        this.crossCheckLoadingNote = document.getElementById('cross-check-loading-note');
        
        // Loading elements
        this.loadingText = document.getElementById('loading-text');
        this.loadingModels = document.getElementById('loading-models');
        this.loadingSubtext = document.getElementById('loading-subtext');
        this.loadingProgress = document.getElementById('loading-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        
        // Knowledge Base elements
        this.kbSaveModal = document.getElementById('kb-save-modal');
        this.kbSearchModal = document.getElementById('kb-search-modal');
        this.kbDetailModal = document.getElementById('kb-detail-modal');
        this.kbEditModal = document.getElementById('kb-edit-modal');
        this.kbDeleteModal = document.getElementById('kb-delete-modal');
        this.kbLabelInput = document.getElementById('kb-label');
        this.kbTagsInput = document.getElementById('kb-tags');
        this.kbNotesInput = document.getElementById('kb-notes');
        this.kbCasePreview = document.getElementById('kb-case-preview');
        this.kbEditLabelInput = document.getElementById('kb-edit-label');
        this.kbEditTagsInput = document.getElementById('kb-edit-tags');
        this.kbEditNotesInput = document.getElementById('kb-edit-notes');
        this.kbEditCasePreview = document.getElementById('kb-edit-case-preview');
        this.kbDeletePreview = document.getElementById('kb-delete-preview');
        this.kbSearchInput = document.getElementById('kb-search-input');
        this.kbResults = document.getElementById('kb-results');
        this.kbStats = document.getElementById('kb-stats');
        this.kbDetailContent = document.getElementById('kb-detail-content');
        this.kbDetailTitle = document.getElementById('kb-detail-title');
        this.versionBadge = document.getElementById('version-badge');
    }

    bindEvents() {
        this.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        this.kbHomepageBtn.addEventListener('click', () => this.showSearchKbModal());
        this.apiSetupBtn.addEventListener('click', () => this.openOptionsPage());
        this.clearCacheBtn.addEventListener('click', () => this.clearAllCache());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadJSON());
        this.saveToKbBtn.addEventListener('click', () => this.showSaveToKbModal());
        this.searchKbBtn.addEventListener('click', () => this.showSearchKbModal());
        
        // Bind both refresh buttons (legacy and new)
        if (this.refreshAnalysisBtn) {
            this.refreshAnalysisBtn.addEventListener('click', () => this.refreshAnalysis());
        }
        if (this.newAnalysisBtn) {
            this.newAnalysisBtn.addEventListener('click', () => this.abandonAndReturnHome());
        }
        
        // Bind cross-check toggle button
        if (this.verifySecondaryAiBtn) {
            this.verifySecondaryAiBtn.addEventListener('click', () => this.toggleCrossCheckOptions());
        }
        
        // Bind individual model cross-check buttons
        if (this.verifyFlashBtn) {
            this.verifyFlashBtn.addEventListener('click', () => this.runCrossCheckWithModel('gemini-flash'));
        }
        if (this.verifyFlashLiteBtn) {
            this.verifyFlashLiteBtn.addEventListener('click', () => this.runCrossCheckWithModel('gemini-flash-lite'));
        }
        if (this.verifyProBtn) {
            this.verifyProBtn.addEventListener('click', () => this.runCrossCheckWithModel('gemini-pro'));
        }
        if (this.verifyGrokBtn) {
            this.verifyGrokBtn.addEventListener('click', () => this.runCrossCheckWithModel('grok'));
        }
        
        this.retryBtn.addEventListener('click', () => this.startAnalysis());
        this.debugBtn.addEventListener('click', () => this.toggleDebugInfo());
        this.apiSetupErrorBtn.addEventListener('click', () => this.openOptionsPage());
        
        // Disclaimer link - toggle on hover and click
        if (this.disclaimerBtn && this.disclaimerTooltip) {
            this.disclaimerBtn.addEventListener('mouseenter', () => this.showDisclaimer());
            this.disclaimerBtn.addEventListener('mouseleave', () => this.hideDisclaimerDelayed());
            this.disclaimerBtn.addEventListener('click', (e) => {
                e.preventDefault();  // Prevent default link behavior
                this.toggleDisclaimer();
            });
            
            // Allow hovering over tooltip without hiding it
            this.disclaimerTooltip.addEventListener('mouseenter', () => this.cancelHideDisclaimer());
            this.disclaimerTooltip.addEventListener('mouseleave', () => this.hideDisclaimerDelayed());
        }
        
        // Knowledge Base modal event listeners
        this.bindKnowledgeBaseEvents();
        
        
        // Handle cross-check checkbox changes
        if (this.enableCrossCheckCheckbox) {
            this.enableCrossCheckCheckbox.addEventListener('change', async () => {
                this.crossCheckModelGroup.style.display = this.enableCrossCheckCheckbox.checked ? 'block' : 'none';
                await this.saveModelPreferences();
            });
        }
    }

    async saveModelPreferences() {
        const primaryModelSelect = document.getElementById('primary-model');
        const secondaryModelSelect = document.getElementById('secondary-model');
        
        const preferences = {
            primary_model: primaryModelSelect?.value || 'gemini-pro',
            enable_cross_check: this.enableCrossCheckCheckbox?.checked || false,
            secondary_model: secondaryModelSelect?.value || 'gemini-flash'
        };
        
        await chrome.storage.local.set(preferences);
        console.log('Model preferences saved:', preferences);
    }
    
    async loadModelPreferences() {
        const settings = await chrome.storage.local.get([
            'primary_model', 
            'enable_cross_check', 
            'secondary_model'
        ]);
        
        const primaryModelSelect = document.getElementById('primary-model');
        const secondaryModelSelect = document.getElementById('secondary-model');
        
        if (primaryModelSelect) {
            primaryModelSelect.value = settings.primary_model || 'gemini-pro';
        }
        
        if (this.enableCrossCheckCheckbox) {
            this.enableCrossCheckCheckbox.checked = settings.enable_cross_check || false;
            this.crossCheckModelGroup.style.display = settings.enable_cross_check ? 'block' : 'none';
        }
        
        if (secondaryModelSelect) {
            secondaryModelSelect.value = settings.secondary_model || 'gemini-flash';
        }
        
        this.updateSecondaryModelOptions();
    }
    
    updateSecondaryModelOptions() {
        const primaryModelSelect = document.getElementById('primary-model');
        const secondaryModelSelect = document.getElementById('secondary-model');
        
        if (!primaryModelSelect || !secondaryModelSelect) return;
        
        const primaryModel = primaryModelSelect.value;
        const currentSecondary = secondaryModelSelect.value;
        
        // If secondary is same as primary, switch to a different model
        if (currentSecondary === primaryModel) {
            // Choose a different model
            if (primaryModel === 'gemini-pro') {
                secondaryModelSelect.value = 'gemini-flash';
            } else if (primaryModel === 'gemini-flash') {
                secondaryModelSelect.value = 'gemini-pro';
            } else if (primaryModel === 'grok') {
                secondaryModelSelect.value = 'gemini-flash';
            } else {
                secondaryModelSelect.value = 'gemini-flash';
            }
        }
    }

    async loadCachedResult() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url) {
                return;
            }

            this.currentUrl = tab.url;
            
            // Load model preferences
            await this.loadModelPreferences();
            

            // Try to load cached result for this URL
            const cacheKey = `analysis_${this.hashUrl(tab.url)}`;
            const result = await chrome.storage.local.get([cacheKey]);
            
            if (result[cacheKey]) {
                const cached = result[cacheKey];
                
                // Check if cache is not too old (7 days)
                const cacheAge = Date.now() - (cached.timestamp || 0);
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
                
                if (cacheAge < maxAge) {
                    console.log('Loading cached analysis for this page');
                    // Handle both old format (data only) and new format (analysis + sourceText + modelConfig)
                    if (cached.data.analysis) {
                        this.currentAnalysis = cached.data.analysis;
                        this.currentSourceText = cached.data.sourceText;
                        
                        // Restore model config if available
                        if (cached.data.modelConfig && !this.currentAnalysis._modelConfig) {
                            this.currentAnalysis._modelConfig = cached.data.modelConfig;
                        }
                        
                        this.displayResults(cached.data.analysis, true);
                    } else {
                        this.currentAnalysis = cached.data;
                        this.currentSourceText = null;
                        this.displayResults(cached.data, true);
                    }
                } else {
                    console.log('Cache expired, showing initial state');
                    this.showInitial();
                }
            } else {
                console.log('No cached analysis found, showing initial state');
                this.showInitial();
            }
        } catch (error) {
            console.error('Error loading cached result:', error);
            this.showInitial();
        }
    }

    hashUrl(url) {
        // Simple hash function for URL
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    showInitial() {
        this.hideAllStates();
        this.initialState.classList.remove('hidden');
    }

    async startAnalysis() {
        this.showLoading();

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url) {
                throw new Error('Unable to access the current tab');
            }

            // Check if URL is accessible (not chrome:// or extension pages)
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
                tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                throw new Error('Cannot analyze browser internal pages. Please navigate to a web page.');
            }

            // Check if this is a PDF - we cannot analyze PDFs due to Chrome security restrictions
            const isPDF = tab.url.toLowerCase().includes('.pdf');
            if (isPDF) {
                throw new Error('PDF files cannot be analyzed due to Chrome security restrictions.\n\n' +
                    '✅ Workaround: Most judgment PDFs are also available as HTML.\n' +
                    '1. Search for the case name on open source databases\n' +
                    '2. Open the HTML version\n' +
                    '3. Analyze using this extension\n\n' +
                    'Example: Instead of a PDF, search for the case citation on public open source databases.');
            }

            let response = null;
            
            // Try to send message to content script
            try {
                response = await chrome.tabs.sendMessage(tab.id, { 
                    action: 'extractJudgment' 
                });
            } catch (error) {
                // Content script not loaded, try to inject it dynamically
                console.log('Content script not found, injecting...');
                
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    
                    // Wait a bit for script to initialize
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Try again
                    response = await chrome.tabs.sendMessage(tab.id, { 
                        action: 'extractJudgment' 
                    });
                } catch (injectError) {
                    console.error('Injection error:', injectError);
                    throw new Error('Unable to access page content. Please refresh the page and try again.');
                }
            }

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to extract judgment text');
            }

            // Get model preferences
            const primaryModelSelect = document.getElementById('primary-model');
            const secondaryModelSelect = document.getElementById('secondary-model');
            const primaryModel = primaryModelSelect?.value || 'gemini-pro';
            const enableCrossCheck = this.enableCrossCheckCheckbox?.checked || false;
            const secondaryModel = secondaryModelSelect?.value || 'gemini-flash';
            
            console.log('Starting analysis with models:', {
                primary: primaryModel,
                crossCheck: enableCrossCheck,
                secondary: secondaryModel
            });
            
            console.log('Extracted judgment data before sending to background:', {
                hasTitle: !!response.title,
                titleLength: response.title?.length || 0,
                titlePreview: response.title?.substring(0, 100),
                hasCitation: !!response.citation,
                citationLength: response.citation?.length || 0,
                hasText: !!response.text,
                textLength: response.text?.length || 0,
                textPreview: response.text?.substring(0, 300)
            });
            
            const analysisResult = await chrome.runtime.sendMessage({
                action: 'analyzeJudgment',
                data: {
                    title: response.title,
                    citation: response.citation,
                    text: response.text,
                    url: tab.url,
                    primaryModel: primaryModel,
                    enableCrossCheck: enableCrossCheck,
                    secondaryModel: secondaryModel
                }
            });

            if (!analysisResult.success) {
                throw new Error(analysisResult.error || 'Analysis failed');
            }

            this.currentAnalysis = analysisResult.data;
            this.currentSourceText = response.text; // Store source text for later verification
            
            // Store model configuration
            this.currentAnalysis._modelConfig = {
                primaryModel: primaryModel,
                enableCrossCheck: enableCrossCheck,
                secondaryModel: secondaryModel
            };
            
            // Complete progress animation
            this.completeProgress();
            
            // Save to cache (include source text and model config)
            await this.cacheResult(tab.url, {
                analysis: analysisResult.data,
                sourceText: response.text,
                modelConfig: {
                    primaryModel: primaryModel,
                    enableCrossCheck: enableCrossCheck,
                    secondaryModel: secondaryModel
                }
            });
            
            this.displayResults(analysisResult.data);

        } catch (error) {
            console.error('Analysis error:', error);
            
            // Get more detailed error information
            let errorMessage = error.message || 'An unknown error occurred';
            let errorDetails = error;
            
            // Check if it's a connection error
            if (error.message && error.message.includes('connection')) {
                errorMessage = 'Could not connect to the page. Please refresh the page and try again.';
            }
            
            // Check if it's an extraction error  
            if (error.message && error.message.includes('extract')) {
                errorMessage = 'Failed to extract judgment text. ' + error.message;
            }
            
            this.showError(errorMessage, errorDetails);
        }
    }

    async cacheResult(url, data) {
        try {
            const cacheKey = `analysis_${this.hashUrl(url)}`;
            await chrome.storage.local.set({
                [cacheKey]: {
                    url: url,
                    data: data,
                    timestamp: Date.now()
                }
            });
            console.log('Analysis cached for:', url);
        } catch (error) {
            console.error('Error caching result:', error);
            // Don't throw - caching failure shouldn't break the analysis
        }
    }

    showLoading() {
        this.hideAllStates();
        this.loadingState.classList.remove('hidden');
        this.analyzeBtn.disabled = true;
        
        // Show model names based on what's being used
        const primaryModelSelect = document.getElementById('primary-model');
        const secondaryModelSelect = document.getElementById('secondary-model');
        const primaryModel = primaryModelSelect?.value || 'gemini-pro';
        const enableCrossCheck = this.enableCrossCheckCheckbox?.checked || false;
        const secondaryModel = secondaryModelSelect?.value || 'gemini-flash';
        
        const modelNames = {
            'gemini-flash': 'gemini-2.5-flash',
            'gemini-flash-lite': 'gemini-2.5-flash-lite',
            'gemini-pro': 'gemini-2.5-pro',
            'gemini': 'gemini-2.5-flash',  // Legacy support
            'grok': 'grok-4-fast-reasoning',
        };
        
        if (enableCrossCheck) {
            this.loadingModels.textContent = `🤖 Using: ${modelNames[primaryModel]} + ${modelNames[secondaryModel]}`;
            this.loadingSubtext.textContent = 'Dual-AI analysis with cross-checking';
            
            // Show cross-check loading note
            this.crossCheckLoadingNote.classList.remove('hidden');
            
            // Time varies based on models
            if (false) {
                this.showProgress(true, 'Expected time: 2-4 minutes');
            } else if (primaryModel === 'gemini-pro' || secondaryModel === 'gemini-pro') {
                this.showProgress(true, 'Expected time: 30-60 seconds');
            } else {
                this.showProgress(true, 'Expected time: 15-30 seconds');
            }
        } else {
            this.loadingModels.textContent = `🤖 Using: ${modelNames[primaryModel]}`;
            
            // Hide cross-check loading note
            this.crossCheckLoadingNote.classList.add('hidden');
            
            if (false) {
                this.loadingSubtext.textContent = 'Thorough analysis with reasoning';
                this.showProgress(true, 'Expected time: 1-2 minutes');
            } else if (primaryModel === 'gemini-pro') {
                this.loadingSubtext.textContent = 'Comprehensive analysis';
                this.showProgress(true, 'Expected time: 20-30 seconds');
            } else if (primaryModel === 'gemini-flash-lite') {
                this.loadingSubtext.textContent = 'Ultra-fast analysis';
                this.showProgress(true, 'Expected time: 5-10 seconds');
            } else if (primaryModel === 'grok') {
                this.loadingSubtext.textContent = 'Fast reasoning analysis';
                this.showProgress(true, 'Expected time: 10-20 seconds');
            } else {
                this.loadingSubtext.textContent = 'Fast analysis';
                this.showProgress(true, 'Expected time: 10-15 seconds');
            }
        }
    }

    showProgress(show, message = '') {
        if (show && this.loadingProgress) {
            this.loadingProgress.style.display = 'block';
            this.progressText.textContent = message;
            this.animateProgress();
        } else if (this.loadingProgress) {
            this.loadingProgress.style.display = 'none';
        }
    }

    animateProgress() {
        // Simulate progress animation
        let progress = 0;
        const primaryModelSelect = document.getElementById('primary-model');
        const primaryModel = primaryModelSelect?.value || 'gemini-pro';
        const enableCrossCheck = this.enableCrossCheckCheckbox?.checked || false;
        
        // Estimate duration based on models
        let estimatedDuration = 15000; // Default: Gemini Flash 15s
        
        if (false) {
            estimatedDuration = enableCrossCheck ? 180000 : 90000; // Secondary AI: 90s alone, 180s with cross-check
        } else if (primaryModel === 'gemini-pro') {
            estimatedDuration = enableCrossCheck ? 60000 : 30000; // Pro: 30s alone, 60s with cross-check
        } else if (primaryModel === 'gemini-flash-lite') {
            estimatedDuration = enableCrossCheck ? 30000 : 8000; // Lite: 8s alone, 30s with cross-check
        } else {
            estimatedDuration = enableCrossCheck ? 120000 : 15000; // Flash: 15s alone, 120s with cross-check
        }
        
        const interval = 100;
        const increment = (90 / estimatedDuration) * interval; // Only go to 90%, not 95%
        
        const progressInterval = setInterval(() => {
            progress += increment;
            if (progress >= 90) {
                progress = 90; // Cap at 90% until actually complete
                clearInterval(progressInterval);
            }
            if (this.progressFill) {
                this.progressFill.style.width = `${progress}%`;
            }
        }, interval);
        
        // Store interval ID to clear when done
        this.currentProgressInterval = progressInterval;
    }

    completeProgress() {
        if (this.currentProgressInterval) {
            clearInterval(this.currentProgressInterval);
        }
        if (this.progressFill) {
            this.progressFill.style.width = '100%';
        }
        setTimeout(() => {
            if (this.loadingProgress) {
                this.loadingProgress.style.display = 'none';
            }
        }, 500);
    }

    showError(message, error = null) {
        this.hideAllStates();
        this.errorState.classList.remove('hidden');
        this.errorMessage.textContent = message;
        
        // Show API setup button if error is about missing API key
        const isApiKeyError = message.toLowerCase().includes('api key') || 
                             message.toLowerCase().includes('gemini') ||
                             (error && error.message && error.message.toLowerCase().includes('api key'));
        
        if (isApiKeyError) {
            this.apiSetupErrorBtn.classList.remove('hidden');
        } else {
            this.apiSetupErrorBtn.classList.add('hidden');
        }
        
        if (error) {
            // Create detailed debug information
            const debugInfo = {
                error_message: error.message || message,
                error_type: error.name || 'Error',
                error_stack: error.stack || 'No stack trace available',
                timestamp: new Date().toISOString(),
                page_url: window.location?.href || 'Unknown'
            };
            
            // If error is a string, just show it
            if (typeof error === 'string') {
                this.debugContent.textContent = error;
            } else {
                this.debugContent.textContent = JSON.stringify(debugInfo, null, 2);
            }
        } else {
            this.debugContent.textContent = JSON.stringify({
                error_message: message,
                timestamp: new Date().toISOString()
            }, null, 2);
        }
        
        this.analyzeBtn.disabled = false;
    }

    displayResults(analysis, fromCache = false) {
        this.hideAllStates();
        this.resultsState.classList.remove('hidden');
        
        // Show/hide cache indicator
        if (fromCache) {
            this.cacheIndicator.classList.remove('hidden');
        } else {
            this.cacheIndicator.classList.add('hidden');
        }
        
        // Get model configuration
        const modelConfig = analysis._modelConfig || {
            primaryModel: 'gemini-pro',
            enableCrossCheck: false,
            secondaryModel: 'gemini-flash'
        };
        
        const modelNames = {
            'gemini-flash': 'Gemini 2.5 Flash',
            'gemini-flash-lite': 'Gemini 2.5 Flash Lite',
            'gemini-pro': 'Gemini 2.5 Pro',
            'gemini': 'Gemini 2.5 Flash',  // Legacy support
            'grok': 'Grok 4 Fast Reasoning',
        };
        
        const primaryModelName = modelNames[modelConfig.primaryModel] || 'Gemini 2.5 Flash';
        const secondaryModelName = modelNames[modelConfig.secondaryModel] || 'Gemini Flash';
        
        // Show verification badge
        const wasCrossChecked = modelConfig.enableCrossCheck || false;
        
        // Determine other model for cross-check button
        let hasOtherModel;
        hasOtherModel = 'gemini-flash';  // Default to Flash for cross-checking
        
        if (wasCrossChecked) {
            if (this.verificationBadge) {
                this.verificationBadge.textContent = `✓ Cross-checked by ${primaryModelName} + ${secondaryModelName}`;
                this.verificationBadge.classList.add('cross-checked');
                this.verificationBadge.classList.remove('hidden');
            }
            if (this.crossCheckOptions) {
                this.crossCheckOptions.classList.add('hidden');
            }
        } else {
            if (this.verificationBadge) {
                this.verificationBadge.textContent = `🤖 Analyzed by ${primaryModelName}`;
                this.verificationBadge.classList.remove('cross-checked');
                this.verificationBadge.classList.remove('hidden');
            }
            
            // Show cross-check button to toggle options
            if (this.verifySecondaryAiBtn) {
                this.verifySecondaryAiBtn.textContent = `AI Cross-check`;
                this.verifySecondaryAiBtn.classList.remove('hidden');
            }
            if (this.crossCheckOptions) {
                this.crossCheckOptions.classList.add('hidden'); // Initially hidden, shown on click
            }
            
            // Hide the button for the current primary model
            const primary = modelConfig.primaryModel;
            if (this.verifyFlashBtn) {
                this.verifyFlashBtn.style.display = (primary === 'gemini-flash') ? 'none' : 'inline-block';
            }
            if (this.verifyFlashLiteBtn) {
                this.verifyFlashLiteBtn.style.display = (primary === 'gemini-flash-lite') ? 'none' : 'inline-block';
            }
            if (this.verifyProBtn) {
                this.verifyProBtn.style.display = (primary === 'gemini-pro') ? 'none' : 'inline-block';
            }
            if (this.verifyGrokBtn) {
                this.verifyGrokBtn.style.display = (primary === 'grok') ? 'none' : 'inline-block';
            }
        }
        
        let content = this.formatJSON(analysis);
        
        // Handle cross-check summary separately
        this.displayCrossCheckSummary(analysis, modelConfig);
        
        // Add quality notes if cross-check found issues
        if (analysis.quality_notes && analysis.quality_notes.length > 0) {
            content += `
                <div class="verification-warnings">
                    <div class="warning-header">⚠️ Notes:</div>
                    <ul class="warning-list">
                        ${analysis.quality_notes.map(note => `<li>${this.escapeHtml(note)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Add verification warnings if present
        if (analysis.verification_warnings && analysis.verification_warnings.length > 0) {
            content += `
                <div class="verification-warnings">
                    <div class="warning-header">⚠️ Verification Warnings:</div>
                    <ul class="warning-list">
                        ${analysis.verification_warnings.map(w => `<li>${this.escapeHtml(w)}</li>`).join('')}
                    </ul>
                    <p class="warning-note">Please review these items carefully.</p>
                </div>
            `;
        }
        
        this.jsonViewer.innerHTML = content;
        this.analyzeBtn.disabled = false;
    }

    displayCrossCheckSummary(analysis, modelConfig) {
        // Show/hide cross-check summary section
        if (analysis.cross_check_summary || analysis.cross_check_notes) {
            const crossCheckNotes = analysis.cross_check_summary || analysis.cross_check_notes;
            
            if (!crossCheckNotes) {
                this.crossCheckSummary.classList.add('hidden');
                return;
            }
            
            // Determine which field to use for accuracy
            const accuracy = crossCheckNotes.gemini_accuracy || crossCheckNotes.primary_accuracy || 'medium';
            const accuracyColor = accuracy === 'high' ? '#28a745' : accuracy === 'medium' ? '#ffc107' : '#dc3545';
            const accuracyLabel = accuracy === 'high' ? 'High Agreement' : accuracy === 'medium' ? 'Moderate Agreement' : 'Low Agreement';
            
            // Determine the cross-checker model name
            const secondaryModelKey = modelConfig.secondaryModel || 'gemini-flash';
            const crossCheckerModelNames = {
                'gemini-flash': 'Gemini 2.5 Flash',
                'gemini-flash-lite': 'Gemini 2.5 Flash Lite',
                'gemini-pro': 'Gemini 2.5 Pro',
                'grok': 'Grok 4 Fast Reasoning',
            };
            const crossCheckerName = crossCheckerModelNames[secondaryModelKey] || 'Gemini';
            
            let summaryContent = `
                <div class="cross-check-header" style="text-align: left;">
                    <strong>${crossCheckerName} Cross-Check Summary</strong>
                    <span style="background: ${accuracyColor}20; color: ${accuracyColor}; padding: 4px 10px; border-radius: 8px; font-size: 12px; margin-left: 10px;">
                        ${accuracyLabel}
                    </span>
                </div>
            `;
            
            // 1. Case Name Verification (First)
            if (crossCheckNotes.case_name_accuracy) {
                const nameCorrect = crossCheckNotes.case_name_accuracy.toLowerCase().startsWith('correct');
                const nameIcon = nameCorrect ? '' : '⚠️ ';
                const nameColor = nameCorrect ? '#333' : '#dc3545';
                summaryContent += `
                    <div class="cross-check-section" style="text-align: left;">
                        <strong>1. Case Name Verification:</strong>
                        <p style="color: ${nameColor}; margin: 5px 0 5px 20px;">
                            ${nameIcon}${this.escapeHtml(crossCheckNotes.case_name_accuracy)}
                        </p>
                    </div>
                `;
            }
            
            // 2. Citation Verification (Second)
            if (crossCheckNotes.citation_accuracy) {
                const citationCorrect = crossCheckNotes.citation_accuracy.toLowerCase().startsWith('correct');
                const citationIcon = citationCorrect ? '' : '⚠️ ';
                const citationColor = citationCorrect ? '#333' : '#dc3545';
                summaryContent += `
                    <div class="cross-check-section" style="text-align: left;">
                        <strong>2. Citation Verification:</strong>
                        <p style="color: ${citationColor}; margin: 5px 0 5px 20px;">
                            ${citationIcon}${this.escapeHtml(crossCheckNotes.citation_accuracy)}
                        </p>
                    </div>
                `;
            }
            
            // 3. Summary Verification (Third)
            summaryContent += `
                <div class="cross-check-section" style="text-align: left;">
                    <strong>3. Summary Verification:</strong>
                    <p style="margin: 5px 0 5px 20px; color: #666;">
                        Reviewed and cross-checked by ${crossCheckerName}
                    </p>
                </div>
            `;
            
            // 4. Key Issues Verification (Fourth)
            summaryContent += `
                <div class="cross-check-section" style="text-align: left;">
                    <strong>4. Key Issues Verification:</strong>
                    <p style="margin: 5px 0 5px 20px; color: #666;">
                        Reviewed and cross-checked by ${crossCheckerName}
                    </p>
                </div>
            `;
            
            // 5. Quote Accuracy Check (Fifth)
            if (crossCheckNotes.quote_accuracy && crossCheckNotes.quote_accuracy.length > 0) {
                summaryContent += `
                    <div class="cross-check-section" style="text-align: left;">
                        <strong>5. Notable Quotes Verification:</strong>
                        <ul style="margin: 5px 0 5px 20px;">
                            ${crossCheckNotes.quote_accuracy.map(qa => `<li>${this.escapeHtml(qa)}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // 6. Significant Principles Verification (Sixth)
            summaryContent += `
                <div class="cross-check-section" style="text-align: left;">
                    <strong>6. Significant Principles Verification:</strong>
                    <p style="margin: 5px 0 5px 20px; color: #666;">
                        Reviewed and cross-checked by ${crossCheckerName}
                    </p>
                </div>
            `;
            
            // Issues Found (if any)
            if (crossCheckNotes.issues_found && crossCheckNotes.issues_found.length > 0) {
                summaryContent += `
                    <div class="cross-check-section" style="text-align: left; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                        <strong>Additional Notes:</strong>
                        <ul style="margin: 5px 0 5px 20px;">
                            ${crossCheckNotes.issues_found.map(issue => `<li>${this.escapeHtml(issue)}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            this.crossCheckSummaryContent.innerHTML = summaryContent;
            this.crossCheckSummary.classList.remove('hidden');
        } else {
            this.crossCheckSummary.classList.add('hidden');
        }
    }

    formatJSON(data) {
        const sections = [
            { key: 'case_name', label: 'Case Name' },
            { key: 'citation', label: 'Citation' },
            { key: 'summary', label: 'Summary' },
            { key: 'key_issues', label: 'Key Issues' },
            { key: 'notable_quotes', label: 'Notable Quotes' },
            { key: 'significant_principles', label: 'Significant Principles' }
        ];
        
        // Check if there are cross-check notes indicating inaccuracies
        const crossCheckNotes = data.cross_check_notes || {};
        const caseNameIncorrect = crossCheckNotes.case_name_accuracy && !crossCheckNotes.case_name_accuracy.toLowerCase().startsWith('correct');
        const citationIncorrect = crossCheckNotes.citation_accuracy && !crossCheckNotes.citation_accuracy.toLowerCase().startsWith('correct');

        return sections.map(section => {
            const value = data[section.key];
            if (!value) return '';

            let content = '';
            let sectionStyle = '';
            
            // Apply red highlighting if cross-check found this section incorrect
            if (section.key === 'case_name' && caseNameIncorrect) {
                sectionStyle = 'color: #dc3545; background: #fff5f5; padding: 8px; border-radius: 4px; border-left: 3px solid #dc3545;';
            } else if (section.key === 'citation' && citationIncorrect) {
                sectionStyle = 'color: #dc3545; background: #fff5f5; padding: 8px; border-radius: 4px; border-left: 3px solid #dc3545;';
            }
            
            // For key issues and significant principles - add numbering
            if ((section.key === 'key_issues' || section.key === 'significant_principles') && Array.isArray(value)) {
                content = value.map((item, index) => 
                    `<p><strong>${index + 1}.</strong> ${this.escapeHtml(item)}</p>`
                ).join('');
            }
            // For notable quotes - use italic format, no numbering
            else if (section.key === 'notable_quotes' && Array.isArray(value)) {
                content = value.map(item => `<p><em>${this.escapeHtml(item)}</em></p>`).join('');
            }
            // For other fields, format as plain text
            else {
                content = this.escapeHtml(Array.isArray(value) ? value.join('\n') : value);
            }

            return `
                <div class="json-section">
                    <div class="json-key">${section.label}:</div>
                    <div class="json-value" style="${sectionStyle}">${content}</div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyToClipboard() {
        if (!this.currentAnalysis) return;

        try {
            await navigator.clipboard.writeText(JSON.stringify(this.currentAnalysis, null, 2));
            
            // Visual feedback
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<span class="button-icon">✓</span> Copied!';
            this.copyBtn.style.background = '#28a745';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.style.background = '#28a745';
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(JSON.stringify(this.currentAnalysis, null, 2));
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.copyBtn.innerHTML = '<span class="button-icon">✓</span> Copied!';
            this.copyBtn.style.background = '#28a745';
            setTimeout(() => {
                this.copyBtn.innerHTML = '<span class="button-icon">📋</span> Copy JSON';
                this.copyBtn.style.background = '#28a745';
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }

    async downloadJSON() {
        if (!this.currentAnalysis) return;

        try {
            const caseName = this.currentAnalysis.case_name || 'legal_judgment';
            const sanitizedName = caseName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
            const filename = `${sanitizedName}.json`;
            
            const blob = new Blob([JSON.stringify(this.currentAnalysis, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            
            // Use Chrome downloads API
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to programmatic download
            this.fallbackDownload(JSON.stringify(this.currentAnalysis, null, 2));
        }
    }

    fallbackDownload(jsonString) {
        const caseName = this.currentAnalysis.case_name || 'legal_judgment';
        const sanitizedName = caseName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `${sanitizedName}.json`;
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }


    async abandonAndReturnHome() {
        // Clear cache and return to initial state
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url) {
                // Clear cached result for this URL
                const cacheKey = `analysis_${this.hashUrl(tab.url)}`;
                await chrome.storage.local.remove([cacheKey]);
                console.log('Cache cleared for:', tab.url);
            }
            
            // Reset state
            this.currentAnalysis = null;
            this.currentSourceText = null;
            
            // Show initial state
            this.showInitial();
            
        } catch (error) {
            console.error('Error returning to home:', error);
            this.showInitial();
        }
    }

    async refreshAnalysis() {
        // Clear the cache for current page and run fresh analysis
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url) {
                this.showError('Unable to access the current tab');
                return;
            }

            // Clear cached result for this URL
            const cacheKey = `analysis_${this.hashUrl(tab.url)}`;
            await chrome.storage.local.remove([cacheKey]);
            
            console.log('Cache cleared for:', tab.url);
            
            // Start fresh analysis
            await this.startAnalysis();
            
        } catch (error) {
            console.error('Error refreshing analysis:', error);
            this.showError('Unable to refresh analysis. Please try again.');
        }
    }

    toggleCrossCheckOptions() {
        // Toggle visibility of cross-check model buttons
        if (this.crossCheckOptions) {
            const isHidden = this.crossCheckOptions.classList.contains('hidden');
            if (isHidden) {
                this.crossCheckOptions.classList.remove('hidden');
                if (this.verifySecondaryAiBtn) {
                    this.verifySecondaryAiBtn.textContent = '▲ Hide Cross-Check Options';
                }
            } else {
                this.crossCheckOptions.classList.add('hidden');
                if (this.verifySecondaryAiBtn) {
                    this.verifySecondaryAiBtn.textContent = 'AI Cross-check';
                }
            }
        }
    }

    async runCrossCheckWithModel(modelType) {
        if (!this.currentAnalysis) return;
        
        console.log('Running cross-check with model:', modelType);
        
        // Hide the options panel and reset button text
        if (this.crossCheckOptions) {
            this.crossCheckOptions.classList.add('hidden');
        }
        if (this.verifySecondaryAiBtn) {
            this.verifySecondaryAiBtn.textContent = 'AI Cross-check';
        }
        
        // Run verification with specified model
        await this.runModelVerification(modelType);
    }

    async runModelVerification(crossCheckModel) {
        if (!this.currentAnalysis) return;
        
        try {
            const modelConfig = this.currentAnalysis._modelConfig || { primaryModel: 'gemini-pro' };
            const secondaryModel = crossCheckModel;
            
            const modelNames = {
                'gemini-flash': 'Gemini 2.5 Flash',
                'gemini-flash-lite': 'Gemini 2.5 Flash Lite',
                'gemini-pro': 'Gemini 2.5 Pro',
                'gemini': 'Gemini 2.5 Flash',  // Legacy
                'grok': 'Grok 4 Fast Reasoning',
            };
            
            const modelApiNames = {
                'gemini-flash': 'gemini-2.5-flash',
                'gemini-flash-lite': 'gemini-2.5-flash-lite',
                'gemini-pro': 'gemini-2.5-pro',
                'gemini': 'gemini-2.5-flash',  // Legacy
                'grok': 'grok-4-fast-reasoning',
            };
            
            const secondaryModelName = modelNames[secondaryModel] || secondaryModel;
            const modelApiName = modelApiNames[secondaryModel] || secondaryModel;
            
            console.log('Cross-check model:', secondaryModel);
            console.log('Display name:', secondaryModelName);
            console.log('API name:', modelApiName);
            
            this.showLoading();
            this.loadingText.textContent = `${secondaryModelName} Cross-Check in Progress...`;
            this.loadingModels.textContent = `🤖 Using: ${modelApiName}`;
            this.loadingSubtext.textContent = 'Independent legal analysis for validation';
            
            // Show cross-check loading note
            this.crossCheckLoadingNote.classList.remove('hidden');
            
            // Determine expected time based on cross-check model
            let expectedTime;
            if (crossCheckModel === 'grok') {
                expectedTime = '10-20 seconds (Grok 4 Fast Reasoning)';
            } else if (crossCheckModel === 'gemini-pro') {
                expectedTime = '30-60 seconds (Gemini 2.5 Pro)';
            } else if (crossCheckModel === 'gemini-flash-lite') {
                expectedTime = '5-10 seconds (Gemini 2.5 Flash Lite)';
            } else {
                expectedTime = '15-20 seconds (Gemini 2.5 Flash)';
            }
            this.showProgress(true, `Expected time: ${expectedTime}`);
            
            // Use stored source text if available
            let sourceText = this.currentSourceText;
            
            // If not available, try to extract again
            if (!sourceText) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                try {
                    // Try to inject content script if needed
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (e) {
                    // Content script might already be loaded
                }
                
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractJudgment' });
                
                if (!response || !response.success) {
                    throw new Error('Could not extract judgment text for verification. Please refresh the page.');
                }
                
                sourceText = response.text;
            }
            
            // Send to background for cross-check with secondary model
            let result;
            try {
                result = await chrome.runtime.sendMessage({
                    action: 'crossCheckAnalysis',
                    data: {
                        analysis: this.currentAnalysis,
                        text: sourceText,
                        secondaryModel: secondaryModel
                    }
                });
            } catch (sendError) {
                console.error('Failed to send cross-check message to background:', sendError);
                throw new Error(`Unable to communicate with background script. Try:\n1. Reload the extension (chrome://extensions/)\n2. Refresh this page\n3. Try again\n\nError: ${sendError.message}`);
            }
            
            if (!result) {
                throw new Error('No response from background script. Extension may need to be reloaded.');
            }
            
            if (result.success) {
                this.currentAnalysis = result.data;
                this.currentAnalysis.cross_checked = true;
                
                // Update model config to reflect cross-check was done
                if (!this.currentAnalysis._modelConfig) {
                    this.currentAnalysis._modelConfig = modelConfig;
                }
                this.currentAnalysis._modelConfig.enableCrossCheck = true;
                this.currentAnalysis._modelConfig.secondaryModel = secondaryModel;
                
                // Update cache
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await this.cacheResult(tab.url, {
                    analysis: this.currentAnalysis,
                    sourceText: sourceText
                });
                
                this.displayResults(this.currentAnalysis);
            } else {
                // Check if it's an API key error
                if (result.error && result.error.includes('API key not configured')) {
                    const missingModel = 'Gemini';
                    throw new Error(`⚙️ ${missingModel} API key not found.\n\nPlease:\n1. Right-click the extension icon\n2. Select "Options"\n3. Add your ${missingModel} API key\n4. Click "Save Settings"`);
                }
                throw new Error(result.error || 'Cross-check verification failed');
            }
            
        } catch (error) {
            console.error('Cross-check verification error:', error);
            
            const modelNames = {
                'gemini-flash': 'Gemini 2.5 Flash',
                'gemini-flash-lite': 'Gemini 2.5 Flash Lite',
                'gemini-pro': 'Gemini 2.5 Pro',
                'grok': 'Grok 4 Fast Reasoning',
            };
            const modelName = modelNames[crossCheckModel] || 'Cross-check model';
            this.showError(`${modelName} cross-check failed: ${error.message}`, error);
        }
    }

    async clearAllCache() {
        try {
            // Get all storage keys
            const allData = await chrome.storage.local.get(null);
            
            // Find all analysis cache keys
            const cacheKeys = Object.keys(allData).filter(key => key.startsWith('analysis_'));
            
            if (cacheKeys.length === 0) {
                alert('No cached analyses found.');
                return;
            }
            
            // Confirm deletion
            const confirmed = confirm(`Clear ${cacheKeys.length} cached analysis results?\n\nThis will force fresh analysis for all previously analyzed judgments.`);
            
            if (!confirmed) return;
            
            // Remove all cache keys
            await chrome.storage.local.remove(cacheKeys);
            
            console.log(`Cleared ${cacheKeys.length} cached analyses`);
            alert(`Successfully cleared ${cacheKeys.length} cached analyses!`);
            
        } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Error clearing cache. Please try again.');
        }
    }

    openOptionsPage() {
        chrome.runtime.openOptionsPage();
    }

    toggleDebugInfo() {
        this.debugInfo.classList.toggle('hidden');
        this.debugBtn.textContent = this.debugInfo.classList.contains('hidden') 
            ? 'Show Debug Info' 
            : 'Hide Debug Info';
    }

    hideAllStates() {
        this.initialState.classList.add('hidden');
        this.loadingState.classList.add('hidden');
        this.resultsState.classList.add('hidden');
        this.errorState.classList.add('hidden');
        this.debugInfo.classList.add('hidden');
        this.crossCheckLoadingNote.classList.add('hidden');
    }

    // Disclaimer management methods
    showDisclaimer() {
        if (this.disclaimerTooltip) {
            this.disclaimerTooltip.classList.remove('hidden');
            this.cancelHideDisclaimer();
        }
    }

    hideDisclaimer() {
        if (this.disclaimerTooltip) {
            this.disclaimerTooltip.classList.add('hidden');
        }
    }

    hideDisclaimerDelayed() {
        // Add a small delay before hiding to allow mouse to move to tooltip
        this.disclaimerHideTimeout = setTimeout(() => {
            this.hideDisclaimer();
        }, 300);
    }

    cancelHideDisclaimer() {
        if (this.disclaimerHideTimeout) {
            clearTimeout(this.disclaimerHideTimeout);
            this.disclaimerHideTimeout = null;
        }
    }

    toggleDisclaimer() {
        if (this.disclaimerTooltip) {
            this.disclaimerTooltip.classList.toggle('hidden');
        }
    }

    // Knowledge Base Methods
    bindKnowledgeBaseEvents() {
        // Save modal events
        document.getElementById('kb-save-close').addEventListener('click', () => this.hideModal('kb-save-modal'));
        document.getElementById('kb-save-cancel').addEventListener('click', () => this.hideModal('kb-save-modal'));
        document.getElementById('kb-save-confirm').addEventListener('click', () => this.saveToKnowledgeBase());
        
        // Search modal events
        document.getElementById('kb-search-close').addEventListener('click', () => this.hideModal('kb-search-modal'));
        document.getElementById('kb-search-close-btn').addEventListener('click', () => this.hideModal('kb-search-modal'));
        document.getElementById('kb-clear-search').addEventListener('click', () => this.clearKbSearch());
        document.getElementById('kb-export-btn').addEventListener('click', () => this.exportKnowledgeBase());
        
        // Detail modal events
        document.getElementById('kb-detail-close').addEventListener('click', () => this.hideModal('kb-detail-modal'));
        document.getElementById('kb-detail-close-btn').addEventListener('click', () => this.hideModal('kb-detail-modal'));
        document.getElementById('kb-detail-edit').addEventListener('click', () => this.showEditKbModal());
        document.getElementById('kb-detail-delete').addEventListener('click', () => this.showDeleteKbModal());
        document.getElementById('kb-detail-export').addEventListener('click', () => this.exportKbEntry());
        
        // Edit modal events
        document.getElementById('kb-edit-close').addEventListener('click', () => this.hideModal('kb-edit-modal'));
        document.getElementById('kb-edit-cancel').addEventListener('click', () => this.hideModal('kb-edit-modal'));
        document.getElementById('kb-edit-save').addEventListener('click', () => this.saveKbEdit());
        
        // Delete modal events
        document.getElementById('kb-delete-close').addEventListener('click', () => this.hideModal('kb-delete-modal'));
        document.getElementById('kb-delete-cancel').addEventListener('click', () => this.hideModal('kb-delete-modal'));
        document.getElementById('kb-delete-confirm').addEventListener('click', () => this.confirmDeleteKbEntry());
        
        // Search input event
        this.kbSearchInput.addEventListener('input', () => this.searchKnowledgeBase());
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }

    showSaveToKbModal() {
        if (!this.currentAnalysis) {
            alert('No analysis to save. Please analyze a judgment first.');
            return;
        }
        
        // Populate case preview
        this.kbCasePreview.textContent = this.currentAnalysis.case_name || 'Unknown Case';
        
        // Clear previous inputs
        this.kbLabelInput.value = '';
        this.kbTagsInput.value = '';
        this.kbNotesInput.value = '';
        
        this.showModal('kb-save-modal');
        this.kbLabelInput.focus();
    }

    showSearchKbModal() {
        this.showModal('kb-search-modal');
        this.loadKnowledgeBaseStats();
        this.searchKnowledgeBase();
        this.kbSearchInput.focus();
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async saveToKnowledgeBase() {
        const label = this.kbLabelInput.value.trim();
        if (!label) {
            alert('Please enter a label for this judgment.');
            this.kbLabelInput.focus();
            return;
        }

        const tags = this.kbTagsInput.value.trim()
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        const notes = this.kbNotesInput.value.trim();

        try {
            const judgmentData = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                label: label,
                tags: tags,
                notes: notes,
                analysis: this.currentAnalysis,
                url: this.currentUrl || '',
                case_name: this.currentAnalysis.case_name || 'Unknown Case'
            };

            // Get existing knowledge base
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];

            // Add new entry
            knowledgeBase.push(judgmentData);

            // Save back to storage
            await chrome.storage.local.set({ knowledge_base: knowledgeBase });

            this.hideModal('kb-save-modal');
            alert(`Successfully saved "${label}" to your knowledge base!`);
            
        } catch (error) {
            console.error('Error saving to knowledge base:', error);
            alert('Error saving to knowledge base. Please try again.');
        }
    }

    async loadKnowledgeBaseStats() {
        try {
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];
            
            this.kbStats.textContent = `Total judgments saved: ${knowledgeBase.length}`;
        } catch (error) {
            console.error('Error loading knowledge base stats:', error);
            this.kbStats.textContent = 'Error loading knowledge base';
        }
    }

    async searchKnowledgeBase() {
        const query = this.kbSearchInput.value.toLowerCase().trim();
        
        try {
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];
            
            let filteredResults = knowledgeBase;
            
            if (query) {
                filteredResults = knowledgeBase.filter(item => 
                    item.label.toLowerCase().includes(query) ||
                    item.tags.some(tag => tag.toLowerCase().includes(query)) ||
                    item.case_name.toLowerCase().includes(query) ||
                    item.analysis.summary.toLowerCase().includes(query) ||
                    (item.notes && item.notes.toLowerCase().includes(query))
                );
            }
            
            this.displayKnowledgeBaseResults(filteredResults);
            
        } catch (error) {
            console.error('Error searching knowledge base:', error);
            this.kbResults.innerHTML = '<p>Error searching knowledge base</p>';
        }
    }

    displayKnowledgeBaseResults(results) {
        if (results.length === 0) {
            this.kbResults.innerHTML = '<p>No judgments found matching your search.</p>';
            return;
        }

        const resultsHtml = results.map(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const summary = item.analysis.summary.substring(0, 150) + (item.analysis.summary.length > 150 ? '...' : '');
            const tagsHtml = item.tags.map(tag => `<span class="kb-tag">${tag}</span>`).join('');
            
            // Get first line of notes if available
            const notesPreview = item.notes ? 
                (item.notes.split('\n')[0].substring(0, 100) + (item.notes.split('\n')[0].length > 100 ? '...' : '')) : 
                '';
            
            return `
                <div class="kb-entry" data-id="${item.id}">
                    <div class="kb-entry-header">
                        <h4 class="kb-entry-title">${item.label}</h4>
                        <span class="kb-entry-date">${date}</span>
                    </div>
                    <div class="kb-entry-case">${item.case_name}</div>
                    ${notesPreview ? `<div class="kb-entry-notes">📝 ${notesPreview}</div>` : ''}
                    <div class="kb-entry-summary">${summary}</div>
                    <div class="kb-entry-tags">${tagsHtml}</div>
                </div>
            `;
        }).join('');

        this.kbResults.innerHTML = resultsHtml;

        // Add click event listeners to entries
        this.kbResults.querySelectorAll('.kb-entry').forEach(entry => {
            entry.addEventListener('click', () => {
                const id = entry.dataset.id;
                this.showKbEntryDetail(id);
            });
        });
    }

    async showKbEntryDetail(id) {
        try {
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];
            const entry = knowledgeBase.find(item => item.id === id);
            
            if (!entry) {
                alert('Entry not found');
                return;
            }

            this.kbDetailTitle.textContent = entry.label;
            
            const date = new Date(entry.timestamp).toLocaleString();
            const tagsHtml = entry.tags.map(tag => `<span class="kb-tag">${tag}</span>`).join('');
            
            this.kbDetailContent.innerHTML = `
                <div class="kb-detail-section">
                    <div class="kb-detail-meta">
                        <div class="kb-detail-meta-item">
                            <span class="kb-detail-meta-label">Case:</span>
                            <span class="kb-detail-meta-value">${entry.case_name}</span>
                        </div>
                        <div class="kb-detail-meta-item">
                            <span class="kb-detail-meta-label">Saved:</span>
                            <span class="kb-detail-meta-value">${date}</span>
                        </div>
                        <div class="kb-detail-meta-item">
                            <span class="kb-detail-meta-label">Tags:</span>
                            <span class="kb-detail-meta-value">${tagsHtml}</span>
                        </div>
                        ${entry.url ? `<div class="kb-detail-meta-item">
                            <span class="kb-detail-meta-label">URL:</span>
                            <span class="kb-detail-meta-value"><a href="${entry.url}" target="_blank">${entry.url}</a></span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="kb-detail-section">
                    <h4>AI Analysis</h4>
                    <div class="kb-detail-analysis">
                        ${this.formatJSON(entry.analysis)}
                    </div>
                </div>
            `;

            this.currentKbEntry = entry;
            this.showModal('kb-detail-modal');
            
        } catch (error) {
            console.error('Error showing KB entry detail:', error);
            alert('Error loading entry details');
        }
    }

    clearKbSearch() {
        this.kbSearchInput.value = '';
        this.searchKnowledgeBase();
    }

    async exportKnowledgeBase() {
        try {
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];
            
            if (knowledgeBase.length === 0) {
                alert('No judgments in your knowledge base to export.');
                return;
            }

            const exportData = {
                export_date: new Date().toISOString(),
                total_entries: knowledgeBase.length,
                entries: knowledgeBase
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const filename = `knowledge_base_export_${new Date().toISOString().split('T')[0]}.json`;
            
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });
            
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            console.error('Error exporting knowledge base:', error);
            alert('Error exporting knowledge base');
        }
    }

    exportKbEntry() {
        if (!this.currentKbEntry) return;
        
        try {
            const blob = new Blob([JSON.stringify(this.currentKbEntry, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const filename = `${this.currentKbEntry.case_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_kb_entry.json`;
            
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });
            
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            console.error('Error exporting KB entry:', error);
            alert('Error exporting entry');
        }
    }

    showEditKbModal() {
        if (!this.currentKbEntry) return;
        
        // Populate edit form with current values
        this.kbEditLabelInput.value = this.currentKbEntry.label;
        this.kbEditTagsInput.value = this.currentKbEntry.tags.join(', ');
        this.kbEditNotesInput.value = this.currentKbEntry.notes || '';
        this.kbEditCasePreview.textContent = this.currentKbEntry.case_name;
        
        this.hideModal('kb-detail-modal');
        this.showModal('kb-edit-modal');
        this.kbEditLabelInput.focus();
    }

    async saveKbEdit() {
        const newLabel = this.kbEditLabelInput.value.trim();
        if (!newLabel) {
            alert('Please enter a label for this judgment.');
            this.kbEditLabelInput.focus();
            return;
        }

        const newTags = this.kbEditTagsInput.value.trim()
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        const newNotes = this.kbEditNotesInput.value.trim();

        try {
            // Get existing knowledge base
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];
            
            // Find and update the entry
            const entryIndex = knowledgeBase.findIndex(item => item.id === this.currentKbEntry.id);
            if (entryIndex === -1) {
                alert('Entry not found. It may have been deleted.');
                return;
            }
            
            // Update the entry
            knowledgeBase[entryIndex].label = newLabel;
            knowledgeBase[entryIndex].tags = newTags;
            knowledgeBase[entryIndex].notes = newNotes;
            knowledgeBase[entryIndex].timestamp = new Date().toISOString(); // Update timestamp
            
            // Save back to storage
            await chrome.storage.local.set({ knowledge_base: knowledgeBase });
            
            // Update current entry reference
            this.currentKbEntry = knowledgeBase[entryIndex];
            
            this.hideModal('kb-edit-modal');
            alert(`Successfully updated "${newLabel}"!`);
            
            // Refresh the search results if the search modal is open
            if (!this.kbSearchModal.classList.contains('hidden')) {
                this.searchKnowledgeBase();
            }
            
        } catch (error) {
            console.error('Error updating knowledge base entry:', error);
            alert('Error updating entry. Please try again.');
        }
    }

    showDeleteKbModal() {
        if (!this.currentKbEntry) return;
        
        // Populate delete preview
        const tagsHtml = this.currentKbEntry.tags.map(tag => `<span class="kb-tag">${tag}</span>`).join('');
        this.kbDeletePreview.innerHTML = `
            <h4>${this.currentKbEntry.label}</h4>
            <p><strong>Case:</strong> ${this.currentKbEntry.case_name}</p>
            <p><strong>Tags:</strong> ${tagsHtml}</p>
            <p><strong>Saved:</strong> ${new Date(this.currentKbEntry.timestamp).toLocaleString()}</p>
        `;
        
        this.hideModal('kb-detail-modal');
        this.showModal('kb-delete-modal');
    }

    async confirmDeleteKbEntry() {
        if (!this.currentKbEntry) return;
        
        try {
            // Get existing knowledge base
            const result = await chrome.storage.local.get(['knowledge_base']);
            const knowledgeBase = result.knowledge_base || [];
            
            // Remove the entry
            const updatedKnowledgeBase = knowledgeBase.filter(item => item.id !== this.currentKbEntry.id);
            
            // Save back to storage
            await chrome.storage.local.set({ knowledge_base: updatedKnowledgeBase });
            
            this.hideModal('kb-delete-modal');
            alert(`Successfully deleted "${this.currentKbEntry.label}"!`);
            
            // Clear current entry reference
            this.currentKbEntry = null;
            
            // Refresh the search results if the search modal is open
            if (!this.kbSearchModal.classList.contains('hidden')) {
                this.searchKnowledgeBase();
                this.loadKnowledgeBaseStats();
            }
            
        } catch (error) {
            console.error('Error deleting knowledge base entry:', error);
            alert('Error deleting entry. Please try again.');
        }
    }

    setVersionNumber() {
        // Set the version number dynamically from the manifest
        if (this.versionBadge) {
            const manifest = chrome.runtime.getManifest();
            const version = manifest.version;
            this.versionBadge.textContent = `v${version}`;
        }
    }

    async initializeModelSelection() {
        // Get available API keys
        const result = await chrome.storage.local.get(['gemini_api_key', 'grok_api_key']);
        console.log('Popup: Loading API keys from storage:', {
            geminiKey: result.gemini_api_key ? `${result.gemini_api_key.substring(0, 10)}...` : 'null',
            grokKey: result.grok_api_key ? `${result.grok_api_key.substring(0, 10)}...` : 'null'
        });
        
        const availableModels = [];
        
        if (result.gemini_api_key && result.gemini_api_key !== 'YOUR_GEMINI_API_KEY_HERE') {
            availableModels.push(
                { value: 'gemini-pro', label: 'Gemini 2.5 Pro (Most Accurate)' },
                { value: 'gemini-flash', label: 'Gemini 2.5 Flash (Fast, Balanced)' },
                { value: 'gemini-flash-lite', label: 'Gemini 2.5 Flash Lite (Fastest)' }
            );
        }
        
        if (result.grok_api_key && result.grok_api_key !== 'YOUR_GROK_API_KEY_HERE') {
            availableModels.push({ value: 'grok', label: 'Grok 4 Fast Reasoning (xAI)' });
        }
        
        // Populate model selection
        if (availableModels.length === 0) {
            this.modelSelectionContainer.innerHTML = '<div class="no-models-message">⚠️ No API keys detected. Please configure your API keys in settings.</div>';
            this.crossCheckModelContainer.innerHTML = '<div class="no-models-message">Not available - no API keys detected</div>';
            return;
        }
        
        // Create model selection dropdown
        const modelSelect = document.createElement('select');
        modelSelect.id = 'primary-model';
        modelSelect.className = 'model-select';
        
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            modelSelect.appendChild(option);
        });
        
        this.modelSelectionContainer.innerHTML = '';
        this.modelSelectionContainer.appendChild(modelSelect);
        
        // Create cross-check model selection
        this.updateCrossCheckOptions(availableModels);
        
        // Bind events to the new elements
        this.bindModelEvents();
    }

    updateCrossCheckOptions(availableModels) {
        if (availableModels.length < 2) {
            this.crossCheckModelContainer.innerHTML = '<div class="no-models-message">Not available - only one model configured</div>';
            return;
        }
        
        const crossCheckSelect = document.createElement('select');
        crossCheckSelect.id = 'secondary-model';
        crossCheckSelect.className = 'model-select';
        
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            crossCheckSelect.appendChild(option);
        });
        
        this.crossCheckModelContainer.innerHTML = '';
        this.crossCheckModelContainer.appendChild(crossCheckSelect);
    }

    bindModelEvents() {
        const primaryModelSelect = document.getElementById('primary-model');
        const secondaryModelSelect = document.getElementById('secondary-model');
        
        if (primaryModelSelect) {
            primaryModelSelect.addEventListener('change', async () => {
                await this.saveModelPreferences();
                this.updateSecondaryModelOptions();
            });
        }
        
        if (secondaryModelSelect) {
            secondaryModelSelect.addEventListener('change', async () => {
                await this.saveModelPreferences();
            });
        }
    }
}

// Initialize the analyzer when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new LegalJudgmentAnalyzer();
});
