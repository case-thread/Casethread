/**
 * Generic Legal Site Pattern Configuration
 * 
 * This file defines generic patterns for extracting content from legal judgment websites.
 * It uses structural and feature-based detection rather than site-specific domains,
 * making it compatible with any legal database that follows similar HTML patterns.
 */

export const LEGAL_SITE_PATTERNS = {
    /**
     * Feature Detection Patterns
     * Used to identify page structure by content, not by domain
     */
    features: {
        // Breadcrumb navigation (common in legal databases)
        breadcrumbNavigation: /You are here:.*?>>/i,
        
        // Neutral citation field
        neutralCitation: /Neutral Citation Number:\s*(\[[^\]]+\])/i,
        
        // Citation reference
        citeAs: /Cite as:\s*(\[[^\]]+\])/i,
        
        // Court metadata
        courtField: /Court:/i,
        judgeField: /Judge:|Judges:|Before:/i,
        dateField: /Date:|Judgment Date:|Decided:/i,
    },
    
    /**
     * Generic Cleanup Patterns
     * Removes common boilerplate text from legal database pages
     */
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
    
    /**
     * Generic Suffix/Prefix Patterns
     * For cleaning titles and removing site branding
     */
    suffixes: {
        // Legal database site suffixes (generic pattern)
        siteName: /\s*[-–—:]\s*(?:Judiciary|Courts?|Legal\s+Database)$/i,
        
        // Site prefix in titles
        sitePrefix: /^(?:Judiciary|Courts?|Legal\s+Database)\s*[-–—:]\s*/i,
        
        // Common court name suffixes
        courtSuffix: /\s*[-–—]\s*(?:High\s+Court|Court\s+of\s+Appeal|Supreme\s+Court|Federal\s+Court)$/i,
    },
    
    /**
     * Content Extraction Patterns
     * Used to identify and extract specific content sections
     */
    extraction: {
        // Case name patterns (Party v Party)
        caseName: /([A-Z][a-zA-Z\s&.,()]+(?:Ltd|Limited|Corp|Corporation|plc|PLC|AB|GmbH|Inc|Pty)?)\s+v\.?\s+([A-Z][a-zA-Z\s&.,()]+(?:Ltd|Limited|Corp|Corporation|plc|PLC|AB|GmbH|Inc|Pty)?)/,
        
        // Citation patterns
        neutralCitationPattern: /\[(\d{4})\]\s+([A-Z]+(?:\s+[A-Z]+)*)\s+(\d+)/,
        
        // Paragraph numbering (common in judgments)
        paragraphNumber: /^\s*\[?\d+\]?\.?\s+/,
        
        // Judge names
        judgeName: /(?:Hon(?:ourable)?|Mr|Mrs|Ms|Justice|J\.?|Lord|Lady)\s+[A-Z][a-zA-Z\s-]+/,
    },
    
    /**
     * Detection Thresholds
     * Used to determine if a page is likely a legal judgment
     */
    thresholds: {
        // Minimum text length for a valid judgment
        minTextLength: 1000,
        
        // Minimum paragraph count
        minParagraphs: 10,
        
        // Keywords that suggest legal content
        legalKeywords: ['judgment', 'court', 'appeal', 'plaintiff', 'defendant', 'claimant', 'respondent', 'appellant', 'litigation'],
    }
};

/**
 * Helper Functions for Pattern Matching
 */
export const PatternHelpers = {
    /**
     * Check if page has breadcrumb navigation
     */
    hasBreadcrumbNavigation(text) {
        return LEGAL_SITE_PATTERNS.features.breadcrumbNavigation.test(text);
    },
    
    /**
     * Check if page has neutral citation
     */
    hasNeutralCitation(text) {
        return LEGAL_SITE_PATTERNS.features.neutralCitation.test(text);
    },
    
    /**
     * Clean text using all generic patterns
     */
    cleanText(text) {
        let cleaned = text;
        
        // Apply all cleanup patterns
        for (const [key, pattern] of Object.entries(LEGAL_SITE_PATTERNS.cleanup)) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        return cleaned.trim();
    },
    
    /**
     * Remove site branding from title
     */
    cleanTitle(title) {
        return title
            .replace(LEGAL_SITE_PATTERNS.suffixes.siteName, '')
            .replace(LEGAL_SITE_PATTERNS.suffixes.sitePrefix, '')
            .replace(LEGAL_SITE_PATTERNS.suffixes.courtSuffix, '')
            .trim();
    },
    
    /**
     * Detect if text appears to be a legal judgment
     */
    isLegalJudgment(text) {
        if (text.length < LEGAL_SITE_PATTERNS.thresholds.minTextLength) {
            return false;
        }
        
        // Check for legal keywords
        const lowerText = text.toLowerCase();
        const keywordCount = LEGAL_SITE_PATTERNS.thresholds.legalKeywords.filter(
            keyword => lowerText.includes(keyword)
        ).length;
        
        return keywordCount >= 3;
    }
};


