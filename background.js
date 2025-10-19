// Legal Judgment Analyzer - Background Service Worker

/**
 * NOTE: Cross-check functionality uses Gemini models only
 */

class GeminiAnalyzer {
    constructor() {
        this.geminiApiKey = null;
        this.grokApiKey = null;
        // Removed primary model concept - all models are now equally optional
        this.setupMessageListener();
        this.loadApiKeys();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'analyzeJudgment') {
                this.analyzeJudgment(request.data)
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ 
                        success: false, 
                        error: error.message 
                    }));
                return true; // Keep message channel open for async response
            }
            
            if (request.action === 'updateApiKeys') {
                this.geminiApiKey = request.geminiApiKey;
                this.grokApiKey = request.grokApiKey;
                sendResponse({ success: true });
                return;
            }
            
            
            if (request.action === 'crossCheckAnalysis') {
                // Cross-check with specified secondary model
                const secondaryModel = request.data.secondaryModel || 'gemini-flash';
                console.log(`📋 Cross-check request received for model: ${secondaryModel}`);
                this.crossCheckWithSecondModel(request.data.analysis, request.data.text, secondaryModel)
                    .then(result => {
                        console.log('✅ Cross-check completed successfully');
                        sendResponse({ success: true, data: result });
                    })
                    .catch(error => {
                        console.error('❌ Cross-check failed:', error);
                        console.error('Error details:', {
                            message: error.message,
                            stack: error.stack,
                            model: secondaryModel
                        });
                        sendResponse({ success: false, error: error.message });
                    });
                return true;
            }
        });
    }

    async loadApiKeys() {
        try {
            // Try to get API keys and settings from storage first (set via settings page)
            const result = await chrome.storage.local.get(['gemini_api_key', 'grok_api_key']);
            
            console.log('Loading API keys from storage:', {
                geminiKey: result.gemini_api_key ? `${result.gemini_api_key.substring(0, 10)}...` : 'null',
                grokKey: result.grok_api_key ? `${result.grok_api_key.substring(0, 10)}...` : 'null'
            });
            
            if (result.gemini_api_key && result.gemini_api_key !== 'YOUR_GEMINI_API_KEY_HERE') {
                this.geminiApiKey = result.gemini_api_key;
                console.log('Gemini API key loaded successfully');
            }
            
            if (result.grok_api_key && result.grok_api_key !== 'YOUR_GROK_API_KEY_HERE') {
                this.grokApiKey = result.grok_api_key;
                console.log('Grok API key loaded successfully');
            }
            
            // Removed primary model concept
            
            if (this.geminiApiKey || this.grokApiKey) {
                return; // Keys loaded
            }

            // If not in storage, try to load from config.js file
            try {
                const response = await fetch(chrome.runtime.getURL('config.js'));
                const configText = await response.text();
                
                // Extract API keys from config.js
                if (!this.geminiApiKey) {
                    const geminiKeyMatch = configText.match(/GEMINI_API_KEY:\s*['"]([^'"]+)['"]/);
                    if (geminiKeyMatch && geminiKeyMatch[1] !== 'YOUR_GEMINI_API_KEY_HERE') {
                        this.geminiApiKey = geminiKeyMatch[1];
                        await chrome.storage.local.set({ gemini_api_key: this.geminiApiKey });
                    }
                }
                
                if (!this.grokApiKey) {
                    const grokKeyMatch = configText.match(/GROK_API_KEY:\s*['"]([^'"]+)['"]/);
                    if (grokKeyMatch && grokKeyMatch[1] !== 'YOUR_GROK_API_KEY_HERE') {
                        this.grokApiKey = grokKeyMatch[1];
                        await chrome.storage.local.set({ grok_api_key: this.grokApiKey });
                    }
                }
                
            } catch (configError) {
                console.log('Could not load config.js, using storage only');
            }

        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    }

    async analyzeJudgment(data) {
        try {
            const primaryModel = data.primaryModel || 'gemini-pro'; // Default fallback
            const enableCrossCheck = data.enableCrossCheck || false;
            const secondaryModel = data.secondaryModel || 'gemini-flash';
            
            console.log('analyzeJudgment called with data:', {
                hasTitle: !!data.title,
                hasCitation: !!data.citation,
                hasText: !!data.text,
                titleLength: data.title?.length || 0,
                textLength: data.text?.length || 0,
                primaryModel: primaryModel,
                enableCrossCheck: enableCrossCheck,
                secondaryModel: secondaryModel
            });

            // Load API keys if needed
            console.log('API keys before loading:', {
                geminiApiKey: this.geminiApiKey ? `${this.geminiApiKey.substring(0, 10)}...` : 'null',
                grokApiKey: this.grokApiKey ? `${this.grokApiKey.substring(0, 10)}...` : 'null'
            });
            
            if (!this.geminiApiKey || !this.grokApiKey) {
                console.log('Loading API keys from storage...');
                await this.loadApiKeys();
                console.log('API keys after loading:', {
                    geminiApiKey: this.geminiApiKey ? `${this.geminiApiKey.substring(0, 10)}...` : 'null',
                    grokApiKey: this.grokApiKey ? `${this.grokApiKey.substring(0, 10)}...` : 'null'
                });
            }

            // Validate that required API keys are available
            if ((primaryModel === 'gemini-pro' || primaryModel === 'gemini-flash' || primaryModel === 'gemini-flash-lite') && !this.geminiApiKey) {
                throw new Error('Gemini API key not found. Please configure your API key in the extension settings.');
            }
            
            if (primaryModel === 'grok' && !this.grokApiKey) {
                throw new Error('Grok API key not found. Please configure your API key in the extension settings.');
            }
            
            // Validate cross-check model API keys
            if (enableCrossCheck) {
                if (secondaryModel.startsWith('gemini') && !this.geminiApiKey) {
                    throw new Error('Gemini API key not found. Please configure your API key in the extension settings.');
                }
            }

            // Validate input data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data object provided to analyzeJudgment');
            }

            if (!data.text || data.text.trim().length < 100) {
                throw new Error('Insufficient text content for analysis. Text length: ' + (data.text?.length || 0));
            }

            // Run primary analysis
            let primaryResponse;
            
            if (primaryModel === 'gemini-pro' || primaryModel === 'gemini-flash' || primaryModel === 'gemini-flash-lite') {
                const prompt = this.createPrompt(data.title || 'Unknown Case', data.citation || '', data.text);
                console.log(`Calling Gemini API (${primaryModel}) for primary analysis...`);
                console.log('Text length being sent to Gemini:', data.text?.length || 0);
                primaryResponse = await this.callGeminiAPI(prompt, primaryModel);
                console.log('Gemini API response received');
            } else if (primaryModel === 'grok') {
                console.log(`Calling Grok API (${primaryModel}) for primary analysis...`);
                console.log('Text length being sent to Grok:', data.text?.length || 0);
                primaryResponse = await this.callGrokAPI(data.title || 'Unknown Case', data.citation || '', data.text);
                console.log('Grok API response received');
            } else {
                throw new Error(`Unknown primary model: ${primaryModel}`);
            }
            
            // Optional: Cross-check with second AI
            if (enableCrossCheck) {
                console.log(`🔍 Cross-checking with ${secondaryModel}...`);
                try {
                    const enhancedResponse = await this.crossCheckWithSecondModel(
                        primaryResponse, 
                        data.text, 
                        secondaryModel
                    );
                    return {
                        success: true,
                        data: enhancedResponse
                    };
                } catch (crossCheckError) {
                    console.error('Cross-check failed:', crossCheckError);
                    console.log(`Continuing with ${primaryModel}-only results`);
                }
            }
            
            console.log(`⚡ Using ${primaryModel} results (cross-check: OFF)`);
            
            return {
                success: true,
                data: primaryResponse
            };

        } catch (error) {
            console.error('Analysis error in background.js:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async callGrokAPI(title, citation, text) {
        if (!this.grokApiKey) {
            throw new Error('Grok API key not configured');
        }
        
        const systemPrompt = `You are a legal AI assistant specializing in analyzing commonwealth legal judgments. Your task is to analyze the provided document and extract key legal information in a structured JSON format.

FIRST: Determine if this is a legal judgment or court decision. If it is NOT a legal judgment (e.g., press releases, news articles, government announcements, etc.), then set key_issues, notable_quotes, and significant_principles to ["Not applicable."] and provide an appropriate summary explaining what type of document it is.

ANALYSIS REQUIREMENTS (for legal judgments only):
1. Read through the ENTIRE judgment carefully
2. Identify the key legal issues (up to 5 most important issues)
3. Extract 3-5 notable quotes that show the court's reasoning
4. Identify 3-5 significant legal principles that have general applicability
5. Provide a comprehensive 3-4 sentence summary covering: the dispute, key findings, and legal significance

FOCUS ON QUALITY OVER QUANTITY:
- Select only the MOST important issues, quotes, and principles
- Prioritize content that has reference value for other cases
- Emphasize general legal principles over case-specific facts

For Quotes:
- Choose quotes that demonstrate legal reasoning, not just factual findings
- Focus on statements that establish or apply legal principles
- Avoid quotes that are purely procedural or case-specific

For Principles:
- Extract GENERAL legal principles that apply beyond this specific case
- Focus on principles that legal practitioners can reference in other matters
- Avoid case-specific holdings - focus on broader legal rules and tests
- Examples of good principles: "The test for contract interpretation", "Requirements for establishing breach of confidence", "Principles of patent validity assessment"

CRITICAL REQUIREMENTS - ACCURACY IS PARAMOUNT:
1. For notable_quotes: Extract EXACT quotes from the judgment text - NO paraphrasing, NO summarizing
2. Do NOT include paragraph numbers or references in quotes - just the quote text itself
3. Only include quotes that you can see VERBATIM in the provided judgment text
4. Keep quotes concise (1-3 sentences maximum)
5. Ensure all JSON strings properly escape special characters (use backslash before quotes: \\")
6. Replace all apostrophes with "'" or avoid them entirely to prevent JSON errors
7. For quotes within quotes, use \\" for inner quotes

ANTI-HALLUCINATION MEASURES - CRITICAL:
- Only extract information that is explicitly stated in the judgment
- Do not infer or assume facts not present in the text
- ALL quotes must be word-for-word from the judgment - no paraphrasing
- If you're not sure a quote is exact, don't include it
- Focus on the court's actual reasoning and legal principles
- Avoid procedural or administrative quotes

Respond ONLY with valid JSON in this exact format:
{
  "case_name": "Full case name as it appears (e.g., 'Teva UK Ltd v AstraZeneca AB')",
  "citation": "Legal citation if found (e.g., '[2014] EWHC 2873 (Pat)')",
  "summary": "Comprehensive 3-4 sentence summary covering the dispute, key findings, court decision, and legal significance",
  "key_issues": ["Issue 1", "Issue 2", "Issue 3"],
  "notable_quotes": ["Exact quote from judgment without paragraph numbers", "Another exact quote", "Third quote"],
  "significant_principles": ["General principle applicable to other cases", "Another transferable legal principle", "Third principle with reference value"]
}

CRITICAL FOR CASE NAME:
- Extract the actual parties' names (e.g., "Teva UK Ltd v AstraZeneca AB")
- Do NOT use section headers like "Court of Appeal Decisions" or "High Court Patents"
- If the title provided is a section header, extract the real case name from the judgment text itself
- Look for the "Between:" section or party names at the start of the judgment
- EXCLUDE party designations like "1st Plaintiff", "2nd Plaintiff", "1st Defendant", "2nd Defendant", "Plaintiff", "Defendant", "Appellant", "Respondent", etc.
- Only include the actual names of the parties (e.g., "AAD and AAE v BBF" not "AAD 1st Plaintiff and AAE 2nd Plaintiff v BBF Defendant")

CRITICAL FOR CITATION:
- Extract citation exactly as it appears in "Cite as:" or "Neutral Citation Number:" field
- HONG KONG CITATION FORMAT (IMPORTANT - Official Judiciary Rules):
  * Since 1 January 2018, ALL Hong Kong judgments have neutral citations
  * Neutral citation format: "[YEAR] COURT NUMBER" where YEAR must be in square brackets (e.g., "[2020] HKCFA 32" or "[2021] HKCFI 1474")
  * When a neutral citation exists, provide ONLY the neutral citation - do NOT include the action number
  * Example: For a case with action number "FACV Nos. 3 and 5 of 2019" and neutral citation "[2020] HKCFA 32", output ONLY: "[2020] HKCFA 32"
  * CRITICAL: The neutral citation MUST include the year in square brackets like "[2020]" - NEVER output just "HKCFA 32" without the year
  * Common HK courts: HKCFI (Court of First Instance), HKCA (Court of Appeal), HKCFA (Court of Final Appeal)
  * Only use action number format (e.g., "HCA 537/2014") if there is NO neutral citation (pre-2018 cases)
- UK and other jurisdictions: Use neutral citation format "[year] COURT number" (e.g., "[2025] UKSC 22")

IMPORTANT FOR JSON VALIDITY:
- Ensure proper JSON escaping - use \\" for quotes within strings
- Replace apostrophes (') with appropriate alternatives to avoid JSON errors
- Keep arrays to 3-5 items each
- Do not include any text outside the JSON object
- Test that your output is valid JSON`;

        const userPrompt = `Please analyze this legal judgment:

Title: ${title || 'Not specified'}
Citation: ${citation || 'Not specified'}

Judgment Text:
${text.substring(0, 100000)}${text.length > 100000 ? '\n\n[Text truncated for length]' : ''}`;

        const requestBody = {
            model: 'grok-4-fast-reasoning',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 8192
        };

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.grokApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Grok API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from Grok API');
        }

        const choice = data.choices[0];
        
        // Check finish_reason for truncation
        const finishReason = choice.finish_reason;
        console.log('Grok finish_reason:', finishReason);
        
        if (finishReason === 'length') {
            console.error('⚠️ Response was truncated due to token limit!');
            console.error('Consider: 1) Using a model with higher limits, 2) Shortening input text, 3) Simplifying prompt');
        }
        
        if (finishReason === 'content_filter') {
            throw new Error('Response blocked by Grok content filters. The content may have triggered safety concerns.');
        }
        
        if (!choice.message || !choice.message.content) {
            throw new Error(`Empty response from Grok API. Finish reason: ${finishReason}`);
        }

        const responseText = choice.message.content;
        
        try {
            // Remove markdown code fences if present
            let cleanedResponse = responseText.trim();
            
            // Remove ```json, ```JSON, or just ``` at the start and end
            cleanedResponse = cleanedResponse.replace(/^```\s*json\s*/gi, '');
            cleanedResponse = cleanedResponse.replace(/^```\s*/g, '');
            cleanedResponse = cleanedResponse.replace(/\s*```\s*$/g, '');
            cleanedResponse = cleanedResponse.trim();
            
            console.log('Original response length:', responseText.length);
            console.log('Cleaned response length:', cleanedResponse.length);
            console.log('Cleaned response (first 300 chars):', cleanedResponse.substring(0, 300));
            
            // Try to parse the entire cleaned response as JSON first
            let analysis;
            try {
                analysis = JSON.parse(cleanedResponse);
                console.log('✅ JSON parsed successfully on first attempt');
            } catch (directParseError) {
                // If direct parse fails, try to extract JSON object using regex
                console.log('Direct JSON parse failed, trying regex extraction...');
                console.log('Parse error was:', directParseError.message);
                
                // Try to find the outermost JSON object
                const jsonMatch = cleanedResponse.match(/(\{[\s\S]*\})/);
                if (!jsonMatch) {
                    // One last attempt - remove ALL backticks and "json" keywords
                    const ultraClean = responseText.replace(/```/g, '').replace(/^json\s*/gi, '').trim();
                    console.log('Trying ultra-clean approach, length:', ultraClean.length);
                    console.log('Ultra-clean preview:', ultraClean.substring(0, 300));
                    
                    try {
                        analysis = JSON.parse(ultraClean);
                        console.log('✅ JSON parsed successfully with ultra-clean approach');
                    } catch (ultraError) {
                        throw new Error('No JSON object found in response. Response starts with: ' + cleanedResponse.substring(0, 100));
                    }
                } else {
                    try {
                        analysis = JSON.parse(jsonMatch[1]);
                        console.log('✅ JSON parsed successfully with regex extraction');
                    } catch (regexParseError) {
                        console.error('Regex extracted JSON but parsing still failed:', regexParseError.message);
                        throw regexParseError;
                    }
                }
            }
            
            // Validate required fields
            const requiredFields = ['case_name', 'citation', 'summary', 'key_issues', 'notable_quotes', 'significant_principles'];
            for (const field of requiredFields) {
                if (!analysis[field]) {
                    analysis[field] = field === 'case_name' ? 'Unknown Case' : 
                                    field === 'citation' ? '' : 
                                    field === 'summary' ? 'No summary available' : [];
                }
            }

            return analysis;

        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Parse error details:', parseError.message);
            console.error('Raw response (first 1000 chars):', responseText.substring(0, 1000));
            
            // Return a fallback structure with the cleaned response for debugging
            return {
                case_name: 'Parsing Failed',
                citation: '',
                summary: 'Unable to parse AI response after multiple attempts. Please check the console for details. Error: ' + parseError.message,
                key_issues: ['Analysis failed - JSON parsing error: ' + parseError.message],
                notable_quotes: ['Raw response for debugging (first 800 chars): ' + responseText.substring(0, 800)],
                significant_principles: ['Check browser console (F12) for full response text']
            };
        }
    }

    createPrompt(title, citation, text) {
        const systemPrompt = `You are a legal AI assistant specializing in analyzing commonwealth legal judgments. Your task is to analyze the provided document and extract key legal information in a structured JSON format.

FIRST: Determine if this is a legal judgment or court decision. If it is NOT a legal judgment (e.g., press releases, news articles, government announcements, etc.), then set key_issues, notable_quotes, and significant_principles to ["Not applicable."] and provide an appropriate summary explaining what type of document it is.

ANALYSIS REQUIREMENTS (for legal judgments only):
1. Read through the ENTIRE judgment carefully
2. Identify the key legal issues (up to 5 most important issues)
3. Extract 3-5 notable quotes that show the court's reasoning
4. Identify 3-5 significant legal principles that have general applicability
5. Provide a comprehensive 3-4 sentence summary covering: the dispute, key findings, and legal significance

FOCUS ON QUALITY OVER QUANTITY:
- Select only the MOST important issues, quotes, and principles
- Prioritize content that has reference value for other cases
- Emphasize general legal principles over case-specific facts

For Quotes:
- Choose quotes that demonstrate legal reasoning, not just factual findings
- Focus on statements that establish or apply legal principles
- Avoid quotes that are purely procedural or case-specific

For Principles:
- Extract GENERAL legal principles that apply beyond this specific case
- Focus on principles that legal practitioners can reference in other matters
- Avoid case-specific holdings - focus on broader legal rules and tests
- Examples of good principles: "The test for contract interpretation", "Requirements for establishing breach of confidence", "Principles of patent validity assessment"

CRITICAL REQUIREMENTS - ACCURACY IS PARAMOUNT:
1. For notable_quotes: Extract EXACT quotes from the judgment text - NO paraphrasing, NO summarizing
2. Do NOT include paragraph numbers or references in quotes - just the quote text itself
3. Only include quotes that you can see VERBATIM in the provided judgment text
4. Keep quotes concise (1-3 sentences maximum)
5. Ensure all JSON strings properly escape special characters (use backslash before quotes: \")
6. Replace all apostrophes with "'" or avoid them entirely to prevent JSON errors
7. For quotes within quotes, use \" for inner quotes

ANTI-HALLUCINATION MEASURES - CRITICAL:
- Only extract information that is explicitly stated in the judgment
- Do not infer or assume facts not present in the text
- ALL quotes must be word-for-word from the judgment - no paraphrasing
- If you're not sure a quote is exact, don't include it
- Focus on the court's actual reasoning and legal principles
- Avoid procedural or administrative quotes

Respond ONLY with valid JSON in this exact format:
{
  "case_name": "Full case name as it appears (e.g., 'Teva UK Ltd v AstraZeneca AB')",
  "citation": "Legal citation if found (e.g., '[2014] EWHC 2873 (Pat)')",
  "summary": "Comprehensive 3-4 sentence summary covering the dispute, key findings, court decision, and legal significance",
  "key_issues": ["Issue 1", "Issue 2", "Issue 3"],
  "notable_quotes": ["Exact quote from judgment without paragraph numbers", "Another exact quote", "Third quote"],
  "significant_principles": ["General principle applicable to other cases", "Another transferable legal principle", "Third principle with reference value"]
}

CRITICAL FOR CASE NAME:
- Extract the actual parties' names (e.g., "Teva UK Ltd v AstraZeneca AB")
- Do NOT use section headers like "Court of Appeal Decisions" or "High Court Patents"
- If the title provided is a section header, extract the real case name from the judgment text itself
- Look for the "Between:" section or party names at the start of the judgment
- EXCLUDE party designations like "1st Plaintiff", "2nd Plaintiff", "1st Defendant", "2nd Defendant", "Plaintiff", "Defendant", "Appellant", "Respondent", etc.
- Only include the actual names of the parties (e.g., "AAD and AAE v BBF" not "AAD 1st Plaintiff and AAE 2nd Plaintiff v BBF Defendant")

CRITICAL FOR CITATION:
- Extract citation exactly as it appears in "Cite as:" or "Neutral Citation Number:" field
- HONG KONG CITATION FORMAT (IMPORTANT - Official Judiciary Rules):
  * Since 1 January 2018, ALL Hong Kong judgments have neutral citations
  * Neutral citation format: "[YEAR] COURT NUMBER" where YEAR must be in square brackets (e.g., "[2020] HKCFA 32" or "[2024] HKCFI 576")
  * When a neutral citation exists, provide ONLY the neutral citation - do NOT include the action number
  * Example: For a case with action number "FACV Nos. 3 and 5 of 2019" and neutral citation "[2020] HKCFA 32", output ONLY: "[2020] HKCFA 32"
  * CRITICAL: The neutral citation MUST include the year in square brackets like "[2020]" - NEVER output just "HKCFA 32" without the year
  * Common HK courts: HKCFI (Court of First Instance), HKCA (Court of Appeal), HKCFA (Court of Final Appeal)
  * Only use action number format (e.g., "HCA 537/2014") if there is NO neutral citation (pre-2018 cases)
- UK and other jurisdictions: Use neutral citation format "[year] COURT number" (e.g., "[2025] UKSC 22")

IMPORTANT FOR JSON VALIDITY:
- Ensure proper JSON escaping - use \\" for quotes within strings
- Replace apostrophes (') with appropriate alternatives to avoid JSON errors
- Keep arrays to 3-5 items each
- Do not include any text outside the JSON object
- Test that your output is valid JSON`;

        const userPrompt = `Please analyze this legal judgment:

Title: ${title || 'Not specified'}
Citation: ${citation || 'Not specified'}

Judgment Text:
${text.substring(0, 100000)}${text.length > 100000 ? '\n\n[Text truncated for length]' : ''}`;

        return {
            contents: [
                {
                    parts: [
                        {
                            text: `${systemPrompt}\n\n${userPrompt}`
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,  // Increased from 4096 to handle longer responses
            }
        };
    }

    async callGeminiAPI(prompt, modelType = 'gemini-flash') {
        // Map model types to actual API model names
        const modelMapping = {
            'gemini-flash': 'gemini-2.5-flash',
            'gemini-flash-lite': 'gemini-2.5-flash-lite',
            'gemini-pro': 'gemini-2.5-pro',
            'gemini': 'gemini-2.5-flash'  // Legacy default
        };
        
        const modelName = modelMapping[modelType] || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.geminiApiKey}`;
        
        console.log(`Using Gemini model: ${modelName}`);
        console.log(`Gemini API key being used: ${this.geminiApiKey ? `${this.geminiApiKey.substring(0, 10)}...` : 'null'}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(prompt)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from Gemini API');
        }

        const candidate = data.candidates[0];
        
        // Check finish_reason for truncation
        const finishReason = candidate.finishReason;
        console.log('Gemini finish_reason:', finishReason);
        
        if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
            console.error('⚠️ Response was truncated due to token limit!');
            console.error('Consider: 1) Using a model with higher limits, 2) Shortening input text, 3) Simplifying prompt');
        }
        
        if (finishReason === 'SAFETY') {
            throw new Error('Response blocked by Gemini safety filters. The content may have triggered safety concerns.');
        }
        
        if (finishReason === 'RECITATION') {
            console.warn('⚠️ Response may contain recited content');
        }
        
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error(`Empty response from Gemini API. Finish reason: ${finishReason}`);
        }

        const responseText = candidate.content.parts[0].text;
        
        try {
            // Remove markdown code fences if present
            let cleanedResponse = responseText.trim();
            
            // Remove ```json, ```JSON, or just ``` at the start and end
            cleanedResponse = cleanedResponse.replace(/^```\s*json\s*/gi, '');
            cleanedResponse = cleanedResponse.replace(/^```\s*/g, '');
            cleanedResponse = cleanedResponse.replace(/\s*```\s*$/g, '');
            cleanedResponse = cleanedResponse.trim();
            
            console.log('Original response length:', responseText.length);
            console.log('Cleaned response length:', cleanedResponse.length);
            console.log('Cleaned response (first 300 chars):', cleanedResponse.substring(0, 300));
            
            // Try to parse the entire cleaned response as JSON first
            let analysis;
            try {
                analysis = JSON.parse(cleanedResponse);
                console.log('✅ JSON parsed successfully on first attempt');
            } catch (directParseError) {
                // If direct parse fails, try to extract JSON object using regex
                console.log('Direct JSON parse failed, trying regex extraction...');
                console.log('Parse error was:', directParseError.message);
                
                // Try to find the outermost JSON object
                const jsonMatch = cleanedResponse.match(/(\{[\s\S]*\})/);
                if (!jsonMatch) {
                    // One last attempt - remove ALL backticks and "json" keywords
                    const ultraClean = responseText.replace(/```/g, '').replace(/^json\s*/gi, '').trim();
                    console.log('Trying ultra-clean approach, length:', ultraClean.length);
                    console.log('Ultra-clean preview:', ultraClean.substring(0, 300));
                    
                    try {
                        analysis = JSON.parse(ultraClean);
                        console.log('✅ JSON parsed successfully with ultra-clean approach');
                    } catch (ultraError) {
                        throw new Error('No JSON object found in response. Response starts with: ' + cleanedResponse.substring(0, 100));
                    }
                } else {
                    try {
                        analysis = JSON.parse(jsonMatch[1]);
                        console.log('✅ JSON parsed successfully with regex extraction');
                    } catch (regexParseError) {
                        console.error('Regex extracted JSON but parsing still failed:', regexParseError.message);
                        throw regexParseError;
                    }
                }
            }
            
            // Validate required fields
            const requiredFields = ['case_name', 'citation', 'summary', 'key_issues', 'notable_quotes', 'significant_principles'];
            for (const field of requiredFields) {
                if (!analysis[field]) {
                    analysis[field] = field === 'case_name' ? 'Unknown Case' : 
                                    field === 'citation' ? '' : 
                                    field === 'summary' ? 'No summary available' : [];
                }
            }

            return analysis;

        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Parse error details:', parseError.message);
            console.error('Raw response (first 1000 chars):', responseText.substring(0, 1000));
            
            // One more aggressive attempt - strip ALL backticks and try again
            let lastAttempt = responseText.replace(/```/g, '').trim();
            // Remove "json" if it's at the start
            lastAttempt = lastAttempt.replace(/^json\s*/i, '').trim();
            
            try {
                const finalMatch = lastAttempt.match(/\{[\s\S]*\}/);
                if (finalMatch) {
                    let jsonString = finalMatch[0];
                    
                    // Try to fix common JSON errors
                    // 1. Fix unescaped quotes within strings (common in legal text)
                    // This is tricky - we need to be careful not to break valid JSON
                    
                    // 2. Fix trailing commas
                    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
                    
                    // 3. Try to parse
                    try {
                        const lastTryAnalysis = JSON.parse(jsonString);
                        console.log('Successfully parsed on final attempt!');
                        
                        // Validate and fill in missing fields
                        const requiredFields = ['case_name', 'citation', 'summary', 'key_issues', 'notable_quotes', 'significant_principles'];
                        for (const field of requiredFields) {
                            if (!lastTryAnalysis[field]) {
                                lastTryAnalysis[field] = field === 'case_name' ? 'Unknown Case' : 
                                                        field === 'citation' ? '' : 
                                                        field === 'summary' ? 'No summary available' : [];
                            }
                        }
                        
                        return lastTryAnalysis;
                    } catch (innerError) {
                        // If still failing, try to manually parse truncated at error position
                        console.log('JSON still invalid, attempting to extract valid portion...');
                        
                        // Extract up to the error position and try to close the JSON properly
                        const errorPos = parseError.message.match(/position (\d+)/);
                        if (errorPos) {
                            const pos = parseInt(errorPos[1]);
                            let truncated = jsonString.substring(0, pos);
                            
                            // Try to find the last complete field and close the JSON
                            const lastCommaIdx = truncated.lastIndexOf(',');
                            if (lastCommaIdx > 0) {
                                truncated = truncated.substring(0, lastCommaIdx);
                                // Close any open arrays/objects
                                const openBrackets = (truncated.match(/\[/g) || []).length - (truncated.match(/\]/g) || []).length;
                                const openBraces = (truncated.match(/\{/g) || []).length - (truncated.match(/\}/g) || []).length;
                                
                                for (let i = 0; i < openBrackets; i++) truncated += ']';
                                for (let i = 0; i < openBraces; i++) truncated += '}';
                                
                                try {
                                    const recoveredAnalysis = JSON.parse(truncated);
                                    console.log('Successfully recovered partial JSON!');
                                    
                                    // Fill in missing fields
                                    const requiredFields = ['case_name', 'citation', 'summary', 'key_issues', 'notable_quotes', 'significant_principles'];
                                    for (const field of requiredFields) {
                                        if (!recoveredAnalysis[field]) {
                                            recoveredAnalysis[field] = field === 'case_name' ? 'Unknown Case' : 
                                                                        field === 'citation' ? '' : 
                                                                        field === 'summary' ? 'No summary available' : [];
                                        }
                                    }
                                    
                                    return recoveredAnalysis;
                                } catch (recoveryError) {
                                    console.error('Recovery also failed:', recoveryError);
                                }
                            }
                        }
                    }
                }
            } catch (finalError) {
                console.error('Final parse attempt also failed:', finalError);
            }
            
            // Return a fallback structure with the cleaned response for debugging
            return {
                case_name: 'Parsing Failed',
                citation: '',
                summary: 'Unable to parse AI response after multiple attempts. Please check the console for details. Error: ' + parseError.message,
                key_issues: ['Analysis failed - JSON parsing error: ' + parseError.message],
                notable_quotes: ['Raw response for debugging (first 800 chars): ' + responseText.substring(0, 800)],
                significant_principles: ['Check browser console (F12) for full response text']
            };
        }
    }

    async secondaryAiQualityCheck(geminiAnalysis, sourceText) {
        /**
         * Use Secondary AI Reasoner to perform full independent analysis
         * Compare with Gemini and return consensus/enhanced analysis
         * 
         * NOTE: This function is currently DISABLED in the UI due to performance issues.
         * The Secondary AI model takes a very long time to process judgment texts (often several minutes),
         * which significantly impacts user experience. This feature will be revisited in later versions
         * when faster models or optimizations become available.
         */
        
        try {
            // Ensure we have Secondary AI API key
            if (!this.secondaryAiApiKey) {
                await this.loadApiKey();
            }
            
            if (!this.secondaryAiApiKey) {
                throw new Error('Secondary AI API key not configured. Please add your Secondary AI API key in Settings to use cross-checking.');
            }
            
            console.log('Secondary AI independent analysis starting...');
            
            const analysisPrompt = {
                model: "secondaryAi-reasoner",
                messages: [
                    {
                        role: "system",
                        content: `You are an experienced legal practitioner and senior legal analyst with expertise in UK, Hong Kong, and Commonwealth law. Accuracy is your paramount concern - you never paraphrase, never guess, and never include information that is not explicitly stated in the judgment.

Your role: Perform independent legal analysis and cross-check another AI's work for accuracy.

Core principles:
- ACCURACY ABOVE ALL: Only extract information explicitly stated in the judgment
- NO PARAPHRASING: All quotes must be word-for-word exact
- NO HALLUCINATION: If you cannot verify something, say so
- FOCUS ON SUBSTANCE: Prioritize legal reasoning and principles with reference value
- PROFESSIONAL JUDGMENT: Apply your legal expertise to identify what matters most`
                    },
                    {
                        role: "user",
                        content: `You are cross-checking another AI's analysis of a legal judgment. Perform your OWN independent analysis, then compare with the other AI's work.

JUDGMENT TEXT (first 100000 characters):
${sourceText.substring(0, 100000)}

GEMINI AI'S ANALYSIS TO CROSS-CHECK:
${JSON.stringify(geminiAnalysis, null, 2)}

TASK:
1. Verify EVERY SINGLE quote from Gemini - check all ${(geminiAnalysis.notable_quotes || []).length} quotes
2. For each quote, determine if it's Exact/Paraphrased/Not found in the judgment
3. If a Gemini quote is inaccurate, provide the corrected exact quote
4. Perform your own independent analysis for comparison
5. Provide better quotes if Gemini's are inadequate

CRITICAL: You must check ALL ${(geminiAnalysis.notable_quotes || []).length} quotes from Gemini, not just a subset.

Respond with JSON containing YOUR analysis and comparison:
{
  "case_name": "Your extraction of case name",
  "citation": "Your extraction of citation", 
  "summary": "Your 3-4 sentence summary",
  "key_issues": ["Your identified issues (3-5)"],
  "notable_quotes": ["Your corrected/verified exact quotes (same count as Gemini: ${(geminiAnalysis.notable_quotes || []).length})"],
  "significant_principles": ["Your extracted general principles (3-5)"],
  "cross_check_notes": {
    "gemini_accuracy": "high/medium/low",
    "citation_accuracy": "Correct/Incorrect - [explain if incorrect]",
    "case_name_accuracy": "Correct/Incorrect - [explain if incorrect]",
    "quote_accuracy": ["Quote 1: Exact/Paraphrased/Not found", "Quote 2: Exact/Paraphrased/Not found", "Quote 3: ...", "Quote 4: ...", "Quote 5: ..."],
    "issues_found": ["List any inaccuracies in Gemini's analysis"],
    "improvements": ["Specific improvements made to quotes or principles"],
    "quotes_checked": ${(geminiAnalysis.notable_quotes || []).length}
  }
}

IMPORTANT: 
- quote_accuracy array MUST have ${(geminiAnalysis.notable_quotes || []).length} entries (one for each Gemini quote)
- notable_quotes should have same number of items as Gemini (${(geminiAnalysis.notable_quotes || []).length}), either verified or corrected versions

CRITICAL: All your quotes must be EXACT word-for-word from the judgment. No paraphrasing.
Ensure proper JSON escaping for quotes within strings.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 8000  // Increased from 4096 to allow full cross-check response
            };

            const secondaryAiResponse = await fetch('https://api.secondaryAi.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.secondaryAiApiKey}`
                },
                body: JSON.stringify(analysisPrompt)
            });

            if (!secondaryAiResponse.ok) {
                const errorData = await secondaryAiResponse.json().catch(() => ({}));
                throw new Error(`Secondary AI API error: ${secondaryAiResponse.status} - ${errorData.error?.message || secondaryAiResponse.statusText}`);
            }

            const secondaryAiData = await secondaryAiResponse.json();
            
            // Check if response was truncated
            const finishReason = secondaryAiData.choices[0]?.finish_reason;
            console.log('Secondary AI finish_reason:', finishReason);
            
            if (finishReason === 'length') {
                console.warn('⚠️ Secondary AI response was truncated due to token limit!');
                console.warn('Consider using a simpler prompt or shorter input text');
            }
            
            let secondaryAiText = secondaryAiData.choices[0].message.content;
            
            // Parse Secondary AI's response with robust error handling
            console.log('Secondary AI raw response length:', secondaryAiText.length);
            console.log('Secondary AI raw response (first 500 chars):', secondaryAiText.substring(0, 500));
            
            // Remove markdown fences if present
            secondaryAiText = secondaryAiText.trim().replace(/^```\s*json\s*/gi, '').replace(/^```\s*/g, '').replace(/\s*```\s*$/g, '').trim();
            
            console.log('Secondary AI cleaned response length:', secondaryAiText.length);
            
            // Try to parse with multiple recovery attempts
            let secondaryAiAnalysis;
            try {
                secondaryAiAnalysis = JSON.parse(secondaryAiText);
            } catch (parseError) {
                console.error('Initial Secondary AI JSON parse failed:', parseError.message);
                console.log('Failed text around position', parseError.message.match(/position (\d+)/)?.[1] || 'unknown');
                
                // Try to fix common JSON issues
                let fixedText = secondaryAiText
                    // Fix unescaped quotes in strings (common in legal text)
                    .replace(/": "([^"]*)"([^"]*?)"/g, (match, p1, p2) => {
                        // If there's a quote inside a string, escape it
                        if (p2 && !p2.startsWith(',') && !p2.startsWith('}')) {
                            return `": "${p1}\\"${p2}"`;
                        }
                        return match;
                    })
                    // Remove trailing commas
                    .replace(/,(\s*[}\]])/g, '$1')
                    // Fix line breaks in strings
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, '');
                
                try {
                    secondaryAiAnalysis = JSON.parse(fixedText);
                    console.log('✅ JSON parsing succeeded after fixes');
                } catch (secondError) {
                    console.error('Second parse attempt failed:', secondError.message);
                    // Try to extract partial JSON
                    try {
                        // Find the first complete object
                        const match = secondaryAiText.match(/\{[\s\S]*\}/);
                        if (match) {
                            secondaryAiAnalysis = JSON.parse(match[0]);
                            console.log('✅ Extracted partial JSON successfully');
                        } else {
                            throw new Error('Could not find valid JSON in response');
                        }
                    } catch (thirdError) {
                        console.error('All JSON parsing attempts failed');
                        console.error('Secondary AI response (full):', secondaryAiText);
                        throw new Error(`Secondary AI returned invalid JSON: ${parseError.message}`);
                    }
                }
            }
            
            console.log('Secondary AI analysis completed');
            console.log('Gemini accuracy rating:', secondaryAiAnalysis.cross_check_notes?.gemini_accuracy);
            
            // Validate that Secondary AI checked all quotes
            const geminiQuoteCount = (geminiAnalysis.notable_quotes || []).length;
            const secondaryAiQuoteAccuracy = (secondaryAiAnalysis.cross_check_notes?.quote_accuracy || []).length;
            
            if (secondaryAiQuoteAccuracy < geminiQuoteCount) {
                console.warn(`Secondary AI only checked ${secondaryAiQuoteAccuracy}/${geminiQuoteCount} quotes - adding note`);
                if (!secondaryAiAnalysis.cross_check_notes) secondaryAiAnalysis.cross_check_notes = {};
                if (!secondaryAiAnalysis.cross_check_notes.issues_found) secondaryAiAnalysis.cross_check_notes.issues_found = [];
                secondaryAiAnalysis.cross_check_notes.issues_found.push(`Note: Secondary AI checked ${secondaryAiQuoteAccuracy} of ${geminiQuoteCount} quotes`);
            }
            
            // Create consensus analysis using best from both AIs
            const consensusAnalysis = {
                case_name: this.chooseBest(geminiAnalysis.case_name, secondaryAiAnalysis.case_name, 'case_name'),
                citation: this.chooseBest(geminiAnalysis.citation, secondaryAiAnalysis.citation, 'citation'),
                summary: this.chooseBest(geminiAnalysis.summary, secondaryAiAnalysis.summary, 'summary'),
                key_issues: this.mergeArrays(geminiAnalysis.key_issues, secondaryAiAnalysis.key_issues, 5),
                notable_quotes: secondaryAiAnalysis.notable_quotes || geminiAnalysis.notable_quotes, // Prefer Secondary AI's exact quotes
                significant_principles: this.mergeArrays(geminiAnalysis.significant_principles, secondaryAiAnalysis.significant_principles, 5),
                secondaryAi_verified: true,
                cross_check_summary: {
                    gemini_accuracy: secondaryAiAnalysis.cross_check_notes?.gemini_accuracy || 'unknown',
                    issues_found: secondaryAiAnalysis.cross_check_notes?.issues_found || [],
                    quote_accuracy: secondaryAiAnalysis.cross_check_notes?.quote_accuracy || []
                }
            };
            
            return consensusAnalysis;
            
        } catch (error) {
            console.error('Secondary AI analysis error:', error);
            // Return Gemini results with error note
            return {
                ...geminiAnalysis,
                quality_notes: [`Secondary AI cross-check failed: ${error.message}`]
            };
        }
    }

    chooseBest(geminiValue, secondaryAiValue, fieldName) {
        /**
         * Choose the better value between Gemini and Secondary AI
         */
        // Prefer longer, more detailed values
        if (!geminiValue && secondaryAiValue) return secondaryAiValue;
        if (geminiValue && !secondaryAiValue) return geminiValue;
        if (!geminiValue && !secondaryAiValue) return '';
        
        // For strings, prefer the longer, more detailed one
        if (typeof geminiValue === 'string' && typeof secondaryAiValue === 'string') {
            // If one says "Unknown" or similar, prefer the other
            if (geminiValue.includes('Unknown') && !secondaryAiValue.includes('Unknown')) return secondaryAiValue;
            if (secondaryAiValue.includes('Unknown') && !geminiValue.includes('Unknown')) return geminiValue;
            
            // Prefer longer summaries (more detailed)
            return secondaryAiValue.length > geminiValue.length ? secondaryAiValue : geminiValue;
        }
        
        return geminiValue; // Default to Gemini
    }

    mergeArrays(geminiArray, secondaryAiArray, maxItems) {
        /**
         * Merge and deduplicate arrays from both AIs
         */
        if (!Array.isArray(geminiArray)) geminiArray = [];
        if (!Array.isArray(secondaryAiArray)) secondaryAiArray = [];
        
        // Combine and deduplicate
        const combined = [...secondaryAiArray, ...geminiArray];
        const unique = [];
        const seen = new Set();
        
        for (const item of combined) {
            const normalized = item.toLowerCase().trim();
            if (!seen.has(normalized) && unique.length < maxItems) {
                seen.add(normalized);
                unique.push(item);
            }
        }
        
        return unique;
    }

    createSimplePrompt(title, citation, text) {
        /**
         * Create a simple string prompt (for Secondary AI)
         * Unlike createPrompt which returns a Gemini-formatted object
         */
        const systemPrompt = `You are a legal AI assistant specializing in analyzing commonwealth legal judgments. Your task is to analyze the provided judgment text and extract key legal information in a structured JSON format.

ANALYSIS REQUIREMENTS:
1. Read through the ENTIRE judgment carefully
2. Identify the key legal issues (up to 5 most important issues)
3. Extract 3-5 notable quotes that show the court's reasoning
4. Identify 3-5 significant legal principles that have general applicability
5. Provide a comprehensive 3-4 sentence summary covering: the dispute, key findings, and legal significance

FOCUS ON QUALITY OVER QUANTITY:
- Select only the MOST important issues, quotes, and principles
- Prioritize content that has reference value for other cases
- Emphasize general legal principles over case-specific facts

For Quotes:
- Choose quotes that demonstrate legal reasoning, not just factual findings
- Focus on statements that establish or apply legal principles
- Avoid quotes that are purely procedural or case-specific

For Principles:
- Extract GENERAL legal principles that apply beyond this specific case
- Focus on principles that legal practitioners can reference in other matters
- Avoid case-specific holdings - focus on broader legal rules and tests

CRITICAL REQUIREMENTS - ACCURACY IS PARAMOUNT:
1. For notable_quotes: Extract EXACT quotes from the judgment text - NO paraphrasing, NO summarizing
2. Do NOT include paragraph numbers or references in quotes - just the quote text itself
3. Only include quotes that you can see VERBATIM in the provided judgment text
4. Keep quotes concise (1-3 sentences maximum)
5. Ensure all JSON strings properly escape special characters (use backslash before quotes: \\")

ANTI-HALLUCINATION MEASURES - CRITICAL:
- Only extract information that is explicitly stated in the judgment
- Do not infer or assume facts not present in the text
- ALL quotes must be word-for-word from the judgment - no paraphrasing

Respond ONLY with valid JSON in this exact format:
{
  "case_name": "Full case name as it appears",
  "citation": "Legal citation if found",
  "summary": "Comprehensive 3-4 sentence summary",
  "key_issues": ["Issue 1", "Issue 2", "Issue 3"],
  "notable_quotes": ["Exact quote from judgment", "Another exact quote", "Third quote"],
  "significant_principles": ["General principle applicable to other cases", "Another principle", "Third principle"]
}

Title: ${title || 'Not specified'}
Citation: ${citation || 'Not specified'}

Judgment Text:
${text.substring(0, 100000)}${text.length > 100000 ? '\n\n[Text truncated for length]' : ''}`;

        return systemPrompt;
    }

    async callSecondaryAIDirectly(title, citation, text) {
        /**
         * Call Secondary AI API directly for primary analysis
         */
        if (!this.secondaryAiApiKey) {
            throw new Error('Secondary AI API key not configured');
        }
        
        const systemInstructions = `You are a legal AI assistant specializing in analyzing legal judgments. Extract key legal information in structured JSON format.

ANALYSIS REQUIREMENTS:
1. Read through the ENTIRE judgment carefully
2. Identify 3-5 key legal issues
3. Extract 3-5 notable quotes showing the court's reasoning
4. Identify 3-5 significant legal principles with general applicability
5. Provide a comprehensive 3-4 sentence summary

CRITICAL: 
- Quotes must be EXACT word-for-word from the judgment
- Issues and principles should be substantive, not procedural
- Focus on content with reference value for other cases

Respond ONLY with valid JSON:
{
  "case_name": "Full case name",
  "citation": "Legal citation",
  "summary": "3-4 sentence summary of dispute, findings, and significance",
  "key_issues": ["Issue 1", "Issue 2", "Issue 3"],
  "notable_quotes": ["Exact quote 1", "Exact quote 2", "Exact quote 3"],
  "significant_principles": ["Principle 1", "Principle 2", "Principle 3"]
}`;

        const judgmentText = text.substring(0, 100000);
        const userMessage = `Analyze this legal judgment:

Title: ${title || 'Not specified'}
Citation: ${citation || 'Not specified'}

JUDGMENT TEXT:
${judgmentText}${text.length > 100000 ? '\n\n[Text truncated for length]' : ''}

Provide your analysis in JSON format.`;

        console.log('Secondary AI request details:', {
            titleLength: (title || '').length,
            citationLength: (citation || '').length,
            judgmentTextLength: judgmentText.length,
            totalTextLength: text.length,
            judgmentTextPreview: judgmentText.substring(0, 200)
        });
        
        const requestBody = {
            model: "secondaryAi-reasoner",
            messages: [
                {
                    role: "system",
                    content: systemInstructions
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            temperature: 0.3,
            max_tokens: 8000
        };

        const response = await fetch('https://api.secondaryAi.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.secondaryAiApiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Secondary AI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        console.log('Secondary AI full response:', JSON.stringify(data, null, 2));
        
        // Secondary AI Reasoner returns reasoning_content and content separately
        // Get the actual content (not the reasoning process)
        let responseText = data.choices[0]?.message?.content || '';
        
        // If content is empty, there might be an issue
        if (!responseText || responseText.trim().length === 0) {
            console.error('Secondary AI returned empty content!');
            console.error('Full response object:', data);
            throw new Error('Secondary AI returned empty response. Please try again.');
        }
        
        console.log('Secondary AI raw response length:', responseText.length);
        console.log('Secondary AI raw response (first 500 chars):', responseText.substring(0, 500));
        
        // Clean and parse response
        responseText = responseText.trim().replace(/^```\s*json\s*/gi, '').replace(/^```\s*/g, '').replace(/\s*```\s*$/g, '').trim();
        
        console.log('Secondary AI cleaned response length:', responseText.length);
        
        try {
            const parsed = JSON.parse(responseText);
            console.log('Secondary AI parsed successfully:', {
                hasQuotes: !!parsed.notable_quotes,
                quotesCount: parsed.notable_quotes?.length || 0,
                hasIssues: !!parsed.key_issues,
                issuesCount: parsed.key_issues?.length || 0,
                hasSummary: !!parsed.summary,
                hasCaseName: !!parsed.case_name
            });
            
            // Validate that we got meaningful data
            if (!parsed.case_name && !parsed.summary && !parsed.key_issues && !parsed.notable_quotes) {
                console.error('Secondary AI returned empty analysis!');
                throw new Error('Secondary AI returned empty analysis. All fields are missing.');
            }
            
            return parsed;
        } catch (parseError) {
            console.error('Secondary AI JSON parse error:', parseError);
            console.error('Failed to parse:', responseText.substring(0, 1000));
            throw new Error(`Failed to parse Secondary AI response: ${parseError.message}`);
        }
    }

    async crossCheckWithSecondModel(primaryAnalysis, sourceText, secondaryModel) {
        /**
         * Cross-check primary analysis with a second AI model
         */
        if (secondaryModel.startsWith('gemini')) {
            // Cross-check with Gemini (any variant)
            return await this.geminiCrossCheck(primaryAnalysis, sourceText, secondaryModel);
        } else if (secondaryModel === 'grok') {
            // Cross-check with Grok
            return await this.grokCrossCheck(primaryAnalysis, sourceText);
        } else {
            throw new Error(`Unknown secondary model: ${secondaryModel}`);
        }
    }

    async geminiCrossCheck(primaryAnalysis, sourceText, geminiModel = 'gemini-flash') {
        /**
         * Use Gemini to cross-check another model's analysis (Secondary AI or another Gemini)
         */
        if (!this.geminiApiKey) {
            throw new Error('Gemini API key not configured');
        }

        console.log(`Using Gemini model for cross-check: ${geminiModel}`);

        const crossCheckPrompt = `You are cross-checking another AI's analysis of a document. FIRST: Determine if this is a legal judgment or court decision. If it is NOT a legal judgment (e.g., press releases, news articles, government announcements, etc.), then set key_issues, notable_quotes, and significant_principles to ["Not applicable."] and provide an appropriate summary explaining what type of document it is. If it IS a legal judgment, perform your OWN independent analysis, then compare with the other AI's work.

JUDGMENT TEXT (first 100000 characters):
${sourceText.substring(0, 100000)}

PRIMARY AI'S ANALYSIS TO CROSS-CHECK:
${JSON.stringify(primaryAnalysis, null, 2)}

TASK:
1. Verify EVERY SINGLE quote from the primary analysis - check all ${(primaryAnalysis.notable_quotes || []).length} quotes
2. For each quote, determine if it's Exact/Paraphrased/Not found in the judgment
3. If a quote is inaccurate, provide the corrected exact quote
4. Perform your own independent analysis for comparison
5. Provide better quotes if the primary analysis quotes are inadequate

CRITICAL INSTRUCTIONS:
- You must check ALL ${(primaryAnalysis.notable_quotes || []).length} quotes from the primary analysis, not just a subset
- CASE NAME EXTRACTION - EXCLUDE party designations:
  * EXCLUDE party designations like "1st Plaintiff", "2nd Plaintiff", "1st Defendant", "2nd Defendant", "Plaintiff", "Defendant", "Appellant", "Respondent", etc.
  * Only include the actual names of the parties (e.g., "AAD and AAE v BBF" not "AAD 1st Plaintiff and AAE 2nd Plaintiff v BBF Defendant")
- CITATION VERIFICATION IS CRUCIAL - READ CAREFULLY:
  * The FIRST citation that appears near the top of the judgment (often after "You are here:" or in "Cite as:") is the CURRENT court's citation
  * Text like "On appeal from: [citation]" or "From: [citation]" refers to PREVIOUS lower court decisions - these are NOT the current judgment's citation
  * The judgment text may mention multiple citations from different courts in the appeal chain - focus on the PRIMARY citation at the top
  * Court hierarchy: UKSC (Supreme Court) > EWCA (Court of Appeal) > EWHC (High Court)
  * If you see both "[2025] UKSC 4" (at top) and "[2023] EWCA Civ 555" (after "On appeal from"), the current citation is [2025] UKSC 4 (Supreme Court)
  * DO NOT flag the primary citation as incorrect just because you see a lower court citation mentioned in the text
  * The primary AI's citation is likely correct if it matches the citation that appears first or in "Cite as:" field
  * HONG KONG CITATION FORMAT (IMPORTANT - Official Judiciary Rules):
    - Since 1 January 2018, ALL Hong Kong judgments have neutral citations
    - Neutral citation format: "[YEAR] COURT NUMBER" where YEAR must be in square brackets (e.g., "[2020] HKCFA 32" or "[2021] HKCFI 1474")
    - When a neutral citation exists, provide ONLY the neutral citation - do NOT include the action number
    - Example: For a case with action number "FACV Nos. 3 and 5 of 2019" and neutral citation "[2020] HKCFA 32", the correct citation is ONLY: "[2020] HKCFA 32"
    - CRITICAL: The neutral citation MUST include the year in square brackets like "[2020]" - NEVER output just "HKCFA 32" without the year
    - Common HK courts: HKCFI (Court of First Instance), HKCA (Court of Appeal), HKCFA (Court of Final Appeal)
    - Only use action number format (e.g., "HCA 537/2014") if there is NO neutral citation (pre-2018 cases)
- If the primary AI's citation matches the top/main citation, mark it as CORRECT, even if you see other citations in the judgment text

Respond with JSON containing YOUR analysis and comparison:
{
  "case_name": "Your extraction of case name",
  "citation": "Your extraction of citation", 
  "summary": "Your 3-4 sentence summary",
  "key_issues": ["Your identified issues (3-5)"],
  "notable_quotes": ["Your corrected/verified exact quotes (same count as primary: ${(primaryAnalysis.notable_quotes || []).length})"],
  "significant_principles": ["Your extracted general principles (3-5)"],
  "cross_check_notes": {
    "primary_accuracy": "high/medium/low",
    "citation_accuracy": "Correct/Incorrect - [explain if incorrect, include what the correct citation should be]",
    "case_name_accuracy": "Correct/Incorrect - [explain if incorrect]",
    "quote_accuracy": ["Quote 1: Exact/Paraphrased/Not found", "Quote 2: Exact/Paraphrased/Not found", "Quote 3: ...", "Quote 4: ...", "Quote 5: ..."],
    "issues_found": ["List any inaccuracies in primary analysis"],
    "improvements": ["Specific improvements made to quotes or principles"],
    "quotes_checked": ${(primaryAnalysis.notable_quotes || []).length}
  }
}

IMPORTANT: 
- quote_accuracy array MUST have ${(primaryAnalysis.notable_quotes || []).length} entries (one for each primary quote)
- notable_quotes should have same number of items as primary (${(primaryAnalysis.notable_quotes || []).length}), either verified or corrected versions
- citation_accuracy and case_name_accuracy are REQUIRED fields - always verify these

CRITICAL: All your quotes must be EXACT word-for-word from the judgment. No paraphrasing.
Ensure proper JSON escaping for quotes within strings.`;

        // Format prompt for Gemini API
        const formattedPrompt = {
            contents: [
                {
                    parts: [
                        {
                            text: crossCheckPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192  // Increased from 4096 to handle longer responses
            }
        };

        const response = await this.callGeminiAPI(formattedPrompt, geminiModel);
        
        // Ensure cross_check_notes exists
        if (!response.cross_check_notes) {
            console.warn('⚠️ Response missing cross_check_notes structure');
            response.cross_check_notes = {
                overall_agreement: 'Unknown',
                quote_accuracy: [],
                issues_found: ['Cross-check response incomplete - missing verification structure'],
                improvements: [],
                quotes_checked: 0
            };
        }
        
        // Validate that Gemini checked all quotes
        const primaryQuoteCount = (primaryAnalysis.notable_quotes || []).length;
        const geminiQuoteAccuracy = (response.cross_check_notes?.quote_accuracy || []).length;
        
        console.log(`📊 Quote validation: Gemini checked ${geminiQuoteAccuracy} of ${primaryQuoteCount} quotes`);
        
        if (geminiQuoteAccuracy < primaryQuoteCount) {
            console.warn(`⚠️ Gemini only checked ${geminiQuoteAccuracy}/${primaryQuoteCount} quotes - adding note`);
            if (!response.cross_check_notes.issues_found) response.cross_check_notes.issues_found = [];
            response.cross_check_notes.issues_found.push(`Note: Gemini checked ${geminiQuoteAccuracy} of ${primaryQuoteCount} quotes`);
            response.cross_check_notes.quotes_checked = geminiQuoteAccuracy;
        }
        
        // Create consensus analysis
        const consensusAnalysis = {
            case_name: this.chooseBest(primaryAnalysis.case_name, response.case_name, 'case_name'),
            citation: this.chooseBest(primaryAnalysis.citation, response.citation, 'citation'),
            summary: this.chooseBest(primaryAnalysis.summary, response.summary, 'summary'),
            key_issues: this.mergeArrays(primaryAnalysis.key_issues, response.key_issues, 5),
            notable_quotes: response.notable_quotes || primaryAnalysis.notable_quotes,
            significant_principles: this.mergeArrays(primaryAnalysis.significant_principles, response.significant_principles, 5),
            cross_check_notes: response.cross_check_notes || {
                primary_accuracy: 'medium',
                quote_accuracy: [],
                issues_found: ['Cross-check completed - both models analyzed independently'],
                improvements: []
            }
        };
        
        console.log('Gemini cross-check consensus created:', {
            hasCrossCheckNotes: !!consensusAnalysis.cross_check_notes,
            accuracy: consensusAnalysis.cross_check_notes?.primary_accuracy
        });
        
        return consensusAnalysis;
    }

    async grokCrossCheck(primaryAnalysis, sourceText) {
        /**
         * Use Grok to cross-check another model's analysis
         */
        if (!this.grokApiKey) {
            throw new Error('Grok API key not configured');
        }

        console.log('Using Grok for cross-check');

        const crossCheckPrompt = `You are cross-checking another AI's analysis of a document. You must respond ONLY with valid JSON - no function calls, no explanations, no markdown formatting. FIRST: Determine if this is a legal judgment or court decision. If it is NOT a legal judgment (e.g., press releases, news articles, government announcements, etc.), then set key_issues, notable_quotes, and significant_principles to ["Not applicable."] and provide an appropriate summary explaining what type of document it is. If it IS a legal judgment, perform your OWN independent analysis, then compare with the other AI's work.

JUDGMENT TEXT (first 100000 characters):
${sourceText.substring(0, 100000)}

PRIMARY AI'S ANALYSIS TO CROSS-CHECK:
${JSON.stringify(primaryAnalysis, null, 2)}

TASK:
1. Verify EVERY SINGLE quote from the primary analysis - check all ${(primaryAnalysis.notable_quotes || []).length} quotes
2. For each quote, determine if it's Exact/Paraphrased/Not found in the judgment
3. If a quote is inaccurate, provide the corrected exact quote
4. Perform your own independent analysis for comparison
5. Provide better quotes if the primary analysis quotes are inadequate

CRITICAL INSTRUCTIONS:
- You must check ALL ${(primaryAnalysis.notable_quotes || []).length} quotes from the primary analysis, not just a subset
- CASE NAME EXTRACTION - EXCLUDE party designations:
  * EXCLUDE party designations like "1st Plaintiff", "2nd Plaintiff", "1st Defendant", "2nd Defendant", "Plaintiff", "Defendant", "Appellant", "Respondent", etc.
  * Only include the actual names of the parties (e.g., "AAD and AAE v BBF" not "AAD 1st Plaintiff and AAE 2nd Plaintiff v BBF Defendant")
- CITATION VERIFICATION IS CRUCIAL - READ CAREFULLY:
  * The FIRST citation that appears near the top of the judgment (often after "You are here:" or in "Cite as:") is the CURRENT court's citation
  * Text like "On appeal from: [citation]" or "From: [citation]" refers to PREVIOUS lower court decisions - these are NOT the current judgment's citation
  * The judgment text may mention multiple citations from different courts in the appeal chain - focus on the PRIMARY citation at the top
  * Court hierarchy: UKSC (Supreme Court) > EWCA (Court of Appeal) > EWHC (High Court)
  * If you see both "[2025] UKSC 4" (at top) and "[2023] EWCA Civ 555" (after "On appeal from"), the current citation is [2025] UKSC 4 (Supreme Court)
  * DO NOT flag the primary citation as incorrect just because you see a lower court citation mentioned in the text
  * The primary AI's citation is likely correct if it matches the citation that appears first or in "Cite as:" field
  * HONG KONG CITATION FORMAT (IMPORTANT - Official Judiciary Rules):
    - Since 1 January 2018, ALL Hong Kong judgments have neutral citations
    - Neutral citation format: "[YEAR] COURT NUMBER" where YEAR must be in square brackets (e.g., "[2020] HKCFA 32" or "[2024] HKCFI 576")
    - When a neutral citation exists, provide ONLY the neutral citation - do NOT include the action number
    - Example: For a case with action number "FACV Nos. 3 and 5 of 2019" and neutral citation "[2020] HKCFA 32", the correct citation is ONLY: "[2020] HKCFA 32"
    - CRITICAL: The neutral citation MUST include the year in square brackets like "[2020]" - NEVER output just "HKCFA 32" without the year
    - Common HK courts: HKCFI (Court of First Instance), HKCA (Court of Appeal), HKCFA (Court of Final Appeal)
    - Only use action number format (e.g., "HCA 537/2014") if there is NO neutral citation (pre-2018 cases)
- If the primary AI's citation matches the top/main citation, mark it as CORRECT, even if you see other citations in the judgment text

Respond with JSON containing YOUR analysis and comparison:
{
  "case_name": "Your extraction of case name",
  "citation": "Your extraction of citation", 
  "summary": "Your 3-4 sentence summary",
  "key_issues": ["Your identified issues (3-5)"],
  "notable_quotes": ["Your corrected/verified exact quotes (same count as primary: ${(primaryAnalysis.notable_quotes || []).length})"],
  "significant_principles": ["Your extracted general principles (3-5)"],
  "cross_check_notes": {
    "primary_accuracy": "high/medium/low",
    "citation_accuracy": "Correct/Incorrect - [explain if incorrect, include what the correct citation should be]",
    "case_name_accuracy": "Correct/Incorrect - [explain if incorrect]",
    "quote_accuracy": ["Quote 1: Exact/Paraphrased/Not found", "Quote 2: Exact/Paraphrased/Not found", "Quote 3: ...", "Quote 4: ...", "Quote 5: ..."],
    "issues_found": ["List any inaccuracies in primary analysis"],
    "improvements": ["Specific improvements made to quotes or principles"],
    "quotes_checked": ${(primaryAnalysis.notable_quotes || []).length}
  }
}

IMPORTANT: 
- quote_accuracy array MUST have ${(primaryAnalysis.notable_quotes || []).length} entries (one for each primary quote)
- notable_quotes should have same number of items as primary (${(primaryAnalysis.notable_quotes || []).length}), either verified or corrected versions
- citation_accuracy and case_name_accuracy are REQUIRED fields - always verify these

CRITICAL: All your quotes must be EXACT word-for-word from the judgment. No paraphrasing.
Ensure proper JSON escaping for quotes within strings.

IMPORTANT: You must respond with ONLY the JSON object above. Do not use function calls, do not add explanations, do not wrap in markdown code blocks. Just the raw JSON object.`;

        const requestBody = {
            model: 'grok-4-fast-reasoning',
            messages: [
                {
                    role: 'system',
                    content: crossCheckPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 8192
        };

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.grokApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Grok API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from Grok API');
        }

        const responseText = data.choices[0].message.content;
        
        // Parse Grok's response with robust error handling
        console.log('Grok cross-check raw response length:', responseText.length);
        console.log('Grok cross-check raw response (first 500 chars):', responseText.substring(0, 500));
        
        // Check if response is a function call instead of JSON
        if (responseText.includes('<function_call') || responseText.includes('<argument')) {
            console.error('Grok returned function call instead of JSON. This indicates the model is trying to use tools instead of direct response.');
            throw new Error('Grok returned function call instead of JSON. Please try again or use a different model for cross-check.');
        }
        
        // Remove markdown fences if present
        let cleanedResponse = responseText.trim().replace(/^```\s*json\s*/gi, '').replace(/^```\s*/g, '').replace(/\s*```\s*$/g, '').trim();
        
        console.log('Grok cross-check cleaned response length:', cleanedResponse.length);
        
        // Try to parse with multiple recovery attempts
        let grokAnalysis;
        try {
            grokAnalysis = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Initial Grok JSON parse failed:', parseError.message);
            console.log('Failed text around position', parseError.message.match(/position (\d+)/)?.[1] || 'unknown');
            
            // Try to fix common JSON issues
            let fixedText = cleanedResponse
                // Fix unescaped quotes in strings (common in legal text)
                .replace(/": "([^"]*)"([^"]*?)"/g, (match, p1, p2) => {
                    // If there's a quote inside a string, escape it
                    if (p2 && !p2.startsWith(',') && !p2.startsWith('}')) {
                        return `": "${p1}\\"${p2}"`;
                    }
                    return match;
                })
                // Remove trailing commas
                .replace(/,(\s*[}\]])/g, '$1')
                // Fix line breaks in strings
                .replace(/\n/g, ' ')
                .replace(/\r/g, '');
            
            try {
                grokAnalysis = JSON.parse(fixedText);
                console.log('✅ JSON parsing succeeded after fixes');
            } catch (secondError) {
                console.error('Second parse attempt failed:', secondError.message);
                // Try to extract partial JSON
                try {
                    // Find the first complete object
                    const match = cleanedResponse.match(/\{[\s\S]*\}/);
                    if (match) {
                        grokAnalysis = JSON.parse(match[0]);
                        console.log('✅ Extracted partial JSON successfully');
                    } else {
                        throw new Error('Could not find valid JSON in response');
                    }
                } catch (thirdError) {
                    console.error('All JSON parsing attempts failed');
                    console.error('Grok response (full):', cleanedResponse);
                    throw new Error(`Grok returned invalid JSON: ${parseError.message}`);
                }
            }
        }
        
        console.log('Grok cross-check analysis completed');
        console.log('Primary accuracy rating:', grokAnalysis.cross_check_notes?.primary_accuracy);
        
        // Validate that Grok checked all quotes
        const primaryQuoteCount = (primaryAnalysis.notable_quotes || []).length;
        const grokQuoteAccuracy = (grokAnalysis.cross_check_notes?.quote_accuracy || []).length;
        
        if (grokQuoteAccuracy < primaryQuoteCount) {
            console.warn(`Grok only checked ${grokQuoteAccuracy}/${primaryQuoteCount} quotes - adding note`);
            if (!grokAnalysis.cross_check_notes) grokAnalysis.cross_check_notes = {};
            if (!grokAnalysis.cross_check_notes.issues_found) grokAnalysis.cross_check_notes.issues_found = [];
            grokAnalysis.cross_check_notes.issues_found.push(`Note: Grok checked ${grokQuoteAccuracy} of ${primaryQuoteCount} quotes`);
        }
        
        // Create consensus analysis
        const consensusAnalysis = {
            case_name: this.chooseBest(primaryAnalysis.case_name, grokAnalysis.case_name, 'case_name'),
            citation: this.chooseBest(primaryAnalysis.citation, grokAnalysis.citation, 'citation'),
            summary: this.chooseBest(primaryAnalysis.summary, grokAnalysis.summary, 'summary'),
            key_issues: this.mergeArrays(primaryAnalysis.key_issues, grokAnalysis.key_issues, 5),
            notable_quotes: grokAnalysis.notable_quotes || primaryAnalysis.notable_quotes,
            significant_principles: this.mergeArrays(primaryAnalysis.significant_principles, grokAnalysis.significant_principles, 5),
            cross_check_notes: grokAnalysis.cross_check_notes || {
                primary_accuracy: 'medium',
                quote_accuracy: [],
                issues_found: ['Cross-check completed - both models analyzed independently'],
                improvements: []
            }
        };
        
        console.log('Grok cross-check consensus created:', {
            hasCrossCheckNotes: !!consensusAnalysis.cross_check_notes,
            accuracy: consensusAnalysis.cross_check_notes?.primary_accuracy
        });
        
        return consensusAnalysis;
    }

    verifyQuotesOLD(analysis, sourceText) {
        /**
         * Verify that notable quotes actually exist in the source text
         * with correct paragraph numbers - prevent hallucination
         */
        if (!analysis.notable_quotes || !Array.isArray(analysis.notable_quotes)) {
            return analysis;
        }

        console.log('Verifying quotes against source text...');
        
        const verifiedQuotes = [];
        const warnings = [];

        for (let i = 0; i < analysis.notable_quotes.length; i++) {
            const quote = analysis.notable_quotes[i];
            
            // Extract the quote text (without paragraph reference)
            // Handle multiple formats: [¶23], [para 45], [23], "at [101]"
            
            let quoteText = '';
            let claimedParagraphNum = '';
            
            // Try standard format: text [¶23] or text [para 23]
            let match = quote.match(/^["']?(.+?)["']?\s*\[[\¶para\s]*(\d+|\?)\]$/i);
            
            if (match) {
                quoteText = match[1].trim();
                claimedParagraphNum = match[2];
            } 
            // Try "at [number]" format (convert to standard [¶number] format)
            else {
                match = quote.match(/^["']?(.+?)\s+at\s+\[(\d+)\](.*)$/i);
                if (match) {
                    // Convert "at [101]" to [¶101] format
                    quoteText = (match[1] + ' ' + match[3]).trim();
                    claimedParagraphNum = match[2];
                    console.log(`Converted "at [${match[2]}]" format to [¶${match[2]}]`);
                } else {
                    // No recognizable format - flag it
                    warnings.push(`Quote ${i + 1}: Missing or invalid paragraph reference format`);
                    verifiedQuotes.push(quote);
                    continue;
                }
            }

            // Clean the quote text for matching (remove extra quotes, normalize spaces)
            const cleanQuoteText = quoteText
                .replace(/^["']+|["']+$/g, '')  // Remove leading/trailing quotes
                .replace(/\s+/g, ' ')            // Normalize whitespace
                .trim();

            // Normalize source text for comparison
            const normalizedSource = sourceText.replace(/\s+/g, ' ');
            const normalizedQuote = cleanQuoteText.toLowerCase();

            // Try to find exact match first
            let quotePosition = normalizedSource.toLowerCase().indexOf(normalizedQuote);
            let matchType = 'exact';
            
            console.log(`Searching for quote ${i + 1}: "${cleanQuoteText.substring(0, 50)}..."`);
            console.log(`Quote position: ${quotePosition}, claimed paragraph: ¶${claimedParagraphNum}`);
            
            // If exact match fails, try fuzzy matching for substantial substring
            if (quotePosition === -1) {
                console.log('Exact match failed, trying fuzzy match...');
                // Try to find longest matching substring (at least 60% of quote)
                const minLength = Math.floor(cleanQuoteText.length * 0.6);
                const quoteWords = cleanQuoteText.split(' ');
                
                // Build increasingly shorter versions of the quote to find best match
                for (let wordCount = quoteWords.length; wordCount >= Math.ceil(quoteWords.length * 0.6); wordCount--) {
                    const partialQuote = quoteWords.slice(0, wordCount).join(' ').toLowerCase();
                    const pos = normalizedSource.toLowerCase().indexOf(partialQuote);
                    
                    if (pos !== -1 && partialQuote.length >= minLength) {
                        quotePosition = pos;
                        matchType = 'partial';
                        console.log(`Found partial match using ${wordCount}/${quoteWords.length} words`);
                        break;
                    }
                }
            }
            
            if (quotePosition !== -1) {
                // Quote found (exact or partial)! Now verify the paragraph number
                const actualParagraphNum = this.findParagraphNumber(sourceText, quotePosition);
                
                if (actualParagraphNum) {
                    if (claimedParagraphNum === '?') {
                        // AI didn't know paragraph number, we found it
                        console.log(`✅ Quote ${i + 1}: Found at ¶${actualParagraphNum} (AI used [¶?])`);
                        const correctedQuote = `${cleanQuoteText} [¶${actualParagraphNum}]`;
                        verifiedQuotes.push(correctedQuote);
                    } else if (actualParagraphNum.toString() === claimedParagraphNum) {
                        // Perfect match - quote and paragraph number both correct
                        console.log(`✅ Quote ${i + 1} fully verified: Found at ¶${actualParagraphNum}`);
                        verifiedQuotes.push(quote);
                    } else {
                        // Quote found but paragraph number is WRONG - auto-correct it
                        console.log(`⚠️ Quote ${i + 1}: WRONG paragraph - claimed ¶${claimedParagraphNum}, actual ¶${actualParagraphNum}`);
                        const correctedQuote = `${cleanQuoteText} [¶${actualParagraphNum}]`;
                        
                        if (matchType === 'partial') {
                            verifiedQuotes.push(correctedQuote + ' [⚠️ Paraphrased, paragraph corrected]');
                            warnings.push(`Quote ${i + 1}: Paraphrased quote. Paragraph corrected from ¶${claimedParagraphNum} to ¶${actualParagraphNum}`);
                        } else {
                            verifiedQuotes.push(correctedQuote + ' [✓ Paragraph corrected]');
                            warnings.push(`Quote ${i + 1}: Paragraph number corrected from ¶${claimedParagraphNum} to ¶${actualParagraphNum}`);
                        }
                    }
                } else {
                    // Quote found but couldn't determine paragraph number
                    console.log(`✅ Quote ${i + 1} verified: Found in text (paragraph number unknown)`);
                    if (matchType === 'partial') {
                        verifiedQuotes.push(quote + ' [⚠️ Paraphrased]');
                        warnings.push(`Quote ${i + 1}: Appears to be paraphrased`);
                    } else {
                        verifiedQuotes.push(quote);
                    }
                }
            } 
            // Quote not found at all - likely hallucination
            else {
                console.log(`❌ Quote ${i + 1}: NOT FOUND - likely HALLUCINATION`);
                verifiedQuotes.push(`${cleanQuoteText} [¶?] [❌ HALLUCINATION - quote not found in judgment]`);
                warnings.push(`Quote ${i + 1}: CRITICAL - Quote not found in source text, likely hallucinated by AI. Do not rely on this quote.`);
            }
        }

        // Add warnings to the analysis if any quotes couldn't be verified
        if (warnings.length > 0) {
            analysis.verification_warnings = warnings;
            console.warn('⚠️ Quote verification warnings:', warnings);
        } else {
            console.log('✅ All quotes verified successfully - no hallucinations detected');
        }

        analysis.notable_quotes = verifiedQuotes;
        return analysis;
    }

    findParagraphNumber(text, position) {
        /**
         * Find the ACTUAL paragraph number at a given position in the text
         * Uses smarter detection to handle quoted judgments
         */
        
        // Get text around the quote position for better context
        const contextBefore = text.substring(Math.max(0, position - 2000), position);
        const contextAfter = text.substring(position, Math.min(text.length, position + 500));
        
        // Split into lines to analyze structure
        const linesBefore = contextBefore.split('\n');
        
        // Work backwards from the quote to find the last non-quoted paragraph number
        let lastValidParagraphNum = null;
        let indentLevel = 0;
        let inQuoteBlock = false;
        
        for (let i = linesBefore.length - 1; i >= 0; i--) {
            const line = linesBefore[i];
            const trimmedLine = line.trim();
            
            // Check for quote block markers
            if (trimmedLine.startsWith('>')) {
                inQuoteBlock = true;
                continue;
            }
            
            // Detect indentation (4+ spaces or tab = likely quoted content)
            const leadingSpaces = line.match(/^(\s*)/)[1].length;
            if (leadingSpaces >= 4 || line.startsWith('\t')) {
                indentLevel = leadingSpaces;
                continue;
            } else if (indentLevel > 0 && leadingSpaces < indentLevel - 2) {
                // Back to main text
                indentLevel = 0;
                inQuoteBlock = false;
            }
            
            // Look for paragraph number at start of line (not indented, not in quote)
            const paraMatch = line.match(/^(\d+)\.\s/);
            
            if (paraMatch && !inQuoteBlock && indentLevel === 0) {
                const num = parseInt(paraMatch[1]);
                
                // Additional validation: main judgment paragraphs are usually sequential and < 500
                if (num <= 500) {
                    lastValidParagraphNum = num;
                    console.log(`✓ Found paragraph ${num} at line ${i} (indent: ${leadingSpaces}, quote: ${inQuoteBlock})`);
                    break;
                }
            }
        }
        
        if (lastValidParagraphNum) {
            return lastValidParagraphNum;
        }
        
        // Ultimate fallback: find all non-indented paragraph numbers and get the last reasonable one
        const allParagraphs = [];
        const allLines = text.substring(0, position).split('\n');
        
        for (const line of allLines) {
            if (line.match(/^(\d+)\.\s/) && !line.startsWith(' ') && !line.startsWith('\t')) {
                const num = parseInt(line.match(/^(\d+)/)[1]);
                if (num <= 500) {
                    allParagraphs.push(num);
                }
            }
        }
        
        if (allParagraphs.length > 0) {
            const lastNum = allParagraphs[allParagraphs.length - 1];
            console.log(`Found paragraph ${lastNum} using fallback (from ${allParagraphs.length} total paragraphs)`);
            return lastNum;
        }
        
        console.log(`Could not find paragraph number at position ${position}`);
        return null;
    }

    async secondaryAiVerification(analysis, sourceText) {
        /**
         * Use Secondary AI AI to verify and correct paragraph references from Gemini
         * This provides a second opinion to catch hallucinations
         */
        
        if (!analysis.notable_quotes || analysis.notable_quotes.length === 0) {
            return analysis;
        }

        try {
            console.log('Starting Secondary AI verification of quotes...');
            
            // Prepare verification prompt for Secondary AI
            const quotesToVerify = analysis.notable_quotes.map((q, i) => {
                // Remove our verification tags for clean verification
                const cleanQuote = q.replace(/\s*\[✓.*?\]/g, '')
                                   .replace(/\s*\[⚠️.*?\]/g, '')
                                   .replace(/\s*\[❌.*?\]/g, '');
                return `${i + 1}. ${cleanQuote}`;
            }).join('\n');

            const verificationPrompt = {
                model: "secondaryAi-reasoner",
                messages: [
                    {
                        role: "system",
                        content: "You are a precision verification assistant. Your ONLY task is to verify quotes and find their exact paragraph numbers in legal judgments. Be extremely accurate."
                    },
                    {
                        role: "user",
                        content: `I need you to verify these quotes from a legal judgment and find their EXACT paragraph numbers.

JUDGMENT TEXT (first 80,000 characters):
${sourceText.substring(0, 80000)}

QUOTES TO VERIFY:
${quotesToVerify}

For EACH quote, you must:
1. Search for the EXACT quote text in the judgment
2. Find which paragraph number it appears in (look for "1.", "23.", "67." at the START of paragraphs)
3. Ignore paragraph numbers within QUOTED sections (indented or starting with ">")
4. Only use paragraph numbers from the MAIN judgment

Respond with ONLY a JSON array:
[
  {"quote_num": 1, "found": true, "paragraph": 23, "exact_match": true},
  {"quote_num": 2, "found": true, "paragraph": 45, "exact_match": false},
  {"quote_num": 3, "found": false, "paragraph": null, "exact_match": false}
]

If quote not found, set "found": false and "paragraph": null.
If quote is paraphrased (not exact), set "exact_match": false.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            };

            // Call Secondary AI API
            const secondaryAiResponse = await fetch('https://api.secondaryAi.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.secondaryAiApiKey}`
                },
                body: JSON.stringify(verificationPrompt)
            });

            if (!secondaryAiResponse.ok) {
                console.warn('Secondary AI verification failed, using Gemini results only');
                return analysis;
            }

            const secondaryAiData = await secondaryAiResponse.json();
            const secondaryAiText = secondaryAiData.choices[0].message.content;
            
            // Parse Secondary AI response
            const verificationResults = JSON.parse(secondaryAiText.match(/\[[\s\S]*\]/)[0]);
            
            console.log('Secondary AI verification results:', verificationResults);
            
            // Apply Secondary AI corrections
            const correctedQuotes = [];
            const secondaryAiWarnings = [];
            
            for (let i = 0; i < analysis.notable_quotes.length; i++) {
                const originalQuote = analysis.notable_quotes[i];
                const verification = verificationResults.find(v => v.quote_num === i + 1);
                
                if (!verification) {
                    correctedQuotes.push(originalQuote);
                    continue;
                }
                
                // Extract original quote text and claimed paragraph
                const quoteMatch = originalQuote.match(/^(.+?)\s*\[[\¶para\s]*(\d+|\?)\]/i);
                if (!quoteMatch) {
                    correctedQuotes.push(originalQuote);
                    continue;
                }
                
                const quoteText = quoteMatch[1].trim();
                const geminiParagraph = quoteMatch[2];
                
                if (verification.found && verification.paragraph) {
                    // Secondary AI found the quote with paragraph number
                    if (verification.paragraph.toString() !== geminiParagraph) {
                        // Paragraph numbers disagree - use Secondary AI's (it's double-checking)
                        console.log(`🔧 Secondary AI correction: ¶${geminiParagraph} → ¶${verification.paragraph}`);
                        const corrected = `${quoteText} [¶${verification.paragraph}] [✓ Secondary AI verified]`;
                        correctedQuotes.push(corrected);
                        secondaryAiWarnings.push(`Quote ${i + 1}: Secondary AI corrected paragraph from ¶${geminiParagraph} to ¶${verification.paragraph}`);
                    } else {
                        // Both AIs agree - high confidence
                        console.log(`✅ Quote ${i + 1}: Both AIs agree on ¶${verification.paragraph}`);
                        correctedQuotes.push(`${quoteText} [¶${verification.paragraph}] [✓✓ Dual-verified]`);
                    }
                } else {
                    // Secondary AI couldn't find the quote - flag as potential hallucination
                    console.warn(`❌ Quote ${i + 1}: Secondary AI could not verify`);
                    correctedQuotes.push(`${quoteText} [¶?] [❌ Unverified by Secondary AI]`);
                    secondaryAiWarnings.push(`Quote ${i + 1}: Secondary AI could not find this quote - treat with caution`);
                }
            }
            
            // Merge warnings
            if (secondaryAiWarnings.length > 0) {
                analysis.verification_warnings = [
                    ...(analysis.verification_warnings || []),
                    ...secondaryAiWarnings
                ];
            }
            
            analysis.notable_quotes = correctedQuotes;
            return analysis;
            
        } catch (error) {
            console.error('Secondary AI verification error:', error);
            console.log('Continuing with Gemini-only verification');
            return analysis; // Return Gemini results if Secondary AI fails
        }
    }
}

// Initialize the analyzer
const geminiAnalyzer = new GeminiAnalyzer();

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Legal Judgment Analyzer installed');
        
        // Set default settings
        chrome.storage.local.set({
            extension_enabled: true,
            analysis_count: 0
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Legal Judgment Analyzer started');
});
