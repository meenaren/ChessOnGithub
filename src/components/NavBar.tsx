import React from 'react';
import { GameStatus, type PlayerColor, type DrawType as AppDrawType } from '../utils/types';

interface NavBarProps {
  // Connection Status Props
  connectionStatusDisplay: string;
  gameId: string | null;
  peerId: string | null; // Retained, might be useful for debugging or future features
  isHost: boolean | null; // Retained
  opponentPeerId: string | null;
  rawConnectionStatus: GameStatus;

  // Game Status Props (to be passed from App.tsx)
  gameDisplayStatus: string; // The main string like "White's Turn", "Checkmate!"
  currentTurn: PlayerColor | null;
  isCheck: boolean;
  // isCheckmate: boolean; // gameDisplayStatus should cover this
  // winner: PlayerColor | 'draw' | null; // gameDisplayStatus should cover this
  // drawType: AppDrawType | null; // gameDisplayStatus should cover this
  // localPlayerColor: PlayerColor | null; // gameDisplayStatus might use this for "Your turn"
}

const NavBar: React.FC<NavBarProps> = ({
  connectionStatusDisplay,
  gameId,
  // peerId,
  // isHost,
  opponentPeerId,
  rawConnectionStatus,
  gameDisplayStatus,
  // currentTurn, // gameDisplayStatus should incorporate this
  // isCheck, // gameDisplayStatus should incorporate this
}) => {
  return (
    <nav className="navbar">
      <div className="navbar-title">ChessOnGithub</div>
      <div className="navbar-game-status">
        <strong>{gameDisplayStatus}</strong>
      </div>
      <div className={`navbar-connection-status status-${rawConnectionStatus?.toLowerCase().replace(/_/g, '-')}`}>
        <span>{connectionStatusDisplay}</span>
        {gameId && ( // Show Room ID if gameId exists, opponentPeerId check removed to show even if waiting
          <span className="navbar-status-details">
            (Room: {gameId})
          </span>
        )}
      </div>
    </nav>
  );
};

export default NavBar;