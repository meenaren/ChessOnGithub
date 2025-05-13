/// <reference types="vitest/globals" />
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { handleReceivedResignation } from './p2pService';
import { eventBus } from '../utils/eventBus';
import type { ResignPayload, PlayerColor } from '../utils/types';

// Mock the eventBus
vi.mock('../utils/eventBus', () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}));

describe('p2pService', () => {
  describe('handleReceivedResignation', () => {
    beforeEach(() => {
      vi.clearAllMocks(); // Clear mocks before each test
    });

    test('should publish "opponentResigned" event with valid payload', () => {
      const validPayload: ResignPayload = {
        resigningPlayerColor: 'w' as PlayerColor,
        timestamp: new Date().toISOString(),
      };

      handleReceivedResignation(validPayload);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledWith('opponentResigned', validPayload);
    });

    test('should not publish event if payload is null', () => {
      handleReceivedResignation(null);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    test('should not publish event if payload is undefined', () => {
      handleReceivedResignation(undefined);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    test('should not publish event if resigningPlayerColor is missing', () => {
      const invalidPayload = {
        timestamp: new Date().toISOString(),
      } as unknown as ResignPayload; // Type assertion for testing invalid case

      handleReceivedResignation(invalidPayload);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});