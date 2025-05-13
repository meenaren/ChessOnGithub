import { Chess, type Square, type PieceSymbol, type Move as ChessJsMove } from 'chess.js';
import { GameStatus as AppGameStatus, DrawType } from '../utils/types';
import type { PlayerColor, Move as AppMove, DrawType as AppDrawType } from '../utils/types';

// Helper to convert chess.js color to our PlayerColor
const toPlayerColor = (chessJsColor: 'w' | 'b'): PlayerColor => chessJsColor;

// Helper to convert our PlayerColor to chess.js color
const fromPlayerColor = (appColor: PlayerColor): 'w' | 'b' => appColor;

export interface GameLogicState {
  fen: string;
  turn: PlayerColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean; // Covers stalemate, threefold repetition, fifty-move rule, insufficient material
  isGameOver: boolean;
  winner: PlayerColor | 'draw' | null;
  appStatus: AppGameStatus;
  drawType: AppDrawType; // Added for specific draw type
}

/**
 * Initializes a new chess game.
 * @returns The FEN string of the starting position.
 */
export const initializeNewGame = (): string => {
  const chess = new Chess();
  return chess.fen();
};

/**
 * Attempts to make a move on the board.
 * @param currentFen The FEN string of the current board position.
 *   from: sourceSquare,
 *   to: targetSquare,
 *   promotion: promotionPiece (e.g., 'q' for queen)
 * @returns An object with the new FEN and move details if the move is valid,
 *          otherwise null or an error indicator.
 */
export const makeMove = (
  currentFen: string,
  move: AppMove
): { newFen: string; moveDetails: ChessJsMove } | null => {
  const chess = new Chess(currentFen);
  try {
    // chess.js move function can take a string or an object.
    // Our AppMove is compatible with the object form.
    const moveInput: { from: string; to: string; promotion?: string } = {
      from: move.from,
      to: move.to,
    };
    if (move.promotion) {
      moveInput.promotion = move.promotion;
    }

    const result = chess.move(moveInput);

    if (result) {
      return { newFen: chess.fen(), moveDetails: result };
    }
    return null; // Move was invalid according to chess.js
  } catch (e) {
    // chess.js throws an error for illegal moves
    console.error("Invalid move:", e);
    return null;
  }
};

/**
 * Gets the current status of the game.
 * @param fen The FEN string of the board position.
 * @returns A GameLogicState object describing the game state.
 */
export const getGameStatus = (fen: string): GameLogicState => {
  const chess = new Chess(fen);
  const turn = toPlayerColor(chess.turn());
  const isCheck = chess.isCheck();
  const isCheckmate = chess.isCheckmate();
  const isStalemate = chess.isStalemate();
  const isThreefoldRepetition = chess.isThreefoldRepetition();
  const isInsufficientMaterial = chess.isInsufficientMaterial();
  // isDraw() checks for 50-move, threefold, and insufficient material
  const isChessJsDraw = chess.isDraw(); // General draw flag from chess.js

  let winner: PlayerColor | 'draw' | null = null;
  let appStatus: AppGameStatus;
  let drawType: AppDrawType = null;

  if (isCheckmate) {
    winner = turn === 'w' ? 'b' : 'w'; // If it's white's turn and checkmate, black wins
    appStatus = winner === 'w' ? AppGameStatus.CHECKMATE_WHITE_WINS : AppGameStatus.CHECKMATE_BLACK_WINS;
  } else if (isStalemate) {
    winner = 'draw';
    appStatus = AppGameStatus.STALEMATE_DRAW;
    drawType = DrawType.STALEMATE;
  } else if (isThreefoldRepetition) { // Check specific draw conditions first
    winner = 'draw';
    appStatus = AppGameStatus.DRAW_BY_THREEFOLD_REPETITION;
    drawType = DrawType.THREEFOLD_REPETITION;
  } else if (isInsufficientMaterial) {
    winner = 'draw';
    appStatus = AppGameStatus.DRAW_BY_INSUFFICIENT_MATERIAL;
    drawType = DrawType.INSUFFICIENT_MATERIAL;
  } else if (isChessJsDraw) { // If chess.js says it's a draw, and not one of the above specific ones
    winner = 'draw';
    // This primarily catches the fifty-move rule if not explicitly handled by isThreefoldRepetition or isInsufficientMaterial
    appStatus = AppGameStatus.DRAW_BY_FIFTY_MOVE_RULE;
    drawType = DrawType.FIFTY_MOVE_RULE;
  } else if (isCheck) {
    appStatus = turn === 'w' ? AppGameStatus.WHITE_IN_CHECK : AppGameStatus.BLACK_IN_CHECK;
  } else {
    appStatus = AppGameStatus.IN_PROGRESS;
  }

  // Recalculate isDraw and isGameOver based on the determined state
  const isDraw = winner === 'draw';
  const isGameOver = isCheckmate || isDraw;

  return {
    fen,
    turn,
    isCheck,
    isCheckmate,
    isStalemate, // Retain for direct checking if needed, though drawType is more specific
    isDraw,       // Overall draw status
    isGameOver,
    winner,
    appStatus,
    drawType,     // Specific type of draw
  };
};

/**
 * Gets the FEN string for the current board state.
 * This is a simple wrapper if you just need the FEN from an instance.
 * Typically, you'll pass FENs around.
 * @param chessInstance An instance of Chess.
 * @returns The FEN string.
 */
export const getCurrentBoardState = (chessInstance: Chess): string => {
  return chessInstance.fen();
};

// Example: To determine player color assignment (e.g., host is White)
// This logic would typically reside in App.tsx or useGameConnection
// and then be passed to components. gameLogic.ts itself is color-agnostic
// beyond what the FEN string dictates for the current turn.

/**
 * Handles a player's resignation.
 * @param currentFen The FEN string of the current board position.
 * @param resigningPlayerColor The color of the player who resigned.
 * @returns A GameLogicState object describing the game state after resignation.
 */
export const handleResignation = (
  currentFen: string,
  resigningPlayerColor: PlayerColor
): GameLogicState => {
  const chess = new Chess(currentFen); // Load current game
  const winner = resigningPlayerColor === 'w' ? 'b' : 'w';
  const loser = resigningPlayerColor;

  let appStatus: AppGameStatus;
  if (winner === 'w') {
    appStatus = AppGameStatus.RESIGNATION_WHITE_WINS;
  } else {
    appStatus = AppGameStatus.RESIGNATION_BLACK_WINS;
  }

  // Get the base status, then override resignation-specific fields
  const baseStatus = getGameStatus(currentFen);

  return {
    ...baseStatus, // Spread existing state like FEN, turn (though turn is less relevant now)
    isGameOver: true,
    winner: winner,
    // loser: loser, // Not explicitly in GameLogicState, but implied by winner and appStatus
    appStatus: appStatus,
    isCheck: chess.isCheck(), // Keep current check status for historical record if needed
    isCheckmate: false, // Not a checkmate
    isStalemate: false, // Not a stalemate
    isDraw: false,      // Not a draw
    drawType: null,     // No draw type
  };
};