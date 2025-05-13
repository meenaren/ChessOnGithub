/// <reference types="vitest/globals" />
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import NavBar from './NavBar';
import type { AppGameState, PlayerColor, GameStatus } from '../utils/types';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event'; // Import userEvent
// import '@testing-library/jest-dom'; // No longer needed here, handled by setupTests.ts

describe('NavBar', () => {
  const mockOnResignConfirm = vi.fn();

  // This represents the state that App.tsx would manage and pass as individual props
  const initialAppGameState: AppGameState = {
    gameId: 'test-game-id',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    currentTurn: 'w',
    localPlayerColor: 'w',
    opponentPeerId: 'opponent-id',
    isHost: true,
    status: 'IN_PROGRESS' as GameStatus, // This is rawConnectionStatus
    isCheck: false,
    isCheckmate: false,
    castlingRights: {
      w: { k: true, q: true },
      b: { k: true, q: true },
    },
    enPassantTarget: null,
    winner: null,
    moveHistory: [],
    drawType: null,
  };

  const defaultNavBarProps = {
    connectionStatusDisplay: 'Connected to opponent',
    gameId: initialAppGameState.gameId,
    peerId: 'test-local-peer-id', // NavBarProps includes peerId
    isHost: initialAppGameState.isHost,
    opponentPeerId: initialAppGameState.opponentPeerId,
    rawConnectionStatus: initialAppGameState.status,
    gameDisplayStatus: "White's Turn",
    currentTurn: initialAppGameState.currentTurn,
    isCheck: initialAppGameState.isCheck,
    localPlayerColor: initialAppGameState.localPlayerColor,
    isGameOver: initialAppGameState.isCheckmate || initialAppGameState.winner !== null,
    onResignConfirm: mockOnResignConfirm,
  };

  test('renders the Resign button', () => {
    render(<NavBar {...defaultNavBarProps} />);
    const resignButton = screen.getByRole('button', { name: /resign/i });
    expect(resignButton).toBeInTheDocument();
  });

  test('clicking Resign button shows confirmation dialog with correct message', async () => {
    const user = userEvent.setup(); // Setup userEvent
    render(<NavBar {...defaultNavBarProps} />);
    const resignButton = screen.getByRole('button', { name: /resign/i });

    await user.click(resignButton);

    const dialogTitle = await screen.findByRole('heading', { name: /confirm resignation/i });
    expect(dialogTitle).toBeInTheDocument();

    const dialogMessage = screen.getByText(/are you sure you want to resign\? this will result in a loss\./i);
    expect(dialogMessage).toBeInTheDocument();
  });

  test('confirming resignation calls onResignConfirm', async () => {
    const user = userEvent.setup();
    // Reset mock before each assertion if it's used in multiple tests with different expectations
    mockOnResignConfirm.mockClear();

    render(<NavBar {...defaultNavBarProps} localPlayerColor={'w'} />); // Ensure localPlayerColor is set
    const resignButton = screen.getByRole('button', { name: /resign/i });
    await user.click(resignButton);

    // Dialog should be open now
    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockOnResignConfirm).toHaveBeenCalledTimes(1);
  });

  test('cancelling resignation closes dialog and does not call onResignConfirm', async () => {
    const user = userEvent.setup();
    mockOnResignConfirm.mockClear();

    render(<NavBar {...defaultNavBarProps} localPlayerColor={'w'} />);
    const resignButton = screen.getByRole('button', { name: /resign/i });
    await user.click(resignButton);

    // Dialog should be open
    const dialogTitle = await screen.findByRole('heading', { name: /confirm resignation/i });
    expect(dialogTitle).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should be closed
    // Use waitForElementToBeRemoved for a more robust check against animations/transitions
    await waitForElementToBeRemoved(() => screen.queryByRole('heading', { name: /confirm resignation/i }));
    // After the title is gone, the text should also be gone
    expect(screen.queryByText(/are you sure you want to resign\? this will result in a loss\./i)).not.toBeInTheDocument();

    // onResignConfirm should not have been called
    expect(mockOnResignConfirm).not.toHaveBeenCalled();
  });

  test('Resign button is disabled if game is over', () => {
    render(
      <NavBar
        {...defaultNavBarProps}
        isGameOver={true} // Set game to be over
        localPlayerColor={'w'} // Ensure player color is set
      />
    );
    const resignButton = screen.getByRole('button', { name: /resign/i });
    expect(resignButton).toBeDisabled();
  });

  test('Resign button is disabled if localPlayerColor is null', () => {
    render(
      <NavBar
        {...defaultNavBarProps}
        isGameOver={false}
        localPlayerColor={null} // Set localPlayerColor to null
      />
    );
    const resignButton = screen.getByRole('button', { name: /resign/i });
    expect(resignButton).toBeDisabled();
  });

  test('Resign button is enabled if game is not over and localPlayerColor is set', () => {
    render(
      <NavBar
        {...defaultNavBarProps}
        isGameOver={false}
        localPlayerColor={'b'} // Ensure player color is set
      />
    );
    const resignButton = screen.getByRole('button', { name: /resign/i });
    expect(resignButton).not.toBeDisabled();
  });
});