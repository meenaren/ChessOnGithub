import React, { useState } from 'react';
import { GameStatus, type PlayerColor } from '../utils/types';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

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
  localPlayerColor: PlayerColor | null;
  isGameOver: boolean;

  // Callbacks
  onResignConfirm: () => void; // Updated: will get player color from localPlayerColor prop
}

const getStatusColor = (status: GameStatus | undefined): string => {
  if (!status) return 'text.primary';
  switch (status) {
    // Success states
    case GameStatus.IN_PROGRESS:
    case GameStatus.RESYNCHRONIZATION_SUCCESSFUL:
    // Potentially game end states if we want to color them, though gameDisplayStatus might be primary
    // case GameStatus.CHECKMATE_WHITE_WINS:
    // case GameStatus.CHECKMATE_BLACK_WINS:
    // case GameStatus.RESIGNATION_WHITE_WINS:
    // case GameStatus.RESIGNATION_BLACK_WINS:
      return 'success.main';

    // Warning states
    case GameStatus.AWAITING_CONNECTION:
    case GameStatus.SETTING_UP:
    case GameStatus.WHITE_IN_CHECK:
    case GameStatus.BLACK_IN_CHECK:
    case GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT:
    case GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC:
    case GameStatus.RESYNCHRONIZING_GAME_STATE:
      return 'warning.main';

    // Error states
    case GameStatus.CONNECTION_FAILED:
    case GameStatus.DISCONNECTED_OPPONENT_LEFT:
    case GameStatus.RESYNCHRONIZATION_FAILED:
    case GameStatus.GAME_ENDED_BY_ERROR:
      return 'error.main';

    // Info/Neutral states (e.g., draws)
    case GameStatus.STALEMATE_DRAW:
    case GameStatus.DRAW_BY_THREEFOLD_REPETITION:
    case GameStatus.DRAW_BY_FIFTY_MOVE_RULE:
    case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL:
    case GameStatus.DRAW_AGREED:
    default:
      return 'info.main'; // Default for any other states or if specific color isn't critical
  }
};

const NavBar: React.FC<NavBarProps> = ({
  connectionStatusDisplay,
  gameId,
  // peerId,
  // isHost,
  // opponentPeerId,
  rawConnectionStatus,
  gameDisplayStatus,
  localPlayerColor,
  isGameOver,
  onResignConfirm,
}) => {
  const [openResignConfirmDialog, setOpenResignConfirmDialog] = useState(false);

  const handleResignClick = () => {
    setOpenResignConfirmDialog(true);
  };

  const handleCloseResignDialog = (confirmed: boolean) => {
    setOpenResignConfirmDialog(false);
    if (confirmed && localPlayerColor) {
      onResignConfirm(); // App.tsx will handle sending the message with localPlayerColor
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 0.5 },
            px: { xs: 1, sm: 2 }
          }}
        >
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', my: { xs: 0.5, sm: 0 }, order: { xs: 1, sm: 1 } }}>
            <Box
              component="img"
              sx={{
                height: { xs: 60, sm: 80 }, // Adjusted size
                width: { xs: 60, sm: 80 },  // Adjusted size
                display: 'block',
              }}
              alt="ChessP2P Logo"
              src="/ChessOnGithub/logo.png"
            />
            <Typography variant="h5" component="h1" sx={{ ml: 1.5, color: 'common.white', fontWeight: 'bold', alignSelf: 'center' }}>
              ChessP2P
            </Typography>
          </Box>

          {/* Game Status */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              textAlign: 'center',
              fontWeight: 'medium',
              my: { xs: 0.5, sm: 0 },
              px: { xs: 1, sm: 2 },
              order: { xs: 3, sm: 2 },
              width: { xs: '100%', sm: 'auto' },
              color: 'common.white'
            }}
          >
            {gameDisplayStatus}
          </Typography>

          {/* Right Aligned Group: Resign Button & Connection Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, order: { xs: 2, sm: 3 }, flexDirection: { xs: 'row-reverse', sm: 'row' } }}>
            {/* Resign Button */}
            <Button
              variant="contained"
              color="secondary" // Or "warning" or "error" depending on desired emphasis
              onClick={handleResignClick}
              disabled={isGameOver || !localPlayerColor}
              sx={{ my: { xs: 0.5, sm: 0 } }}
            >
              Resign
            </Button>
            
            {/* Connection Status */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'center', sm: 'flex-end' },
                textAlign: { xs: 'center', sm: 'right' },
                minWidth: { sm: '180px' }, // Keep minWidth for consistency
                my: { xs: 0.5, sm: 0 },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: getStatusColor(rawConnectionStatus),
                  fontWeight: 'bold',
                }}
              >
                {connectionStatusDisplay}
              </Typography>
              {gameId && (
                <Typography variant="caption" sx={{ color: 'common.white', mt: 0.25 }}>
                  (Room: {gameId})
                </Typography>
              )}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Resign Confirmation Dialog */}
      <Dialog
        open={openResignConfirmDialog}
        onClose={() => handleCloseResignDialog(false)}
        aria-labelledby="resign-dialog-title"
        aria-describedby="resign-dialog-description"
      >
        <DialogTitle id="resign-dialog-title">Confirm Resignation</DialogTitle>
        <DialogContent>
          <DialogContentText id="resign-dialog-description">
            Are you sure you want to resign? This will result in a loss.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseResignDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleCloseResignDialog(true)} color="secondary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NavBar;