import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import * as lib from '../_lib';

vi.mock('../_lib', async () => {
    const actual = await vi.importActual('../_lib');
    return {
        ...actual,
        getCachedDietaryCheck: vi.fn(),
        setCachedDietaryCheck: vi.fn(),
        getTraceId: vi.fn().mockReturnValue('test-trace-id'),
    };
});

// Mock GoogleGenAI
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn().mockImplementation(() => {
            return {
                models: {
                    generateContent: vi.fn().mockResolvedValue({
                        text: JSON.stringify({
                            is_safe: true,
                            confidence: 1,
                            reason: 'Safe'
                        })
                    })
                }
            };
        }),
        Type: { OBJECT: 'OBJECT', BOOLEAN: 'BOOLEAN', NUMBER: 'NUMBER', STRING: 'STRING' }
    };
});

describe('Dietary Check API Cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-key';
    });

    it('should return cached result if available', async () => {
        const mockCachedResult = { is_safe: true, confidence: 0.95, reason: 'Cached reason' };
        vi.mocked(lib.getCachedDietaryCheck).mockReturnValue(mockCachedResult);

        const req = new NextRequest('http://localhost/api/discovery/dietary-check', {
            method: 'POST',
            body: JSON.stringify({
                menu_item: { id: 'item-1', name: 'Item 1', ingredients: ['ing1'] },
                dietary_profile: { diet: 'vegan' }
            })
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data).toMatchObject({
            ...mockCachedResult,
            source: 'cache'
        });
        expect(lib.getCachedDietaryCheck).toHaveBeenCalled();
    });

    it('should call AI and cache result if not in cache', async () => {
        vi.mocked(lib.getCachedDietaryCheck).mockReturnValue(null);

        const req = new NextRequest('http://localhost/api/discovery/dietary-check', {
            method: 'POST',
            body: JSON.stringify({
                menu_item: { id: 'item-1', name: 'Item 1', ingredients: ['ing1'] },
                dietary_profile: { diet: 'vegan' }
            })
        });

        const response = await POST(req);
        const data = await response.json();

        expect(data.source).toBe('ai');
        expect(lib.setCachedDietaryCheck).toHaveBeenCalled();
    });
});
