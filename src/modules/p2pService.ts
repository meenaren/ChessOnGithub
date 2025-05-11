import { P2PMessageKeyEnum } from '../utils/types';
import type {
  Move, MovePayload, PlayerColor, GameStatus, // Added GameStatus here as it's used in createGameStateMessage and createSyncGameStateMessage
  MoveMessage, GameStateUpdateMessage, ResignMessage, DrawOfferMessage, GameStateUpdatePayload,
  RequestGameStateMessage, SyncGameStateMessage, SyncGameStatePayload, RequestGameStatePayload // Added new types
} from '../utils/types';

/**
 * This service helps in constructing and interpreting P2P messages.
 * The actual sending and receiving is handled by the useGameConnection hook.
 */

// Message Type Constants (optional, but good for consistency)
// Message Type Constants are now derived from P2PMessageKeyEnum
// export const MSG_TYPE_MOVE = P2PMessageKeyEnum.MOVE; // Example if needed locally
// export const MSG_TYPE_GAME_STATE_UPDATE = P2PMessageKeyEnum.GAME_STATE_UPDATE;
// ... and so on for other types if direct string comparison is preferred over enum.
// For constructing messages, directly use P2PMessageKeyEnum values.


/**
 * Creates a P2P message object for sending a chess move.
 * @param move - The chess move object.
 * @returns A P2PMessage object.
 */
export const createMoveMessage = (move: Move): MoveMessage => {
  const payload: MovePayload = {
    from: move.from,
    to: move.to,
    promotion: move.promotion || null, // Ensure it's null if undefined
  };
  return {
    type: P2PMessageKeyEnum.MOVE,
    payload,
  };
};

/**
 * Placeholder for creating a game state synchronization message.
 * @param fen - The FEN string representing the board state.
 * @param turn - The current player's turn.
 * @returns A P2PMessage object.
 */
export const createGameStateMessage = (fen: string, turn: PlayerColor, gameStatus: GameStatus, lastMove: Move | null = null): GameStateUpdateMessage => {
  const payload: GameStateUpdatePayload = {
    fen,
    turn,
    gameStatus,
    lastMove: lastMove, // lastMove is already Move | null
  };
  return {
    type: P2PMessageKeyEnum.GAME_STATE_UPDATE,
    payload,
  };
};
// GameStatus is now imported at the top

/**
 * Creates a P2P message to request the full game state from the opponent.
 * @returns A RequestGameStateMessage object.
 */
export const createRequestGameStateMessage = (): RequestGameStateMessage => {
  return {
    type: P2PMessageKeyEnum.REQUEST_GAME_STATE,
    payload: null, // Payload is null as per RequestGameStatePayload type
  };
};

/**
 * Creates a P2P message to send the full game state to the opponent.
 * @param fen - The FEN string representing the board state.
 * @param turn - The current player's turn.
 * @param gameStatus - The current game status.
 * @param lastMove - The last move made in the game.
 * @param moveHistory - An array of moves made so far.
 * @param playerWhiteId - Peer ID of the player who is White.
 * @param playerBlackId - Peer ID of the player who is Black.
 * @param isHostInitiated - Whether the host is sending this state.
 * @returns A SyncGameStateMessage object.
 */
export const createSyncGameStateMessage = (
  fen: string,
  turn: PlayerColor,
  gameStatus: GameStatus,
  lastMove: Move | null,
  moveHistory: Move[],
  playerWhiteId: string,
  playerBlackId: string,
  isHostInitiated: boolean
): SyncGameStateMessage => {
  const payload: SyncGameStatePayload = {
    fen,
    turn,
    gameStatus,
    lastMove,
    moveHistory,
    playerWhiteId,
    playerBlackId,
    isHostInitiated,
  };
  return {
    type: P2PMessageKeyEnum.SYNC_GAME_STATE,
    payload,
  };
};

/**
 * Placeholder for creating a resignation message.
 * @returns A P2PMessage object.
 */
export const createResignMessage = (): ResignMessage => {
    return {
        type: P2PMessageKeyEnum.RESIGN,
        payload: null,
    };
};

/**
 * Placeholder for creating a draw offer message.
 * @returns A P2PMessage object.
 */
export const createDrawOfferMessage = (): DrawOfferMessage => {
    return {
        type: P2PMessageKeyEnum.DRAW_OFFER,
        payload: null,
    };
};


// --- Handling Incoming Messages (Placeholders) ---
// These would typically be called from the useGameConnection hook's `receive` callback
// or an effect watching `receivedData`.

/**
 * Placeholder for processing a received chess move.
 * @param payload - The payload of the move message.
 * @param gameLogicModule - The game logic module to apply the move.
 */
export const handleReceivedMove = (payload: MovePayload | null | undefined /*, gameLogicModule: any */) => {
  if (payload) {
    console.log('P2P Service: Received move:', payload);
    // Example: gameLogicModule.applyOpponentMove({ from: payload.from, to: payload.to, promotion: payload.promotion });
  } else {
    console.warn('P2P Service: Received move message with no payload.');
  }
};

/**
 * Placeholder for processing a received game state update.
 * @param payload - The payload of the game state message.
 * @param gameLogicModule - The game logic module to update state.
 */
export const handleReceivedGameState = (payload: Record<string, any> | null | undefined /*, gameLogicModule: any */) => {
  if (payload && payload.fen && payload.turn) {
    console.log('P2P Service: Received game state:', payload);
    // Example: gameLogicModule.loadFen(payload.fen, payload.turn);
  } else {
    console.warn('P2P Service: Received game state message with invalid payload.');
  }
};

/**
 * Placeholder for processing a resignation.
 */
export const handleReceivedResignation = (/* gameLogicModule: any */) => {
    console.log('P2P Service: Opponent resigned.');
    // Example: gameLogicModule.endGame('resignation', opponentColor);
};


// This service doesn't manage the connection itself but helps structure messages.
// The useGameConnection hook is responsible for the actual P2P communication.