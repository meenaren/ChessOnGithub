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
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px' }}>
      <h2>Connection Manager</h2>
      <p><strong>Status:</strong> {connectionStatus}</p>
      {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
      
      {peerId && <p>My Peer ID: {peerId}</p>}
      {/* Display gameId passed as prop */}
      {gameId && <p>Current Game ID: {gameId}</p>}
      
      {!isConnected && !gameId && ( // Show host/join options if not connected and no gameId from App.tsx
        <div>
          <button onClick={handleHostGameClick} style={{ marginRight: '10px' }}>
            Host New Game
          </button>
          <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Enter Game ID to Join"
              value={roomIdToJoin}
              onChange={(e) => setRoomIdToJoin(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <button onClick={handleJoinGameClick}>Join Game</button>
          </div>
        </div>
      )}

      {/* Display additional info if gameId exists (meaning a game is active or being set up) */}
      {gameId && (
        <div>
          {isHost !== null && <p>Role: {isHost ? 'Host' : 'Joiner'}</p>}
          {/* assignedColor and opponentPeerId are now props */}
          {assignedColor && <p>Your Color: {assignedColor === 'w' ? 'White' : 'Black'}</p>}
          {opponentPeerId && <p>Opponent ID: {opponentPeerId}</p>}
          {isConnected && <p><strong>Successfully connected to opponent!</strong></p>}
          <button onClick={handleLeaveGameClick} style={{ marginTop: '10px' }}>
            Leave Game
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;