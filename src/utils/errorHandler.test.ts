import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleApiError, formatChefNotification } from './errorHandler';

describe('errorHandler', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe('handleApiError', () => {
    it('should format a standard Error message', () => {
      const error = new Error('Something went wrong');
      const result = handleApiError(error);
      expect(result).toBe('🏮 Something went wrong');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', error);
    });

    it('should return a specific message for "Failed to fetch"', () => {
      const error = new Error('Failed to fetch');
      const result = handleApiError(error);
      expect(result).toBe('🏮 Error de conexión. Por favor verifica tu internet.');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', error);
    });

    it('should return the fallback message for non-Error inputs', () => {
      const result = handleApiError('not an error object', 'Custom fallback');
      expect(result).toBe('Custom fallback');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', 'not an error object');
    });

    it('should return the default fallback message for non-Error inputs if none provided', () => {
      const result = handleApiError(null);
      expect(result).toBe('🏮 Ocurrió un error inesperado.');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', null);
    });
  });

  describe('formatChefNotification', () => {
    it('should return technical error message when "Workflow execution failed" is present', () => {
      const message = 'Error: Workflow execution failed at step 5';
      const result = formatChefNotification(message);
      expect(result).toBe('🏮 Lo sentimos, hubo un problema técnico en la cocina. Por favor, intenta de nuevo.');
    });

    it('should return the original message if it does not include "Workflow execution failed"', () => {
      const message = 'Order received';
      const result = formatChefNotification(message);
      expect(result).toBe('Order received');
    });
  });
});
