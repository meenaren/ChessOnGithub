import React from 'react';
import { GameStatus, type PlayerColor, DrawType as AppDrawType, DrawType } from '../utils/types'; // Added DrawType and AppDrawType

interface StatusDisplayProps {
  currentTurn: PlayerColor | null;
  gameStatus: GameStatus | string;
  localPlayerColor: PlayerColor | null;
  opponentPeerId: string | null;
  isConnected: boolean;
  isHost: boolean | null;
  gameId: string | null;
  isCheck: boolean;
  isCheckmate: boolean;
  winner: PlayerColor | 'draw' | null;
  drawType: AppDrawType; // Added drawType prop
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({
  currentTurn,
  gameStatus,
  localPlayerColor,
  opponentPeerId,
  isConnected,
  isHost,
  gameId,
  isCheck,
  isCheckmate,
  winner,
  drawType, // Destructure drawType
}) => {
  let turnIndicator = '';
  const turnColorText = currentTurn === 'w' ? 'White' : 'Black';

  // Determine if the game is over due to a draw condition for turn indicator logic
  const isGameDrawn = winner === 'draw' ||
                      gameStatus === GameStatus.STALEMATE_DRAW ||
                      gameStatus === GameStatus.DRAW_BY_THREEFOLD_REPETITION ||
                      gameStatus === GameStatus.DRAW_BY_FIFTY_MOVE_RULE ||
                      gameStatus === GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL ||
                      gameStatus === GameStatus.DRAW_AGREED;

  if (currentTurn && !isCheckmate && !isGameDrawn && gameStatus !== GameStatus.RESIGNATION_BLACK_WINS && gameStatus !== GameStatus.RESIGNATION_WHITE_WINS) {
    const isMyTurn = localPlayerColor === currentTurn;
    turnIndicator = isMyTurn ? `Your turn (${turnColorText})` : `${turnColorText}'s turn`;
  }

  let statusText = '';

  if (isCheckmate) {
    const winnerColorText = winner === 'w' ? 'White' : 'Black';
    statusText = `Checkmate! ${winnerColorText} has won!`;
  } else if (drawType) { // Prioritize specific drawType for messaging
    switch (drawType) {
      case DrawType.STALEMATE:
        statusText = 'Draw by Stalemate!';
        break;
      case DrawType.THREEFOLD_REPETITION:
        statusText = 'Draw by Threefold Repetition!';
        break;
      case DrawType.INSUFFICIENT_MATERIAL:
        statusText = 'Draw by Insufficient Material!';
        break;
      case DrawType.FIFTY_MOVE_RULE:
        statusText = 'Draw by Fifty-Move Rule!';
        break;
      default: // Should not happen if drawType is set
        statusText = 'Game Drawn!';
        break;
    }
  } else if (winner === 'draw') { // Fallback to gameStatus if drawType is null but winner is 'draw'
    switch (gameStatus) {
      case GameStatus.STALEMATE_DRAW:
        statusText = 'Draw by Stalemate!';
        break;
      case GameStatus.DRAW_BY_THREEFOLD_REPETITION:
        statusText = 'Draw by Threefold Repetition!';
        break;
      case GameStatus.DRAW_BY_FIFTY_MOVE_RULE:
        statusText = 'Draw by Fifty-Move Rule!';
        break;
      case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL:
        statusText = 'Draw by Insufficient Material!';
        break;
      case GameStatus.DRAW_AGREED:
        statusText = 'Draw Agreed.';
        break;
      default:
        statusText = 'Game Drawn!'; // Generic draw
    }
  } else if (gameStatus === GameStatus.RESIGNATION_WHITE_WINS) {
    statusText = 'Black resigned. White wins.';
  } else if (gameStatus === GameStatus.RESIGNATION_BLACK_WINS) {
    statusText = 'White resigned. Black wins.';
  } else if (isCheck) {
    statusText = `Check! ${turnIndicator}`;
  } else if (turnIndicator) {
    statusText = turnIndicator;
  } else {
    // Fallback for other game statuses
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
      case GameStatus.DISCONNECTED_OPPONENT_LEFT:
        statusText = `Opponent (${opponentPeerId || 'Player'}) disconnected.`;
        break;
      case GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT:
        statusText = 'Connection lost. Attempting to reconnect...';
        break;
      case GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC:
        statusText = 'Opponent reconnected. Awaiting game state synchronization...';
        break;
      case GameStatus.RESYNCHRONIZING_GAME_STATE:
        statusText = 'Resynchronizing game state...';
        break;
      case GameStatus.RESYNCHRONIZATION_SUCCESSFUL:
        statusText = `Game resynchronized successfully! ${turnIndicator || (currentTurn ? `${turnColorText}'s turn` : '')}`;
        break;
      case GameStatus.RESYNCHRONIZATION_FAILED:
        statusText = 'Game resynchronization failed. The game state might be inconsistent.';
        break;
      case GameStatus.GAME_ENDED_BY_ERROR:
        statusText = 'Game ended due to an error.';
        break;
      default:
        if (Object.values(GameStatus).includes(gameStatus as GameStatus)) {
          statusText = `Game status: ${gameStatus}. ${turnIndicator || (currentTurn ? `${turnColorText}'s turn` : '')}`;
        } else if (typeof gameStatus === 'string') {
          statusText = gameStatus;
        } else {
          statusText = 'Game status unknown.';
        }
    }
  }


  const playerInfo = localPlayerColor ? `You are: ${localPlayerColor === 'w' ? 'White' : 'Black'}` : 'Color not assigned yet.';
  const connectionInfo = isConnected ? `Connected to: ${opponentPeerId || 'Opponent'}` : 'Not connected.';

  return (
    <div className="status-display">
      <h4 className="sd-title">Game Status</h4>
      <p className="sd-status-text" data-testid="status-text">
        <strong>{statusText}</strong>
      </p>
      <div className="sd-info-grid">
        {isConnected && localPlayerColor && <p className="sd-player-info">{playerInfo}</p>}
        <p className="sd-connection-info">{connectionInfo}</p>
      </div>
      {/* The specific "CHECK!" indicator might be redundant if statusText already includes it */}
      {/* {(isCheck && !isCheckmate) && (
        <p className="sd-check-indicator">CHECK!</p>
      )} */}
    </div>
  );
};

export default StatusDisplay;