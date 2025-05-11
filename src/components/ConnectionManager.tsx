import React, { useState } from 'react';
// Removed useGameConnection import as props will be passed down

interface ConnectionManagerProps {
  peerId: string | null;
  gameId: string | null;
  isConnected: boolean;
  isHost: boolean | null;
  connectionStatus: string;
  onHostGame: () => void;
  onJoinGame: (idToJoin: string) => void;
  onLeaveGame: () => void;
  error: string | null;
  // Props that might be displayed here or in StatusDisplay, passed from App.tsx
  // For simplicity, if App.tsx's StatusDisplay shows these, they might not be needed here.
  // However, the original component used them, so let's keep them for now.
  opponentPeerId: string | null;
  assignedColor: 'w' | 'b' | null;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  peerId,
  gameId,
  isConnected,
  isHost,
  connectionStatus,
  onHostGame,
  onJoinGame,
  onLeaveGame,
  error,
  opponentPeerId, // Added from props
  assignedColor,  // Added from props
}) => {
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  const handleHostGameClick = () => {
    onHostGame(); // Call the prop function
  };

  const handleJoinGameClick = () => {
    if (roomIdToJoin.trim()) {
      onJoinGame(roomIdToJoin.trim()); // Call the prop function
    } else {
      alert('Please enter a Game ID to join.');
    }
  };

  const handleLeaveGameClick = () => {
    onLeaveGame(); // Call the prop function
  };

  return (
    <div className="connection-manager">
      <h3 className="cm-title">Connection Manager</h3>
      <div className="cm-status-section">
        <p className="cm-status"><strong>Status:</strong> <span className={`status-${connectionStatus?.toLowerCase().replace(/_/g, '-')}`}>{connectionStatus}</span></p>
        {error && <p className="cm-error"><strong>Error:</strong> {error}</p>}
      </div>
      
      <div className="cm-info-section">
        {peerId && <p>My Peer ID: <span className="cm-peer-id">{peerId}</span></p>}
        {gameId && <p>Current Game ID: <span className="cm-game-id">{gameId}</span></p>}
      </div>
      
      {!isConnected && !gameId && (
        <div className="cm-actions-section">
          <button onClick={handleHostGameClick} className="cm-button cm-button-host mb-1">
            Host New Game
          </button>
          <div className="cm-join-group">
            <input
              type="text"
              placeholder="Enter Game ID to Join"
              value={roomIdToJoin}
              onChange={(e) => setRoomIdToJoin(e.target.value)}
              className="cm-input cm-input-join-id"
            />
            <button onClick={handleJoinGameClick} className="cm-button cm-button-join">Join Game</button>
          </div>
        </div>
      )}

      {gameId && (
        <div className="cm-game-active-info">
          {isHost !== null && <p>Role: {isHost ? 'Host' : 'Joiner'}</p>}
          {assignedColor && <p>Your Color: {assignedColor === 'w' ? 'White' : 'Black'}</p>}
          {opponentPeerId && <p>Opponent ID: <span className="cm-peer-id">{opponentPeerId}</span></p>}
          {isConnected && <p className="cm-connected-success"><strong>Successfully connected to opponent!</strong></p>}
          <button onClick={handleLeaveGameClick} className="cm-button cm-button-leave mt-1">
            Leave Game
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;