import React from 'react';
import { Chessboard } from 'react-chessboard'; // Removed PromotionPieceOption import
import type { Square } from 'chess.js'; // chess.js Square type is string
import type { PlayerColor } from '../utils/types';

interface BoardProps {
  gameFen: string;
  onPieceDrop: (sourceSquare: Square, targetSquare: Square, piece: string) => boolean; // Return true if move is valid, false otherwise
  boardOrientation: PlayerColor; // 'white' or 'black'
  arePiecesDraggable: boolean;
  onPromotionPieceSelect: (
    piece?: string, // Changed to string | undefined to be more general
    promoteFromSquare?: Square,
    promoteToSquare?: Square
  ) => boolean; // This is the correct signature for react-chessboard's prop
  // Potentially add custom square styles for highlighting last move or checks
  // customSquareStyles?: { [square: string]: React.CSSProperties };
}

const Board: React.FC<BoardProps> = ({
  gameFen,
  onPieceDrop,
  boardOrientation,
  arePiecesDraggable,
  onPromotionPieceSelect, // Added
  // customSquareStyles = {},
}) => {
  const handlePieceDrop = (
    sourceSquare: Square,
    targetSquare: Square,
    piece: string // e.g., 'wP', 'bN'
  ): boolean => {
    if (!arePiecesDraggable) {
      return false; // Prevent move if not draggable (not player's turn or disconnected)
    }
    // The onPieceDrop prop will handle validation and state update via gameLogic
    return onPieceDrop(sourceSquare, targetSquare, piece);
  };

  return (
    <div style={{ width: '400px', maxWidth: '100vw' }}> {/* Basic responsive wrapper */}
      <Chessboard
        position={gameFen}
        onPieceDrop={handlePieceDrop}
        boardOrientation={boardOrientation === 'w' ? 'white' : 'black'}
        arePiecesDraggable={arePiecesDraggable}
        onPromotionPieceSelect={onPromotionPieceSelect} // Added prop
        // customSquareStyles={customSquareStyles}
        // id="PlayVsPlay" // Default or custom ID
        // animationDuration={200}
        // areArrowsAllowed={false}
        // showBoardNotation={true}
        // clearPremovesOnRightClick={false}
      />
    </div>
  );
};

export default Board;