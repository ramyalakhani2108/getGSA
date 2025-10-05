import crypto from 'crypto';

export interface RedactionMatch {
  type: 'email' | 'phone' | 'ssn';
  value: string;
  start: number;
  end: number;
  hash: string;
}

export interface RedactionResult {
  redactedText: string;
  matches: RedactionMatch[];
  redactionCount: number;
}

// Regex patterns for PII detection
const PII_PATTERNS = {
  // Email: user@domain.com
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone: Various formats including (555) 123-4567, 555-123-4567, 555.123.4567, 5551234567
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // SSN: 123-45-6789 or 123 45 6789 or 123456789
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
};

const REDACTION_LABELS = {
  email: '[REDACTED_EMAIL]',
  phone: '[REDACTED_PHONE]',
  ssn: '[REDACTED_SSN]',
};

/**
 * Hash a value for secure storage
 */
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Redact PII from text content
 */
export function redactPII(text: string): RedactionResult {
  let redactedText = text;
  const matches: RedactionMatch[] = [];
  
  // Track offset changes from redactions
  let offsetAdjustment = 0;

  // Process each PII type
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    // Reset regex lastIndex
    regex.lastIndex = 0;

    // Find all matches for this pattern
    const tempMatches: RedactionMatch[] = [];
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      tempMatches.push({
        type: type as 'email' | 'phone' | 'ssn',
        value,
        start,
        end,
        hash: hashValue(value),
      });
    }

    // Sort matches by position (descending) to avoid offset issues
    tempMatches.sort((a, b) => b.start - a.start);

    // Apply redactions
    for (const matchItem of tempMatches) {
      const label = REDACTION_LABELS[matchItem.type];
      const before = redactedText.substring(0, matchItem.start);
      const after = redactedText.substring(matchItem.end);
      redactedText = before + label + after;

      // Adjust positions for already applied redactions
      matchItem.start += offsetAdjustment;
      matchItem.end = matchItem.start + label.length;
      
      matches.push(matchItem);
    }

    // Update offset adjustment
    for (const matchItem of tempMatches) {
      const originalLength = matchItem.value.length;
      const newLength = REDACTION_LABELS[matchItem.type].length;
      offsetAdjustment += newLength - originalLength;
    }
  }

  // Sort matches by original position
  matches.sort((a, b) => a.start - b.start);

  return {
    redactedText,
    matches,
    redactionCount: matches.length,
  };
}

/**
 * Validate if text contains unredacted PII
 */
export function containsPII(text: string): boolean {
  for (const pattern of Object.values(PII_PATTERNS)) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Get PII statistics from text
 */
export function getPIIStatistics(text: string): Record<string, number> {
  const stats: Record<string, number> = {
    email: 0,
    phone: 0,
    ssn: 0,
  };

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(regex);
    stats[type] = matches ? matches.length : 0;
  }

  return stats;
}

/**
 * Verify redaction completeness
 */
export function verifyRedaction(_originalText: string, redactedText: string): {
  isComplete: boolean;
  remainingPII: string[];
} {
  const remaining: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = redactedText.match(regex);
    
    if (matches) {
      remaining.push(...matches.map(m => `${type}: ${m}`));
    }
  }

  return {
    isComplete: remaining.length === 0,
    remainingPII: remaining,
  };
}
