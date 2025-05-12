import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Box, Stack, Chip, IconButton } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share'; // Or any other share icon

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
  opponentPeerId,
  assignedColor,
}) => {
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  const handleHostGameClick = () => {
    onHostGame();
  };

  const handleJoinGameClick = () => {
    if (roomIdToJoin.trim()) {
      onJoinGame(roomIdToJoin.trim());
    } else {
      // Consider using an MUI Snackbar for alerts in a real app
      alert('Please enter a Game ID to join.');
    }
  };

  const handleLeaveGameClick = () => {
    onLeaveGame();
  };

  const handleShareInvite = async () => {
    if (!gameId) {
      console.error('No game ID available to share.');
      return;
    }
    const shareData = {
      title: 'Join my Chess Game!',
      text: `Join my chess game. Game ID: ${gameId}`,
      url: window.location.origin, // Or window.location.href for the full URL
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Game invite shared successfully');
      } catch (error) {
        console.error('Error sharing game invite:', error);
        // Fallback for when sharing fails or is cancelled by user
        alert(`Could not share. Game ID: ${gameId}\nURL: ${shareData.url}`);
      }
    } else {
      console.warn('Web Share API not supported. Fallback: copying to clipboard or manual share.');
      // Fallback: Attempt to copy to clipboard
      try {
        await navigator.clipboard.writeText(`Join my chess game on ${shareData.url}. Game ID: ${gameId}`);
        alert(`Invite link copied to clipboard!\nGame ID: ${gameId}\nURL: ${shareData.url}`);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        alert(`Web Share not supported. Please manually share the Game ID: ${gameId} and URL: ${shareData.url}`);
      }
    }
  };

  const getStatusChipColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('connected') && !lowerStatus.includes('not')) return "success";
    if (lowerStatus.includes('connecting') || lowerStatus.includes('pending')) return "info";
    if (lowerStatus.includes('error') || lowerStatus.includes('failed')) return "error";
    if (lowerStatus.includes('disconnected') || lowerStatus.includes('closed')) return "warning";
    return "default";
  };

  return (
    <Paper elevation={3} sx={{ padding: 3, margin: 2, backgroundColor: 'background.paper' }}>
      <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary' }}>
        Connection Manager
      </Typography>

      <Box sx={{ marginBottom: 2 }}>
        <Typography component="div" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <strong>Status:</strong>
          <Chip label={connectionStatus} color={getStatusChipColor(connectionStatus)} size="small" />
        </Typography>
        {error && (
          <Typography color="error" sx={{ marginTop: 1 }}>
            <strong>Error:</strong> {error}
          </Typography>
        )}
      </Box>

      <Box sx={{ marginBottom: 2 }}>
        {peerId && (
          <Typography sx={{ color: 'text.secondary' }}>
            My Peer ID: <Typography component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>{peerId}</Typography>
          </Typography>
        )}
        {gameId && (
          <Typography sx={{ color: 'text.secondary' }}>
            Current Game ID: <Typography component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>{gameId}</Typography>
          </Typography>
        )}
      </Box>

      {!isConnected && !gameId && (
        <Stack spacing={2} sx={{ marginTop: 2 }}>
          <Button variant="contained" color="primary" onClick={handleHostGameClick}>
            Host New Game
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Game ID to Join"
              variant="outlined"
              size="small"
              value={roomIdToJoin}
              onChange={(e) => setRoomIdToJoin(e.target.value)}
              fullWidth
              InputLabelProps={{
                style: { color: 'text.secondary' },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'grey.700', // Default border color
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'grey.500', // Border color on hover
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main', // Border color when focused
                  },
                  // The 'color: text.primary' previously here was likely redundant or conflicting,
                  // as input text color is specifically handled by '.MuiInputBase-input'.
                },
                '& .MuiInputBase-input': {
                  color: 'text.primary', // Ensures the input text itself is the correct color
                },
              }}
            />
            <Button variant="contained" color="secondary" onClick={handleJoinGameClick}>
              Join Game
            </Button>
          </Stack>
        </Stack>
      )}

      {gameId && (
        <Box sx={{ marginTop: 2 }}>
          {isHost !== null && (
            <Typography sx={{ color: 'text.secondary' }}>
              Role: <Typography component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>{isHost ? 'Host' : 'Joiner'}</Typography>
            </Typography>
          )}
          {assignedColor && (
            <Typography sx={{ color: 'text.secondary' }}>
              Your Color: <Typography component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>{assignedColor === 'w' ? 'White' : 'Black'}</Typography>
            </Typography>
          )}
          {opponentPeerId && (
            <Typography sx={{ color: 'text.secondary' }}>
              Opponent ID: <Typography component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>{opponentPeerId}</Typography>
            </Typography>
          )}
          {isConnected && (
            <Typography color="success.main" sx={{ marginTop: 1, fontWeight: 'bold' }}>
              Successfully connected to opponent!
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ marginTop: 2 }}>
            <Button variant="outlined" color="warning" onClick={handleLeaveGameClick}>
              Leave Game
            </Button>
            {isHost && gameId && (
              <Button
                variant="contained"
                color="info"
                onClick={handleShareInvite}
                startIcon={<ShareIcon />}
              >
                Invite
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default ConnectionManager;