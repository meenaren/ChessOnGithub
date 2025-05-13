/// <reference types="vitest/globals" />
import { describe, test, expect } from 'vitest';
import { handleResignation, initializeNewGame } from './gameLogic';
import type { GameLogicState } from './gameLogic'; // Type-only import
import { GameStatus as AppGameStatus } from '../utils/types';
import type { PlayerColor } from '../utils/types'; // Type-only import

describe('gameLogic', () => {
  describe('handleResignation', () => {
    const initialFen = initializeNewGame(); // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

    test('should correctly update game state when White resigns', () => {
      const resigningPlayerColor: PlayerColor = 'w';
      const gameState = handleResignation(initialFen, resigningPlayerColor);

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('b');
      expect(gameState.appStatus).toBe(AppGameStatus.RESIGNATION_BLACK_WINS);
      expect(gameState.isCheckmate).toBe(false);
      expect(gameState.isStalemate).toBe(false);
      expect(gameState.isDraw).toBe(false);
      expect(gameState.drawType).toBeNull();
      // FEN should remain the same as when resignation occurred
      expect(gameState.fen).toBe(initialFen);
    });

    test('should correctly update game state when Black resigns', () => {
      const resigningPlayerColor: PlayerColor = 'b';
      // Let's use a FEN where it's Black's turn for variety, though it doesn't strictly matter for resignation logic
      const fenBlacksTurn = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
      const gameState = handleResignation(fenBlacksTurn, resigningPlayerColor);

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('w');
      expect(gameState.appStatus).toBe(AppGameStatus.RESIGNATION_WHITE_WINS);
      expect(gameState.isCheckmate).toBe(false);
      expect(gameState.isStalemate).toBe(false);
      expect(gameState.isDraw).toBe(false);
      expect(gameState.drawType).toBeNull();
      expect(gameState.fen).toBe(fenBlacksTurn);
    });

    test('should preserve current check status if any when resigning', () => {
      // A FEN where white is in check: r_bqkbnr/pp_p_ppp/n7/1B1P_P_P/5N2/PP1P1PPP/RNBQK2R w KQkq - 1 6
      // For this test, let's assume black is in check and black resigns.
      // White king at e1, Black king at e8. Black rook at h8, White queen at h5.
      // Black is in check by white queen. Black resigns.
      const fenBlackInCheck = "4k3/8/8/7Q/8/8/8/4K3 b - - 0 1"; // Black king e8, White queen h5, Black to move
      const resigningPlayerColor: PlayerColor = 'b';
      const gameState = handleResignation(fenBlackInCheck, resigningPlayerColor);

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('w');
      expect(gameState.appStatus).toBe(AppGameStatus.RESIGNATION_WHITE_WINS);
      expect(gameState.isCheck).toBe(true); // The check status at the moment of resignation should be preserved
      expect(gameState.fen).toBe(fenBlackInCheck);
    });
  });
});