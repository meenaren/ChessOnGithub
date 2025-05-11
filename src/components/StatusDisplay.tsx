import React from 'react';
import { GameStatus, type PlayerColor } from '../utils/types';

interface StatusDisplayProps {
  currentTurn: PlayerColor | null;
  gameStatus: GameStatus | string; // Allow string for custom messages if needed, but prefer GameStatus enum
  localPlayerColor: PlayerColor | null;
  opponentPeerId: string | null;
  isConnected: boolean;
  isHost: boolean | null;
  gameId: string | null;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({
  currentTurn,
  gameStatus,
  localPlayerColor,
  opponentPeerId,
  isConnected,
  isHost,
  gameId,
}) => {
  let turnIndicator = '';
  if (currentTurn && (gameStatus === GameStatus.IN_PROGRESS || gameStatus === GameStatus.WHITE_IN_CHECK || gameStatus === GameStatus.BLACK_IN_CHECK)) {
    const isMyTurn = localPlayerColor === currentTurn;
    const turnColorText = currentTurn === 'w' ? 'White' : 'Black';
    turnIndicator = isMyTurn ? `Your turn (${turnColorText})` : `${turnColorText}'s turn`;
  }

  let statusText = '';
  switch (gameStatus) {
    case GameStatus.AWAITING_CONNECTION:
      statusText = isHost && gameId ? `Waiting for opponent to join Game ID: ${gameId}` : 'Awaiting connection...';
      if (!isHost && gameId) statusText = `Attempting to join Game ID: ${gameId}...`;
      break;
    case GameStatus.CONNECTION_FAILED:
      statusText = 'Connection failed.';
      break;
    case GameStatus.SETTING_UP:
      statusText = 'Connection established. Setting up game...';
      break;
    case GameStatus.IN_PROGRESS:
      statusText = turnIndicator;
      break;
    case GameStatus.WHITE_IN_CHECK:
      statusText = `White is in Check! ${turnIndicator}`;
      break;
    case GameStatus.BLACK_IN_CHECK:
      statusText = `Black is in Check! ${turnIndicator}`;
      break;
    case GameStatus.CHECKMATE_WHITE_WINS:
      statusText = 'Checkmate! White wins.';
      break;
    case GameStatus.CHECKMATE_BLACK_WINS:
      statusText = 'Checkmate! Black wins.';
      break;
    case GameStatus.STALEMATE_DRAW:
      statusText = 'Stalemate! The game is a draw.';
      break;
    case GameStatus.DRAW_BY_THREEFOLD_REPETITION:
      statusText = 'Draw by threefold repetition.';
      break;
    case GameStatus.DRAW_BY_FIFTY_MOVE_RULE:
      statusText = 'Draw by fifty-move rule.';
      break;
    case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL:
      statusText = 'Draw by insufficient material.';
      break;
    case GameStatus.RESIGNATION_WHITE_WINS:
      statusText = 'Black resigned. White wins.';
      break;
    case GameStatus.RESIGNATION_BLACK_WINS:
      statusText = 'White resigned. Black wins.';
      break;
    case GameStatus.DISCONNECTED_OPPONENT_LEFT:
      statusText = `Opponent (${opponentPeerId || 'Player'}) disconnected.`;
      break;
    case GameStatus.GAME_ENDED_BY_ERROR:
      statusText = 'Game ended due to an error.';
      break;
    default:
      // Handle cases where gameStatus might be a custom string
      statusText = typeof gameStatus === 'string' ? gameStatus : 'Game status unknown.';
  }

  const playerInfo = localPlayerColor ? `You are: ${localPlayerColor === 'w' ? 'White' : 'Black'}` : 'Color not assigned yet.';
  const connectionInfo = isConnected ? `Connected to: ${opponentPeerId || 'Opponent'}` : 'Not connected.';

  return (
    <div className="status-display" style={{ margin: '10px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h4>Game Status</h4>
      <p data-testid="status-text"><strong>{statusText}</strong></p>
      {isConnected && localPlayerColor && <p>{playerInfo}</p>}
      <p>{connectionInfo}</p>
      {/* More detailed connection status from useGameConnection can be added if needed */}
    </div>
  );
};

export default StatusDisplay;