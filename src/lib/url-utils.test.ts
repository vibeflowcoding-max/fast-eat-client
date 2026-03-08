import { describe, it, expect } from 'vitest';
import { constructSecureUrl } from './url-utils';

describe('constructSecureUrl', () => {
  it('should construct a secure URL with https', () => {
    const baseUrl = 'https://api.example.com';
    const path = '/v1/resource';
    expect(constructSecureUrl(baseUrl, path)).toBe('https://api.example.com/v1/resource');
  });

  it('should handle baseUrl with trailing slashes', () => {
    const baseUrl = 'https://api.example.com///';
    const path = '/v1/resource';
    expect(constructSecureUrl(baseUrl, path)).toBe('https://api.example.com/v1/resource');
  });

  it('should handle path without leading slash', () => {
    const baseUrl = 'https://api.example.com';
    const path = 'v1/resource';
    expect(constructSecureUrl(baseUrl, path)).toBe('https://api.example.com/v1/resource');
  });

  it('should handle path with multiple leading slashes', () => {
    const baseUrl = 'https://api.example.com';
    const path = '///v1/resource';
    expect(constructSecureUrl(baseUrl, path)).toBe('https://api.example.com/v1/resource');
  });

  it('should allow http for localhost', () => {
    const baseUrl = 'http://localhost:3000';
    const path = '/api';
    expect(constructSecureUrl(baseUrl, path)).toBe('http://localhost:3000/api');
  });

  it('should allow http for 127.0.0.1', () => {
    const baseUrl = 'http://127.0.0.1:3000';
    const path = '/api';
    expect(constructSecureUrl(baseUrl, path)).toBe('http://127.0.0.1:3000/api');
  });

  it('should throw error for insecure non-localhost URLs', () => {
    const baseUrl = 'http://api.example.com';
    const path = '/v1';
    expect(() => constructSecureUrl(baseUrl, path)).toThrow('Insecure connection');
  });

  it('should throw error for missing baseUrl', () => {
    expect(() => constructSecureUrl(undefined, '/path')).toThrow('Base URL is required');
    expect(() => constructSecureUrl('', '/path')).toThrow('Base URL is required');
  });

  it('should handle empty path', () => {
    const baseUrl = 'https://api.example.com';
    expect(constructSecureUrl(baseUrl, '')).toBe('https://api.example.com/');
  });
});
