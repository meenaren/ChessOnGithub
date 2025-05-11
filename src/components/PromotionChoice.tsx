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
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: '20px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1000, // Ensure it's on top
      }}
    >
      <h4 style={{ color: 'white', margin: '0 0 15px 0' }}>Promote Pawn To:</h4>
      <div style={{ display: 'flex', gap: '10px' }}>
        {promotionPieces.map((piece) => (
          <button
            key={piece}
            onClick={() => onSelect(piece)}
            style={{
              fontSize: '2em',
              padding: '10px 15px',
              cursor: 'pointer',
              border: '2px solid #555',
              backgroundColor: '#333',
              color: 'white',
              borderRadius: '5px',
            }}
            title={`Promote to ${piece.toUpperCase()}`}
          >
            {pieceUnicode[playerColor][piece]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PromotionChoice;