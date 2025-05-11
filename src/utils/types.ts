export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export const P2PMessageKeyEnum = {
  CONNECTION_CONFIRMED: 'CONNECTION_CONFIRMED',
  INITIAL_GAME_SETUP: 'INITIAL_GAME_SETUP',
  MOVE: 'MOVE',
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
  RESIGN: 'RESIGN',
  DRAW_OFFER: 'DRAW_OFFER',
  DRAW_ACCEPT: 'DRAW_ACCEPT',
  ERROR: 'ERROR',
} as const;
export type P2PMessageKey = typeof P2PMessageKeyEnum[keyof typeof P2PMessageKeyEnum];

export type P2PPayloadConstraint = JsonObject | JsonValue[] | string | number | boolean | null;

export interface P2PMessage<P extends P2PPayloadConstraint = P2PPayloadConstraint> extends Record<string, JsonValue> {
  type: P2PMessageKey;
  payload: P;
}

export type PlayerColor = 'w' | 'b';

export const PieceSymbol = {
  PAWN: 'p', KNIGHT: 'n', BISHOP: 'b', ROOK: 'r', QUEEN: 'q', KING: 'k',
} as const;
export type PieceSymbol = typeof PieceSymbol[keyof typeof PieceSymbol];

export const GameStatus = {
  AWAITING_CONNECTION: 'AWAITING_CONNECTION', CONNECTION_FAILED: 'CONNECTION_FAILED', SETTING_UP: 'SETTING_UP',
  IN_PROGRESS: 'IN_PROGRESS', WHITE_IN_CHECK: 'WHITE_IN_CHECK', BLACK_IN_CHECK: 'BLACK_IN_CHECK',
  CHECKMATE_WHITE_WINS: 'CHECKMATE_WHITE_WINS', CHECKMATE_BLACK_WINS: 'CHECKMATE_BLACK_WINS',
  STALEMATE_DRAW: 'STALEMATE_DRAW', DRAW_BY_THREEFOLD_REPETITION: 'DRAW_BY_THREEFOLD_REPETITION',
  DRAW_BY_FIFTY_MOVE_RULE: 'DRAW_BY_FIFTY_MOVE_RULE', DRAW_BY_INSUFFICIENT_MATERIAL: 'DRAW_BY_INSUFFICIENT_MATERIAL',
  RESIGNATION_WHITE_WINS: 'RESIGNATION_WHITE_WINS', RESIGNATION_BLACK_WINS: 'RESIGNATION_BLACK_WINS',
  DRAW_AGREED: 'DRAW_AGREED', DISCONNECTED_OPPONENT_LEFT: 'DISCONNECTED_OPPONENT_LEFT',
  GAME_ENDED_BY_ERROR: 'GAME_ENDED_BY_ERROR',
} as const;
export type GameStatus = typeof GameStatus[keyof typeof GameStatus];

export type Square = string;

export interface Move extends JsonObject { // Must conform to JsonObject
  from: Square;
  to: Square;
  promotion: Exclude<PieceSymbol, typeof PieceSymbol.KING | typeof PieceSymbol.PAWN> | null; // Required, can be null
  [key: string]: JsonValue; // Index signature
}

interface CastlingRightsInner extends JsonObject { // Must conform to JsonObject
  k: boolean;
  q: boolean;
  [key: string]: JsonValue; // Index signature
}
export interface CastlingRights extends JsonObject { // Must conform to JsonObject
  w: CastlingRightsInner;
  b: CastlingRightsInner;
  [key: string]: JsonValue; // Index signature
}

export interface AppGameState {
  gameId: string | null; fen: string; currentTurn: PlayerColor; localPlayerColor: PlayerColor | null;
  opponentPeerId: string | null; isHost: boolean | null; status: GameStatus;
  castlingRights: CastlingRights; enPassantTarget: Square | null; winner: PlayerColor | 'draw' | null;
}

// --- P2P Message Payloads ---
// Object payloads must conform to JsonObject.
export interface ConnectionConfirmedPayload extends JsonObject {
  gameId: string;
  assignedColor: PlayerColor;
  opponentPeerId: string;
  startingFen: string | null; // Required, can be null
  startingTurn: PlayerColor | null; // Required, can be null
  [key: string]: JsonValue; // Index signature
}

export interface InitialGameSetupPayload extends JsonObject {
  startingFen: string;
  playerWhite: string;
  playerBlack: string;
  [key: string]: JsonValue; // Index signature
}

export interface MovePayload extends JsonObject {
  from: Square;
  to: Square;
  promotion: Exclude<PieceSymbol, typeof PieceSymbol.KING | typeof PieceSymbol.PAWN> | null; // Required, can be null
  [key: string]: JsonValue; // Index signature
}

export interface GameStateUpdatePayload extends JsonObject {
  fen: string;
  turn: PlayerColor;
  gameStatus: GameStatus;
  lastMove: Move | null; // Move conforms to JsonObject
  [key: string]: JsonValue; // Index signature
}

export interface ErrorPayload extends JsonObject {
  message: string;
  code: string | null; // Required, can be null
  [key: string]: JsonValue; // Index signature
}

// Specific P2P Message Types
export type ConnectionConfirmedMessage = P2PMessage<ConnectionConfirmedPayload>;
export type InitialGameSetupMessage = P2PMessage<InitialGameSetupPayload>;
export type MoveMessage = P2PMessage<MovePayload>;
export type GameStateUpdateMessage = P2PMessage<GameStateUpdatePayload>;
export type ErrorMessage = P2PMessage<ErrorPayload>;
export type ResignMessage = P2PMessage<null>;
export type DrawOfferMessage = P2PMessage<null>;
export type DrawAcceptMessage = P2PMessage<null>;

export type AnyP2PMessage =
  | ConnectionConfirmedMessage | InitialGameSetupMessage | MoveMessage
  | GameStateUpdateMessage | ErrorMessage | ResignMessage
  | DrawOfferMessage | DrawAcceptMessage;