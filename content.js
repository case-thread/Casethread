// Legal Judgment Analyzer - Content Script (Generic Pattern-Based Version)
// This version uses feature detection instead of site-specific domain checking

// Generic Pattern Configuration (inline to avoid module loading issues)
const LEGAL_SITE_PATTERNS = {
    features: {
        breadcrumbNavigation: /You are here:.*?>>/i,
        neutralCitation: /Neutral Citation Number:\s*(\[[^\]]+\])/i,
        citeAs: /Cite as:\s*(\[[^\]]+\])/i,
    },
    cleanup: {
        // Minimal cleaning approach - only remove obvious navigation elements
        // Let AI handle the rest for maximum compatibility across all legal websites
        
        // Remove bracketed navigation links (universal pattern for legal sites)
        bracketedLinks: /\[[^\]]{3,30}\]/g,
        
        // Remove "You are here" breadcrumbs
        breadcrumbs: /You are here:.*$/gim,
        
        // Remove copyright notices
        copyrightNotice: /©.*$/gim,
        
        // Remove URL lines
        urlLine: /^URL:.*$/gim,
        
        // Remove "Cite as:" label (keeps the citation itself)
        citeAsLabel: /^Cite as:\s*/gim,
    },
    suffixes: {
        siteName: /\s*[-–—:]\s*(?:Judiciary|Courts?|Legal\s+Database)$/i,
        sitePrefix: /^(?:Judiciary|Courts?|Legal\s+Database)\s*[-–—:]\s*/i,
        courtSuffix: /\s*[-–—]\s*(?:High\s+Court|Court\s+of\s+Appeal|Supreme\s+Court|Federal\s+Court)$/i,
    },
    extraction: {
        caseName: /([A-Z][a-zA-Z\s&.,()]+(?:Ltd|Limited|Corp|Corporation|plc|PLC|AB|GmbH|Inc|Pty)?)\s+v\.?\s+([A-Z][a-zA-Z\s&.,()]+(?:Ltd|Limited|Corp|Corporation|plc|PLC|AB|GmbH|Inc|Pty)?)/,
        neutralCitationPattern: /\[(\d{4})\]\s+([A-Z]+(?:\s+[A-Z]+)*)\s+(\d+)/,
    }
};

const PatternHelpers = {
    hasBreadcrumbNavigation(text) {
        return LEGAL_SITE_PATTERNS.features.breadcrumbNavigation.test(text);
    },
    
    cleanTitle(title) {
        return title
            .replace(LEGAL_SITE_PATTERNS.suffixes.siteName, '')
            .replace(LEGAL_SITE_PATTERNS.suffixes.sitePrefix, '')
            .replace(LEGAL_SITE_PATTERNS.suffixes.courtSuffix, '')
            .trim();
    },
    
    cleanText(text) {
        let cleaned = text;
        for (const [key, pattern] of Object.entries(LEGAL_SITE_PATTERNS.cleanup)) {
            cleaned = cleaned.replace(pattern, '');
        }
        return cleaned.trim();
    }
};

class LegalJudgmentExtractor {
    constructor() {
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'ping') {
                sendResponse({ success: true });
                return;
            }
            
            if (request.action === 'extractJudgment') {
                try {
                    const result = this.extractJudgment();
                    sendResponse({ success: true, ...result });
                } catch (error) {
                    console.error('Extraction error:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message 
                    });
                }
                return true; // Keep message channel open for async response
            }
        });
    }

    extractJudgment() {
        try {
            console.log('=== Starting Judgment Extraction ===');
            console.log('Current URL:', window.location.href);
            console.log('Document ready state:', document.readyState);
            console.log('Document body length:', document.body ? document.body.textContent.length : 'No body');
            
            // Extract case title
            const title = this.extractTitle();
            
            // Extract citation
            const citation = this.extractCitation();
            
            // Extract main judgment text
            const text = this.extractText();
            
            console.log('Extracted text length:', text ? text.length : 'No text');
            console.log('Extracted text preview:', text ? text.substring(0, 200) + '...' : 'No text');
            
            if (!text || text.trim().length < 50) {
                throw new Error('Unable to extract sufficient judgment text. Please ensure you are on a valid legal judgment page.');
            }

            const cleanedText = this.cleanText(text);
            
            if (!cleanedText || cleanedText.trim().length < 100) {
                throw new Error('Text extraction produced insufficient content after cleaning. The page may not contain a judgment.');
            }

            console.log('Successfully extracted judgment:', {
                titleLength: title?.length || 0,
                citationLength: citation?.length || 0,
                textLength: cleanedText?.length || 0
            });

            return {
                title: title || 'Unknown Case',
                citation: citation || '',
                text: cleanedText
            };
        } catch (error) {
            console.error('Error in extractJudgment:', error);
            throw error;
        }
    }

    extractTitle() {
        const pageText = document.body.textContent;
        
        console.log('=== Extracting Title (Generic Pattern-Based) ===');
        
        // Feature detection: Check for breadcrumb navigation
        const hasBreadcrumb = PatternHelpers.hasBreadcrumbNavigation(pageText);
        
        console.log('Has breadcrumb navigation:', hasBreadcrumb);
        
        // Method 1: Extract from breadcrumb navigation if present
        if (hasBreadcrumb) {
            const breadcrumbMatch = pageText.match(/You are here:.*?>>\s*([^\n]+?)(?:\s+URL:|\s+Cite as:)/i);
            if (breadcrumbMatch && breadcrumbMatch[1]) {
                let caseTitle = breadcrumbMatch[1].trim();
                
                // Remove citation pattern at the end
                caseTitle = caseTitle.replace(/\s*\[\d{4}\]\s+[A-Z]+.*$/i, '').trim();
                
                // Filter out navigation text
                if (!caseTitle.includes('Databases') && 
                    !caseTitle.includes('Home') && 
                    !caseTitle.includes('Court of Appeal') &&
                    !caseTitle.includes('High Court') &&
                    caseTitle.length > 5 && 
                    caseTitle.length < 500) {
                    console.log('✅ Extracted case name from breadcrumb:', caseTitle);
                    return caseTitle;
                }
            }
        }
        
        // Method 2: Try page title with generic suffix removal
        const pageTitle = document.title;
        console.log('Page title:', pageTitle);
        
        if (pageTitle) {
            let cleanTitle = PatternHelpers.cleanTitle(pageTitle);
            
            // Extract after last ">>" if present
            const titleMatch = cleanTitle.match(/.*?>>\s*(.+?)(?:\s+\[\d{4}\].*)?$/);
            if (titleMatch && titleMatch[1]) {
                cleanTitle = titleMatch[1].trim();
                cleanTitle = cleanTitle.replace(/\s*\[\d{4}\]\s+[A-Z]+.*$/i, '').trim();
                
                if (cleanTitle && cleanTitle.length > 5 && cleanTitle.length < 500) {
                    console.log('✅ Extracted case name from page title:', cleanTitle);
                    return cleanTitle;
                }
            }
        }

        // Method 3: Look for case name pattern (Party v Party [Year])
        const casePattern = LEGAL_SITE_PATTERNS.extraction.caseName;
        const caseMatch = pageText.match(casePattern);
        if (caseMatch) {
            const caseTitle = `${caseMatch[1].trim()} v ${caseMatch[2].trim()}`;
            console.log('✅ Extracted title from case pattern:', caseTitle);
            return caseTitle;
        }

        // Method 4: Try multiple selectors for case title
        const titleSelectors = [
            'h3',
            'h2',
            'h1',
            '.judgment-title',
            '.case-title',
            '.case-name',
            '.title',
            '.judgment-name',
            '.document-title',
            '.case-header',
            '.judgment-header'
        ];

        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                const title = element.textContent.trim();
                // Make sure it's not a section header and contains "v"
                if (title.match(/\bv\.?\b/i)) {
                    console.log('✅ Extracted title from selector:', selector, title);
                    return title;
                }
            }
        }

        // Method 5: Look for lines with "v" or "v." pattern
        const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length > 0) {
            for (const line of lines.slice(0, 20)) {
                if (line.match(/\bv\.?\b/i) && 
                    line.length > 10 && line.length < 200 && 
                    !line.toLowerCase().includes('home') && 
                    !line.toLowerCase().includes('search') &&
                    !line.toLowerCase().includes('navigation') &&
                    !line.toLowerCase().includes('menu') &&
                    !line.toLowerCase().includes('database')) {
                    console.log('✅ Extracted title from lines with v:', line);
                    return line;
                }
            }
        }

        console.log('⚠️ No title found, returning fallback');
        return 'Unknown Case - ' + window.location.hostname;
    }

    extractCitation() {
        const pageText = document.body.textContent;
        
        console.log('=== Extracting Citation (Generic Pattern-Based) ===');
        
        // Priority 1: "Neutral Citation Number:" field
        const neutralCitation = pageText.match(/Neutral Citation Number:\s*(\[\d{4}\]\s+[A-Z]+\s+(?:Civ|Crim|Ch|Comm|Pat|QB|Admin|Fam|TCC)?\s*\d+)/i);
        if (neutralCitation && neutralCitation[1]) {
            console.log('✅ Extracted neutral citation:', neutralCitation[1]);
            return neutralCitation[1].trim();
        }
        
        // Priority 2: "Cite as:" section in breadcrumb navigation
        const citeAs = pageText.match(/Cite as:\s*(\[\d{4}\]\s+[A-Z]+\s+(?:Civ|Crim|Ch|Comm|Pat|QB|Admin|Fam|TCC)?\s*\d+)/i);
        if (citeAs && citeAs[1]) {
            console.log('✅ Extracted from "Cite as:":', citeAs[1]);
            return citeAs[1].trim();
        }
        
        // Priority 3: Look for citation pattern in title
        const titleCitationMatch = document.title.match(/\[(\d{4})\]\s+([A-Z]+(?:\s+[A-Z]+)*)\s+(\d+)/);
        if (titleCitationMatch) {
            const citation = `[${titleCitationMatch[1]}] ${titleCitationMatch[2]} ${titleCitationMatch[3]}`;
            console.log('✅ Extracted citation from title:', citation);
            return citation;
        }
        
        // Priority 4: Generic neutral citation pattern in text
        const neutralCitationPattern = LEGAL_SITE_PATTERNS.extraction.neutralCitationPattern;
        const textCitationMatch = pageText.match(neutralCitationPattern);
        if (textCitationMatch) {
            const citation = `[${textCitationMatch[1]}] ${textCitationMatch[2]} ${textCitationMatch[3]}`;
            console.log('✅ Extracted citation from text:', citation);
            return citation;
        }
        
        console.log('⚠️ No citation found');
        return '';
    }

    extractText() {
        console.log('=== Extracting Text (Generic Pattern-Based) ===');
        
        // Special handling for Hong Kong Judiciary Legal Reference System
        if (window.location.hostname.includes('legalref.judiciary.hk')) {
            console.log('Detected Hong Kong Judiciary site, using special extraction');
            
            // Try to find the main content frame
            const frames = document.querySelectorAll('frame, iframe');
            console.log(`Found ${frames.length} frames on HK Judiciary page`);
            
            let bestFrame = null;
            let maxLength = 0;
            
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                try {
                    const frameDoc = frame.contentDocument || frame.contentWindow.document;
                    if (frameDoc && frameDoc.body) {
                        const frameText = frameDoc.body.innerText || frameDoc.body.textContent;
                        console.log(`Frame ${i}: ${frameText?.length || 0} characters`);
                        
                        if (frameText && frameText.length > maxLength) {
                            maxLength = frameText.length;
                            bestFrame = frameText;
                            console.log(`Frame ${i} is now the best candidate (${maxLength} chars)`);
                        }
                    }
                } catch (e) {
                    console.log(`Frame ${i}: Cross-origin blocked -`, e.message);
                }
            }
            
            // Return the frame with the most content if it has substantial text
            if (bestFrame && maxLength > 1000) {
                console.log(`✅ Using frame with ${maxLength} characters as judgment text`);
                return bestFrame;
            }
            
            // Try to find content in the current document
            const hkContentSelectors = [
                'body',
                'html',
                '.content',
                '#content',
                'main',
                'article'
            ];
            
            for (const selector of hkContentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.innerText || element.textContent;
                    if (text && text.length > 1000) {
                        console.log('✅ Found HK Judiciary content using selector:', selector, 'length:', text.length);
                        return text;
                    }
                }
            }
        }
        
        // Try to find iframe content first (some sites load judgments in iframes)
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.body) {
                    const iframeText = iframeDoc.body.innerText || iframeDoc.body.textContent;
                    if (iframeText && iframeText.length > 1000) {
                        console.log('✅ Found judgment in iframe, length:', iframeText.length);
                        return iframeText;
                    }
                }
            } catch (e) {
                console.log('Iframe inaccessible (cross-origin)');
            }
        }
        
        // Try to find the main judgment content
        // Judgments are often in ordered lists (<ol>) or specific content areas
        const contentSelectors = [
            'ol',  // Common for numbered paragraphs
            'pre',
            '.judgment-content',
            '.judgment-text',
            '.content',
            '#content',
            '.judgment',
            '.decision',
            'article',
            'main',
            '.main-content',
            '.decision-text'
        ];

        let mainElement = null;
        
        // First, try to find ordered lists with substantial legal content
        const orderedLists = document.querySelectorAll('ol');
        for (const ol of orderedLists) {
            const text = ol.textContent || ol.innerText;
            // Look for ordered lists with substantial content and legal keywords
            if (text && text.length > 2000 && 
                (text.toLowerCase().includes('judgment') || 
                 text.toLowerCase().includes('court') || 
                 text.toLowerCase().includes('appellant') ||
                 text.toLowerCase().includes('respondent'))) {
                mainElement = ol;
                console.log('✅ Found judgment in ordered list, length:', text.length);
                break;
            }
        }
        
        // If not found, try other selectors
        if (!mainElement) {
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent || element.innerText;
                    if (text && text.length > 2000) {
                        mainElement = element;
                        console.log('✅ Found judgment using selector:', selector, 'length:', text.length);
                        break;
                    }
                }
            }
        }
        
        // If still not found, use body as fallback
        if (!mainElement) {
            console.log('⚠️ Using document.body as fallback');
            mainElement = document.body;
        }
        
        // Extract text
        const extractedText = mainElement.innerText || mainElement.textContent || '';
        console.log('Extracted text length:', extractedText.length);
        
        return extractedText;
    }

    cleanText(text) {
        console.log('=== Cleaning Text (Generic Pattern-Based) ===');
        console.log('Original text length:', text.length);
        
        // Use PatternHelpers for generic cleanup
        let cleaned = PatternHelpers.cleanText(text);
        
        // Additional cleanup for common patterns
        cleaned = cleaned
            // Remove HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            // Remove excessive whitespace
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        
        console.log('Cleaned text length:', cleaned.length);
        
        return cleaned;
    }
}

// Initialize the extractor when the script loads
new LegalJudgmentExtractor();

