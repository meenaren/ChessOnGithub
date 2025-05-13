/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import StatusDisplay from './StatusDisplay';
import { GameStatus } from '../utils/types';
import type { PlayerColor, DrawType as AppDrawType } from '../utils/types';

describe('StatusDisplay', () => {
  const defaultProps = {
    currentTurn: 'w' as PlayerColor,
    localPlayerColor: null as PlayerColor | null,
    opponentPeerId: 'opponent-id',
    isConnected: true,
    isHost: true,
    gameId: 'game-123',
    isCheck: false,
    isCheckmate: false,
    winner: null as PlayerColor | 'draw' | null,
    drawType: null as AppDrawType | null,
  };

  describe('Resignation Messages', () => {
    test('shows "White resigned. You win!" when White resigns and local player is Black', () => {
      render(
        <StatusDisplay
          {...defaultProps}
          gameStatus={GameStatus.RESIGNATION_WHITE_WINS}
          localPlayerColor="b"
          winner="b" // Winner should be black
        />
      );
      expect(screen.getByTestId('status-text')).toHaveTextContent('White resigned. You win!');
    });

    test('shows "You resigned. Black wins." when White resigns and local player is White', () => {
      render(
        <StatusDisplay
          {...defaultProps}
          gameStatus={GameStatus.RESIGNATION_WHITE_WINS}
          localPlayerColor="w"
          winner="b" // Winner should be black
        />
      );
      expect(screen.getByTestId('status-text')).toHaveTextContent('You resigned. Black wins.');
    });

    test('shows "White resigned. Black wins." for spectator when White resigns', () => {
        render(
          <StatusDisplay
            {...defaultProps}
            gameStatus={GameStatus.RESIGNATION_WHITE_WINS}
            localPlayerColor={null} // Spectator
            winner="b"
          />
        );
        expect(screen.getByTestId('status-text')).toHaveTextContent('White resigned. Black wins.');
      });

    test('shows "Black resigned. You win!" when Black resigns and local player is White', () => {
      render(
        <StatusDisplay
          {...defaultProps}
          gameStatus={GameStatus.RESIGNATION_BLACK_WINS}
          localPlayerColor="w"
          winner="w" // Winner should be white
        />
      );
      expect(screen.getByTestId('status-text')).toHaveTextContent('Black resigned. You win!');
    });

    test('shows "You resigned. White wins." when Black resigns and local player is Black', () => {
      render(
        <StatusDisplay
          {...defaultProps}
          gameStatus={GameStatus.RESIGNATION_BLACK_WINS}
          localPlayerColor="b"
          winner="w" // Winner should be white
        />
      );
      expect(screen.getByTestId('status-text')).toHaveTextContent('You resigned. White wins.');
    });

    test('shows "Black resigned. White wins." for spectator when Black resigns', () => {
        render(
          <StatusDisplay
            {...defaultProps}
            gameStatus={GameStatus.RESIGNATION_BLACK_WINS}
            localPlayerColor={null} // Spectator
            winner="w"
          />
        );
        expect(screen.getByTestId('status-text')).toHaveTextContent('Black resigned. White wins.');
      });
  });
});