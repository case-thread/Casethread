// Legal Judgment Analyzer - Configuration
// This file should contain your API keys
// DO NOT commit this file to version control

const CONFIG = {
    // Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual Gemini API key
    // Get your key from: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
    
    // Replace 'YOUR_GROK_API_KEY_HERE' with your actual Grok API key
    // Get your key from: https://console.x.ai/
    GROK_API_KEY: 'YOUR_GROK_API_KEY_HERE',
    
    // Replace 'YOUR_SECONDARY_AI_API_KEY_HERE' with your actual Secondary AI API key (optional but recommended)
    // Get your key from: https://platform.deepseek.com/api_keys
    SECONDARY_AI_API_KEY: 'YOUR_SECONDARY_AI_API_KEY_HERE',
    
    // API endpoints
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    GROK_API_URL: 'https://api.x.ai/v1/chat/completions',
    SECONDARY_AI_API_URL: 'https://api.deepseek.com/v1/chat/completions',
    
    // Default settings
    DEFAULT_SETTINGS: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
    }
};

// Instructions for setup:
// 1. Get your Gemini API key from https://makersuite.google.com/app/apikey
// 2. Get your Grok API key from https://console.x.ai/
// 3. Replace 'YOUR_GEMINI_API_KEY_HERE' and 'YOUR_GROK_API_KEY_HERE' above with your actual keys
// 4. Save this file
// 5. Reload the Chrome extension

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
