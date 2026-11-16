/**
 * Unit tests for ONVIF tag naming helpers (camelCase / PascalCase).
 * @jest-environment node
 */

import { camelCase, toCamelCase, toPascalCase } from '../src/utils/naming';

describe('naming helpers', () => {
  describe('camelCase', () => {
    it('strips namespace prefixes and lowercases a leading capital when second is lower', () => {
      expect(camelCase('tt:VideoEncoder')).toBe('videoEncoder');
      expect(camelCase('H264')).toBe('H264');
      expect(camelCase('A')).toBe('a');
    });
  });

  describe('toCamelCase', () => {
    it('handles empty, single-char, already-lower, and ONVIF acronyms', () => {
      expect(toCamelCase('')).toBe('');
      expect(toCamelCase('a')).toBe('a');
      expect(toCamelCase('A')).toBe('a');
      expect(toCamelCase('1')).toBe('1');
      expect(toCamelCase('videoEncoder')).toBe('videoEncoder');
      expect(toCamelCase('VideoEncoder')).toBe('videoEncoder');
      expect(toCamelCase('H264')).toBe('H264');
      expect(toCamelCase('\u00C0bc')).toBe('\u00E0bc');
    });
  });

  describe('toPascalCase', () => {
    it('handles empty, already-Pascal, acronyms, and lower-first tags', () => {
      expect(toPascalCase('')).toBe('');
      expect(toPascalCase('VideoEncoder')).toBe('VideoEncoder');
      expect(toPascalCase('H264')).toBe('H264');
      // Lower-first + upper second: leave unchanged (acronym / device quirk).
      expect(toPascalCase('aBC')).toBe('aBC');
      expect(toPascalCase('videoEncoder')).toBe('VideoEncoder');
      expect(toPascalCase('a')).toBe('A');
      expect(toPascalCase('\u00E0bc')).toBe('\u00C0bc');
    });
  });
});
