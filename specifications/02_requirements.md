# 2. Requirements

## 2.1. Functional Requirements

### 2.1.1. Game Setup & Connection
*   **FR1.1:** A player (Host) must be able to initiate a new game session.
    *   // TEST: Host initiates a game and receives a unique Game ID.
*   **FR1.2:** The system must generate a unique Game ID for the new session.
    *   // TEST: Generated Game ID is unique enough for practical purposes.
*   **FR1.3:** The Host must be able to share the Game ID with another player (Joiner).
*   **FR1.4:** The Joiner must be able to use the Game ID to connect to the Host's game session.
    *   // TEST: Joiner successfully connects to Host using a valid Game ID.
    *   // TEST: Joiner fails to connect with an invalid or non-existent Game ID.
*   **FR1.5:** The system must establish a P2P connection between the Host and Joiner.
    *   // TEST: P2P connection is established, and data can be sent between players.
*   **FR1.6:** Players should be randomly assigned or choose to play as White or Black. (Default: Host is White, Joiner is Black, or allow choice).
    *   // TEST: Colors are assigned correctly upon connection.

### 2.1.2. User Interface (UI)
*   **FR2.1:** The system must display an 8x8 chessboard.
    *   // TEST: Chessboard is rendered correctly with alternating square colors.
*   **FR2.2:** The system must display chess pieces in their correct starting positions.
    *   // TEST: All pieces are in their standard initial setup.
*   **FR2.3:** The system must visually differentiate between White and Black pieces.
*   **FR2.4:** The system must allow players to select a piece to move.
    *   // TEST: Player can click on one of their pieces.
*   **FR2.5:** The system must indicate valid moves for a selected piece. (Optional, but good for usability)
    *   // TEST: When a piece is selected, its possible legal moves are highlighted.
*   **FR2.6:** The system must allow players to make a move by selecting a destination square for the selected piece.
    *   // TEST: Player can move a selected piece to a valid target square.
*   **FR2.7:** The UI must update to reflect the new board state after each move.
    *   // TEST: Piece moves to the new square, captured piece is removed.
*   **FR2.8:** The UI must clearly indicate whose turn it is to move.
    *   // TEST: Turn indicator switches correctly after a move.
*   **FR2.9:** The UI must display notifications for game events (e.g., check, checkmate, stalemate, connection status).
    *   // TEST: "Check!" notification appears when a king is in check.

### 2.1.3. Game Logic & Rules
*   **FR3.1:** The system must enforce legal moves for all chess pieces (Pawn, Rook, Knight, Bishop, Queen, King).
    *   // TEST: Pawn can move one/two squares forward, capture diagonally.
    *   // TEST: Rook can move horizontally/vertically.
    *   // TEST: Knight moves in an L-shape.
    *   // TEST: Bishop moves diagonally.
    *   // TEST: Queen moves horizontally, vertically, or diagonally.
    *   // TEST: King moves one square in any direction.
*   **FR3.2:** The system must prevent players from moving pieces if it is not their turn.
    *   // TEST: Player B cannot move a piece when it's Player A's turn.
*   **FR3.3:** The system must implement piece capture logic.
    *   // TEST: Moving a piece to an opponent's square captures the opponent's piece.
*   **FR3.4:** The system must detect and announce "Check".
    *   // TEST: System correctly identifies when a King is under attack.
*   **FR3.5:** The system must prevent moves that would leave the player's own King in check.
    *   // TEST: Player cannot make a move that exposes their King to check.
*   **FR3.6:** The system must detect and announce "Checkmate".
    *   // TEST: System correctly identifies checkmate (King in check, no legal moves to escape).
*   **FR3.7:** The system must detect and announce "Stalemate".
    *   // TEST: System correctly identifies stalemate (King not in check, no legal moves).
*   **FR3.8:** The game must end upon checkmate or stalemate.
*   **FR3.9 (Optional):** Implement castling.
    *   // TEST: Castling (king-side and queen-side) is performed correctly under valid conditions.
*   **FR3.10 (Optional):** Implement en passant.
    *   // TEST: En passant capture is performed correctly under valid conditions.
*   **FR3.11 (Optional):** Implement pawn promotion.
    *   // TEST: Pawn reaching the opponent's back rank can be promoted (e.g., to Queen).

### 2.1.4. P2P Communication
*   **FR4.1:** Player moves must be transmitted to the opponent in real-time.
    *   // TEST: Player A's move is reflected on Player B's board almost instantly.
*   **FR4.2:** Game state information (e.g., turn changes, special game events) must be synchronized between players.
*   **FR4.3 (Optional):** Players can offer/accept a draw.
*   **FR4.4 (Optional):** Players can resign from the game.
*   **FR4.5:** The system should handle P2P connection disruptions gracefully (e.g., notify players, attempt reconnection if feasible, or end game).
    *   // TEST: If connection drops, players are notified.

## 2.2. Non-Functional Requirements

### 2.2.1. Usability
*   **NFR1.1:** The UI should be simple, intuitive, and easy to understand for novice users.
*   **NFR1.2:** Game interactions (selecting pieces, making moves) should be straightforward.
*   **NFR1.3:** Feedback for player actions (e.g., invalid move, successful move) should be clear and immediate.
*   **NFR1.4:** Instructions on how to start a game and connect with another player must be clear.

### 2.2.2. Performance
*   **NFR2.1:** Moves should appear on the opponent's board with minimal perceptible delay (e.g., < 500ms under typical network conditions for GitHub Pages P2P).
*   **NFR2.2:** UI rendering and updates should be smooth and responsive.
*   **NFR2.3:** The application should have low client-side resource consumption (CPU, memory).

### 2.2.3. Reliability
*   **NFR3.1:** The P2P connection should be reasonably stable under typical internet conditions.
*   **NFR3.2:** The game logic should be accurate and free of bugs that allow illegal moves or incorrect game outcomes.

### 2.2.4. Compatibility
*   **NFR4.1:** The application must run on modern web browsers (e.g., latest versions of Chrome, Firefox, Safari, Edge) that support WebRTC (for P2P).

### 2.2.5. Deployability
*   **NFR5.1:** The application must be deployable as static files on GitHub Pages.

### 2.2.6. Maintainability
*   **NFR6.1:** Code should be modular and well-commented to facilitate understanding and future modifications. (Though this is a spec, it implies design considerations for the eventual code).