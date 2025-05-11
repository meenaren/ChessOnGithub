import React from 'react';
import { PieceSymbol } from '../utils/types';

interface PromotionChoiceProps {
  onSelect: (piece: Exclude<PieceSymbol, 'p' | 'k'>) => void;
  playerColor: 'w' | 'b'; // To style pieces correctly if needed
}

const PromotionChoice: React.FC<PromotionChoiceProps> = ({ onSelect, playerColor }) => {
  const promotionPieces: Exclude<PieceSymbol, 'p' | 'k'>[] = [
    PieceSymbol.QUEEN,
    PieceSymbol.ROOK,
    PieceSymbol.BISHOP,
    PieceSymbol.KNIGHT,
  ];

  // Simple Unicode characters for pieces (can be replaced with images/SVG later)
  const pieceUnicode: Record<'w' | 'b', Record<Exclude<PieceSymbol, 'p' | 'k'>, string>> = {
    w: { q: '♕', r: '♖', b: '♗', n: '♘' },
    b: { q: '♛', r: '♜', b: '♝', n: '♞' },
  };

  return (
    <div className="promotion-choice-overlay">
      <div className="promotion-choice-dialog">
        <h4 className="pc-title">Promote Pawn To:</h4>
        <div className="pc-button-group">
          {promotionPieces.map((piece) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="pc-button"
              title={`Promote to ${piece.toUpperCase()}`}
            >
              <span className="pc-piece-unicode">{pieceUnicode[playerColor][piece]}</span>
              <span className="pc-piece-name">{piece.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionChoice;