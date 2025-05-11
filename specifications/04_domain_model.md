# 4. Domain Model

This section describes the core entities, their attributes, and relationships within the P2P Chess application.

## 4.1. Core Entities

### 4.1.1. `Game`
Represents the overall state of a single chess game.
*   **Attributes:**
    *   `gameId`: STRING (Unique identifier for the game session, used for P2P connection)
    *   `board`: [`Board`](#412-board) (The current state of the chessboard)
    *   `currentPlayer`: [`PlayerColor`](#421-playercolor) (Indicates whose turn it is: WHITE or BLACK)
    *   `gameStatus`: [`GameStatus`](#422-gamestatus) (e.g., IN_PROGRESS, CHECK, CHECKMATE_WHITE_WINS, CHECKMATE_BLACK_WINS, STALEMATE, DISCONNECTED)
    *   `localPlayerColor`: [`PlayerColor`](#421-playercolor) (The color of the player on this client)
    *   `remotePlayerId`: STRING (P2P ID of the opponent)
    *   `hostPlayerId`: STRING (P2P ID of the player who initiated the game)
    *   `moveHistory`: ARRAY of [`Move`](#415-move) (Optional: for replays or complex rule checks like threefold repetition, though this might be out of scope for v1)
    *   `castlingRights`: OBJECT (e.g., `{ whiteKingSide: BOOLEAN, whiteQueenSide: BOOLEAN, blackKingSide: BOOLEAN, blackQueenSide: BOOLEAN }`)
    *   `enPassantTargetSquare`: [`Square`](#414-square) or NULL (The square where an en passant capture is possible)
*   **Relationships:**
    *   Contains one [`Board`](#412-board).
    *   Associated with two players (implicitly, one local, one remote via P2P).

### 4.1.2. `Board`
Represents the 8x8 chessboard and the pieces on it.
*   **Attributes:**
    *   `squares`: ARRAY of ARRAY of ([`Piece`](#413-piece) or NULL) (A 2D array, e.g., 8x8, representing the board squares. A square can hold a Piece or be empty (NULL)).
*   **Methods (Conceptual):**
    *   `getPieceAt(square)`: Returns the piece at a given square.
    *   `setPieceAt(square, piece)`: Places a piece on a given square.
    *   `initializeDefaultSetup()`: Sets up pieces in their starting positions.
    *   `isSquareOccupied(square)`: Checks if a square has a piece.
    *   `isSquareValid(square)`: Checks if square coordinates are within board limits.

### 4.1.3. `Piece`
Represents a single chess piece.
*   **Attributes:**
    *   `type`: [`PieceType`](#423-piecetype) (e.g., PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING)
    *   `color`: [`PlayerColor`](#421-playercolor) (WHITE or BLACK)
    *   `hasMoved`: BOOLEAN (Important for castling and pawn's first move)
*   **Methods (Conceptual):**
    *   `getLegalMoves(currentSquare, board, gameStatus)`: Returns a list of valid [`Square`](#414-square)s this piece can move to, considering the current board state and game rules (check, pins etc.). This is the core of the chess logic.

### 4.1.4. `Square`
Represents a single square on the chessboard.
*   **Attributes:**
    *   `row`: INTEGER (0-7 or 1-8)
    *   `col`: INTEGER (0-7 or 'a'-'h')
*   **Methods (Conceptual):**
    *   `isEqualTo(otherSquare)`: Compares two squares.
    *   `toString()`: Returns algebraic notation (e.g., "e4").

### 4.1.5. `Move`
Represents a move made in the game.
*   **Attributes:**
    *   `fromSquare`: [`Square`](#414-square)
    *   `toSquare`: [`Square`](#414-square)
    *   `pieceMoved`: [`PieceType`](#423-piecetype)
    *   `pieceCaptured`: [`PieceType`](#423-piecetype) or NULL
    *   `promotionPiece`: [`PieceType`](#423-piecetype) or NULL (If pawn promotion occurred)
    *   `isCastlingMove`: BOOLEAN
    *   `isEnPassant`: BOOLEAN
    *   `notation`: STRING (e.g., "Nf3", "e4", "O-O") (Optional, for display or history)

## 4.2. Enumerations / Value Objects

### 4.2.1. `PlayerColor`
*   Values: `WHITE`, `BLACK`

### 4.2.2. `GameStatus`
*   Values:
    *   `AWAITING_CONNECTION`
    *   `CONNECTION_FAILED`
    *   `IN_PROGRESS`
    *   `WHITE_IN_CHECK`
    *   `BLACK_IN_CHECK`
    *   `CHECKMATE_WHITE_WINS`
    *   `CHECKMATE_BLACK_WINS`
    *   `STALEMATE_DRAW`
    *   `RESIGNATION_WHITE_WINS` (Optional)
    *   `RESIGNATION_BLACK_WINS` (Optional)
    *   `DRAW_AGREED` (Optional)
    *   `DISCONNECTED_OPPONENT_LEFT`
    *   `GAME_ENDED_BY_ERROR`

### 4.2.3. `PieceType`
*   Values: `PAWN`, `ROOK`, `KNIGHT`, `BISHOP`, `QUEEN`, `KING`

## 4.3. Data Structures (Conceptual)

*   **Board Representation:** A 2D array (e.g., `board[row][col]`) is common.
*   **Move List:** An array of [`Square`](#414-square) objects for representing legal moves of a selected piece.

## 4.4. Relationships Diagram (Conceptual - Textual)

```
Game (1) --contains--> (1) Board
Board (1) --composed of--> (64) Squares (implicitly, through its 2D array)
Square (0..1) --can hold--> (1) Piece
Game (1) --tracks turn of--> (1) PlayerColor (currentPlayer)
Game (1) --has history of--> (*) Move (optional)
Piece (1) --has--> (1) PieceType
Piece (1) --has--> (1) PlayerColor
```

This domain model provides a foundation for the data structures and logic needed for the chess application.