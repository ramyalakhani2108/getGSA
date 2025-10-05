import { redactPII, containsPII, getPIIStatistics, verifyRedaction } from '../services/redaction';

describe('PII Redaction Service', () => {
  describe('redactPII', () => {
    test('should redact email addresses', () => {
      const text = 'Contact us at john.doe@example.com or support@company.org';
      const result = redactPII(text);

      expect(result.redactedText).toContain('[REDACTED_EMAIL]');
      expect(result.redactedText).not.toContain('john.doe@example.com');
      expect(result.redactedText).not.toContain('support@company.org');
      expect(result.redactionCount).toBe(2);
      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].type).toBe('email');
    });

    test('should redact phone numbers in various formats', () => {
      const text = 'Call (555) 123-4567 or 555-987-6543 or 5551234567';
      const result = redactPII(text);

      expect(result.redactedText).toContain('[REDACTED_PHONE]');
      expect(result.redactionCount).toBe(3);
      expect(result.matches.every(m => m.type === 'phone')).toBe(true);
    });

    test('should redact SSNs', () => {
      const text = 'SSN: 123-45-6789 or 987654321';
      const result = redactPII(text);

      expect(result.redactedText).toContain('[REDACTED_SSN]');
      expect(result.redactionCount).toBe(2);
      expect(result.matches.every(m => m.type === 'ssn')).toBe(true);
    });

    test('should redact multiple PII types', () => {
      const text = 'Contact John at john@example.com or call 555-123-4567. SSN: 123-45-6789';
      const result = redactPII(text);

      expect(result.redactionCount).toBe(3);
      expect(result.matches.some(m => m.type === 'email')).toBe(true);
      expect(result.matches.some(m => m.type === 'phone')).toBe(true);
      expect(result.matches.some(m => m.type === 'ssn')).toBe(true);
    });

    test('should generate hash for each redacted item', () => {
      const text = 'Email: test@example.com';
      const result = redactPII(text);

      expect(result.matches[0].hash).toBeDefined();
      expect(result.matches[0].hash).toHaveLength(64); // SHA-256 hash
    });

    test('should handle text with no PII', () => {
      const text = 'This is a clean document with no sensitive information.';
      const result = redactPII(text);

      expect(result.redactedText).toBe(text);
      expect(result.redactionCount).toBe(0);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('containsPII', () => {
    test('should return true if text contains PII', () => {
      expect(containsPII('Email: test@example.com')).toBe(true);
      expect(containsPII('Phone: 555-123-4567')).toBe(true);
      expect(containsPII('SSN: 123-45-6789')).toBe(true);
    });

    test('should return false if text has no PII', () => {
      expect(containsPII('This is clean text')).toBe(false);
    });
  });

  describe('getPIIStatistics', () => {
    test('should count PII occurrences by type', () => {
      const text = 'Email: test@example.com, another@test.com. Phone: 555-123-4567. SSN: 123-45-6789';
      const stats = getPIIStatistics(text);

      expect(stats.email).toBe(2);
      expect(stats.phone).toBe(1);
      expect(stats.ssn).toBe(1);
    });
  });

  describe('verifyRedaction', () => {
    test('should verify complete redaction', () => {
      const original = 'Email: test@example.com';
      const redacted = 'Email: [REDACTED_EMAIL]';
      const result = verifyRedaction(original, redacted);

      expect(result.isComplete).toBe(true);
      expect(result.remainingPII).toHaveLength(0);
    });

    test('should detect incomplete redaction', () => {
      const original = 'Email: test@example.com, Phone: 555-123-4567';
      const redacted = 'Email: [REDACTED_EMAIL], Phone: 555-123-4567';
      const result = verifyRedaction(original, redacted);

      expect(result.isComplete).toBe(false);
      expect(result.remainingPII.length).toBeGreaterThan(0);
    });
  });
});
