import React from 'react';
import { GameStatus, type PlayerColor, type DrawType } from '../utils/types';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

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
  // currentTurn, // gameDisplayStatus should incorporate this
  // isCheck, // gameDisplayStatus should incorporate this
}) => {
  return (
    <AppBar position="static">
      <Toolbar 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap', 
          gap: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 0.5 }, // Padding top/bottom for toolbar
          px: { xs: 1, sm: 2 }   // Padding left/right for toolbar
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', my: { xs: 0.5, sm: 0 } }}>
          <Box
            component="img"
            sx={{
              height: 100,
              width: 100,
              display: 'block', // Remove extra space below img
            }}
            alt="ChessP2P Logo"
            src="/ChessOnGithub/logo.png" // Assuming this path is correct for the project setup
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
            px: { xs: 1, sm: 2 }, // Padding to prevent text touching edges if logo/status are wide
            order: { xs: 3, sm: 2 }, // Ensure game status is last on XS if wrapped, middle on SM+
            width: { xs: '100%', sm: 'auto' }, // Full width on XS if wrapped
            color: 'common.white' // Added color for visibility
          }}
        >
          {gameDisplayStatus}
        </Typography>

        {/* Connection Status */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'center', sm: 'flex-end' },
            textAlign: { xs: 'center', sm: 'right' },
            minWidth: { sm: '180px' },
            my: { xs: 0.5, sm: 0 },
            order: { xs: 2, sm: 3 } // Ensure connection status is second on XS, last on SM+
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
            <Typography variant="caption" sx={{ color: 'common.white', mt: 0.25 }}> {/* Changed color */}
              (Room: {gameId})
            </Typography>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;