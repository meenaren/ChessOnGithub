# 5. P2P Connection Logic Pseudocode

This pseudocode outlines the logic for establishing a P2P connection between two players. It assumes the use of a P2P library (e.g., PeerJS) that handles low-level WebRTC details and signaling.

## 5.1. Entities Involved (from Domain Model)
*   `Game`
*   `PlayerColor`

## 5.2. Global Variables / State (Conceptual)
```pseudocode
P2P_CONNECTION_OBJECT = null // Stores the active P2P connection object from the library
LOCAL_PEER_ID = null         // The ID of the local player/peer, provided by the P2P library
REMOTE_PEER_ID = null        // The ID of the remote player/peer
CURRENT_GAME_ID = null       // The shared Game ID for the session
IS_HOST = false
GAME_INSTANCE = null         // Instance of the Game object
```

## 5.3. Initialization
```pseudocode
FUNCTION initializeP2PFramework():
    // TEST: P2P library is initialized successfully.
    // TEST: Local Peer ID is obtained from the P2P library.
    DISPLAY "Initializing connection..."
    P2P_LIBRARY.initialize(API_KEY_IF_NEEDED) // API_KEY_IF_NEEDED should be configurable, not hardcoded
    
    P2P_LIBRARY.onEvent("open", FUNCTION(id):
        LOCAL_PEER_ID = id
        DISPLAY "My Peer ID: " + LOCAL_PEER_ID
        DISPLAY "Ready to Host or Join a game."
        ENABLE HostGameButton
        ENABLE JoinGameButton
    ENDFUNCTION)

    P2P_LIBRARY.onEvent("connection", FUNCTION(connection):
        // TEST: Incoming connection is received when another peer connects.
        DISPLAY "Incoming connection request..."
        IF IS_HOST AND P2P_CONNECTION_OBJECT IS NULL:
            P2P_CONNECTION_OBJECT = connection
            REMOTE_PEER_ID = connection.peer // Get remote peer's ID
            setupP2PDataChannelListeners()
            DISPLAY "Player " + REMOTE_PEER_ID + " connected."
            // Host confirms connection, perhaps sends initial game state or color assignment
            GAME_INSTANCE.remotePlayerId = REMOTE_PEER_ID
            GAME_INSTANCE.gameStatus = GameStatus.IN_PROGRESS
            sendP2PMessage({ type: "CONNECTION_CONFIRMED", gameId: CURRENT_GAME_ID, assignedColor: PlayerColor.BLACK }) // Host is White by default
            // TEST: Host sends connection confirmation and color assignment to Joiner.
            CALL startGame(PlayerColor.WHITE) // Host is White
        ELSE:
            DISPLAY "Already in a game or not hosting. Rejecting connection."
            connection.close()
        ENDIF
    ENDFUNCTION)

    P2P_LIBRARY.onEvent("error", FUNCTION(error):
        // TEST: P2P library errors are handled and displayed.
        DISPLAY "P2P Error: " + error.message
        IF P2P_CONNECTION_OBJECT:
            P2P_CONNECTION_OBJECT.close()
        ENDIF
        P2P_CONNECTION_OBJECT = null
        GAME_INSTANCE.gameStatus = GameStatus.CONNECTION_FAILED
        DISPLAY_ERROR_MESSAGE("Connection error: " + error.message)
    ENDFUNCTION)
ENDFUNCTION
```

## 5.4. Host Game Logic
```pseudocode
FUNCTION onHostGameButtonClick():
    // TEST: Host can initiate a new game.
    // TEST: A unique Game ID is generated (using local peer ID as base).
    IS_HOST = true
    CURRENT_GAME_ID = LOCAL_PEER_ID // Simplistic Game ID; could be more robust
    GAME_INSTANCE = CREATE new Game(gameId: CURRENT_GAME_ID, localPlayerColor: PlayerColor.WHITE) // Host is White
    GAME_INSTANCE.hostPlayerId = LOCAL_PEER_ID
    GAME_INSTANCE.gameStatus = GameStatus.AWAITING_CONNECTION
    
    DISPLAY "Game Hosted. Share this Game ID with your opponent: " + CURRENT_GAME_ID
    DISPLAY "Waiting for opponent to connect..."
    DISABLE HostGameButton
    DISABLE JoinGameButton
ENDFUNCTION
```

## 5.5. Join Game Logic
```pseudocode
FUNCTION onJoinGameButtonClick():
    // TEST: Joiner can attempt to connect using a Game ID.
    INPUT gameIdToJoin = GET_USER_INPUT("Enter Game ID to Join:")
    IF gameIdToJoin IS EMPTY:
        DISPLAY_ERROR_MESSAGE("Game ID cannot be empty.")
        RETURN
    ENDIF

    CURRENT_GAME_ID = gameIdToJoin
    REMOTE_PEER_ID = gameIdToJoin // Assuming Game ID is the Host's Peer ID

    DISPLAY "Attempting to connect to game: " + REMOTE_PEER_ID
    P2P_CONNECTION_OBJECT = P2P_LIBRARY.connect(REMOTE_PEER_ID)
    
    IF P2P_CONNECTION_OBJECT IS NULL:
        DISPLAY_ERROR_MESSAGE("Failed to initiate connection. Invalid ID or P2P library error.")
        // TEST: Joiner sees an error if connection initiation fails immediately.
        RETURN
    ENDIF

    setupP2PDataChannelListeners() // Setup listeners early for "open" event from this connection
    DISABLE HostGameButton
    DISABLE JoinGameButton
ENDFUNCTION
```

## 5.6. P2P Data Channel Setup and Message Handling
```pseudocode
FUNCTION setupP2PDataChannelListeners():
    IF P2P_CONNECTION_OBJECT IS NULL:
        RETURN
    ENDIF

    P2P_CONNECTION_OBJECT.onEvent("open", FUNCTION():
        // This event fires when the data channel is ready for sending/receiving
        // TEST: Data channel opens successfully for Joiner after connecting.
        // TEST: Data channel opens successfully for Host when Joiner connects.
        DISPLAY "P2P Data channel established with " + P2P_CONNECTION_OBJECT.peer
        IF NOT IS_HOST: // Joiner side
            DISPLAY "Successfully connected to host. Waiting for game details."
            // Joiner doesn't start the game until confirmation from host
        ENDIF
    ENDFUNCTION)

    P2P_CONNECTION_OBJECT.onEvent("data", FUNCTION(data):
        // TEST: Messages from opponent are received.
        // TEST: Received move message updates the local game state.
        // TEST: Received game status message updates UI.
        PROCESS receivedP2PMessage(data)
    ENDFUNCTION)

    P2P_CONNECTION_OBJECT.onEvent("close", FUNCTION():
        // TEST: Connection close event is handled.
        DISPLAY "Connection closed with " + REMOTE_PEER_ID
        P2P_CONNECTION_OBJECT = null
        REMOTE_PEER_ID = null
        IF GAME_INSTANCE AND GAME_INSTANCE.gameStatus IS NOT (CHECKMATE OR STALEMATE):
            GAME_INSTANCE.gameStatus = GameStatus.DISCONNECTED_OPPONENT_LEFT
            DISPLAY_NOTIFICATION("Opponent disconnected.")
        ENDIF
        ENABLE HostGameButton
        ENABLE JoinGameButton
    ENDFUNCTION)

    P2P_CONNECTION_OBJECT.onEvent("error", FUNCTION(error):
        // TEST: Errors on an active connection are handled.
        DISPLAY "Connection Error: " + error.message
        IF GAME_INSTANCE AND GAME_INSTANCE.gameStatus IS NOT (CHECKMATE OR STALEMATE):
            GAME_INSTANCE.gameStatus = GameStatus.CONNECTION_FAILED
            DISPLAY_ERROR_MESSAGE("Connection error: " + error.message)
        ENDIF
        P2P_CONNECTION_OBJECT.close() // Ensure it's closed
        P2P_CONNECTION_OBJECT = null
        ENABLE HostGameButton
        ENABLE JoinGameButton
    ENDFUNCTION)
ENDFUNCTION

FUNCTION sendP2PMessage(messageObject):
    // TEST: Messages can be sent to the opponent.
    IF P2P_CONNECTION_OBJECT AND P2P_CONNECTION_OBJECT.isOpen():
        P2P_CONNECTION_OBJECT.send(messageObject)
    ELSE:
        DISPLAY_ERROR_MESSAGE("Cannot send message: No active connection.")
    ENDIF
ENDFUNCTION

FUNCTION PROCESS receivedP2PMessage(data):
    // `data` is an object, e.g., { type: "MOVE", moveData: {...} }
    //                     e.g., { type: "CONNECTION_CONFIRMED", gameId: "...", assignedColor: "BLACK" }
    //                     e.g., { type: "GAME_STATE_UPDATE", status: "CHECK" }
    //                     e.g., { type: "RESIGN" }
    
    SWITCH data.type:
        CASE "CONNECTION_CONFIRMED":
            // TEST: Joiner receives connection confirmation and color assignment.
            IF NOT IS_HOST AND data.gameId == CURRENT_GAME_ID:
                GAME_INSTANCE = CREATE new Game(gameId: data.gameId, localPlayerColor: data.assignedColor)
                GAME_INSTANCE.remotePlayerId = P2P_CONNECTION_OBJECT.peer // Host's ID
                GAME_INSTANCE.hostPlayerId = P2P_CONNECTION_OBJECT.peer
                GAME_INSTANCE.gameStatus = GameStatus.IN_PROGRESS
                CALL startGame(data.assignedColor) // Joiner is assigned a color
                DISPLAY "Game started! You are " + data.assignedColor
            ENDIF
            BREAK
        CASE "MOVE":
            // TEST: Opponent's move is correctly applied to the local game board.
            CALL gameModule.applyOpponentMove(data.moveData)
            CALL uiModule.updateBoardDisplay(GAME_INSTANCE.board)
            CALL uiModule.updateTurnIndicator(GAME_INSTANCE.currentPlayer)
            // Check for game end conditions triggered by opponent's move
            CALL gameModule.checkForGameEndConditions() 
            BREAK
        CASE "GAME_STATE_UPDATE":
            // TEST: Game state updates (like check) are reflected in the UI.
            GAME_INSTANCE.gameStatus = data.status
            CALL uiModule.displayGameStatus(data.status, data.message)
            BREAK
        // Add cases for RESIGN, DRAW_OFFER, DRAW_ACCEPT, etc. if implemented
        DEFAULT:
            DISPLAY "Received unknown P2P message type: " + data.type
    ENDSWITCH
ENDFUNCTION

// Placeholder for actual game start logic (UI setup, board rendering)
FUNCTION startGame(playerColor):
    GAME_INSTANCE.localPlayerColor = playerColor
    CALL uiModule.initializeBoard(playerColor) // e.g., orient board if needed
    CALL uiModule.updateBoardDisplay(GAME_INSTANCE.board)
    CALL uiModule.updateTurnIndicator(GAME_INSTANCE.currentPlayer)
    IF playerColor == PlayerColor.WHITE:
        DISPLAY "You are White. It's your turn."
    ELSE:
        DISPLAY "You are Black. Waiting for White's move."
    ENDIF
ENDFUNCTION
```

This pseudocode provides a high-level flow for P2P connections. `gameModule` and `uiModule` are placeholders for modules that would handle game logic and UI updates respectively.