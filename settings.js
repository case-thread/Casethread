// Legal Judgment Analyzer - Settings Script
class SettingsManager {
    constructor() {
        this.apiKeyInput = document.getElementById('api-key');
        this.grokApiKeyInput = document.getElementById('grok-api-key');
        // Removed primary model selection - all models are now equally optional
        this.secondaryAiKeyInput = document.getElementById('secondary-ai-key');
        this.enableSecondaryAiCheckbox = document.getElementById('enable-secondary-ai');
        this.saveBtn = document.getElementById('save-btn');
        this.testBtn = document.getElementById('test-btn');
        this.statusDiv = document.getElementById('status');
        
        this.bindEvents();
        this.loadSettings();
    }

    bindEvents() {
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.testBtn.addEventListener('click', () => this.testConnection());
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['gemini_api_key', 'grok_api_key', 'secondary_ai_api_key', 'enable_secondary_ai_verification']);
            if (result.gemini_api_key && this.apiKeyInput) {
                this.apiKeyInput.value = result.gemini_api_key;
            }
            if (result.grok_api_key && this.grokApiKeyInput) {
                this.grokApiKeyInput.value = result.grok_api_key;
            }
            // Removed primary model selection logic
            if (result.secondary_ai_api_key && this.secondaryAiKeyInput) {
                this.secondaryAiKeyInput.value = result.secondary_ai_api_key;
            }
            // Default to disabled (unchecked) for faster performance
            if (this.enableSecondaryAiCheckbox) {
                this.enableSecondaryAiCheckbox.checked = result.enable_secondary_ai_verification || false;
            }
            
            if (result.gemini_api_key || result.grok_api_key || result.secondary_ai_api_key) {
                this.showStatus('Settings loaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Error loading settings', 'error');
        }
    }

    async saveSettings() {
        const geminiApiKey = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
        const grokApiKey = this.grokApiKeyInput ? this.grokApiKeyInput.value.trim() : '';
        const secondaryAiKey = this.secondaryAiKeyInput ? this.secondaryAiKeyInput.value.trim() : '';
        
        // Validate that at least one API key is provided
        if (!geminiApiKey && !grokApiKey) {
            this.showStatus('Please enter at least one API key (Gemini or Grok)', 'error');
            return;
        }

        // Validate API keys if provided
        if (geminiApiKey && !this.validateGeminiApiKey(geminiApiKey)) {
            this.showStatus('Invalid Gemini API key format. Please check your key and try again.', 'error');
            return;
        }

        if (grokApiKey && !this.validateGrokApiKey(grokApiKey)) {
            this.showStatus('Invalid Grok API key format. Please check your key and try again.', 'error');
            return;
        }

        try {
            const settingsToSave = { 
                gemini_api_key: geminiApiKey,
                grok_api_key: grokApiKey,
                enable_secondary_ai_verification: this.enableSecondaryAiCheckbox ? this.enableSecondaryAiCheckbox.checked : false
            };
            
            if (secondaryAiKey) {
                settingsToSave.secondary_ai_api_key = secondaryAiKey;
            }
            
            await chrome.storage.local.set(settingsToSave);
            
            // Show which models are configured
            const configuredModels = [];
            if (geminiApiKey) configuredModels.push('Gemini');
            if (grokApiKey) configuredModels.push('Grok');
            
            this.showStatus(`Settings saved! Configured models: ${configuredModels.join(', ')}.`, 'success');
            
            // Update the background script
            chrome.runtime.sendMessage({ 
                action: 'updateApiKeys', 
                geminiApiKey: geminiApiKey,
                grokApiKey: grokApiKey,
                secondaryAiKey: secondaryAiKey
            }).catch(() => {
                // Background script might not be ready, that's okay
            });
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings', 'error');
        }
    }

    async testConnection() {
        const geminiApiKey = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
        const grokApiKey = this.grokApiKeyInput ? this.grokApiKeyInput.value.trim() : '';
        
        if (!geminiApiKey && !grokApiKey) {
            this.showStatus('Please enter at least one API key to test', 'error');
            return;
        }

        this.testBtn.disabled = true;
        this.testBtn.textContent = 'Testing...';
        this.showStatus('Testing connections...', 'info');

        const results = [];

        // Test Gemini if key is provided
        if (geminiApiKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: 'Test connection. Respond with "Connection successful"'
                            }]
                        }],
                        generationConfig: {
                            maxOutputTokens: 10
                        }
                    })
                });

                if (response.ok) {
                    results.push('✅ Gemini: Connection successful!');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    results.push(`❌ Gemini: ${response.status} - ${errorData.error?.message || response.statusText}`);
                }
            } catch (error) {
                results.push(`❌ Gemini: ${error.message}`);
            }
        }

        // Test Grok if key is provided
        if (grokApiKey) {
            try {
                const response = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${grokApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'grok-4-fast-reasoning',
                        messages: [
                            { role: 'user', content: 'Test connection. Respond with "Connection successful"' }
                        ],
                        max_tokens: 10
                    })
                });

                if (response.ok) {
                    results.push('✅ Grok: Connection successful!');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    results.push(`❌ Grok: ${response.status} - ${errorData.error?.message || response.statusText}`);
                }
            } catch (error) {
                results.push(`❌ Grok: ${error.message}`);
            }
        }

        // Show results
        const successCount = results.filter(r => r.startsWith('✅')).length;
        const totalCount = results.length;
        
        if (successCount === totalCount) {
            this.showStatus(`All connections successful! ${results.join(' ')}`, 'success');
        } else if (successCount > 0) {
            this.showStatus(`Partial success: ${results.join(' ')}`, 'info');
        } else {
            this.showStatus(`All connections failed: ${results.join(' ')}`, 'error');
        }

        this.testBtn.disabled = false;
        this.testBtn.textContent = 'Test Connection';
    }

    validateGeminiApiKey(apiKey) {
        // Basic validation for Gemini API key format
        return apiKey.length > 20 && apiKey.startsWith('AIza');
    }

    validateGrokApiKey(apiKey) {
        // Basic validation for Grok API key format
        // Grok API keys are typically longer and don't have a specific prefix
        return apiKey.length > 20;
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
        this.statusDiv.style.display = 'block';
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.statusDiv.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize settings manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
