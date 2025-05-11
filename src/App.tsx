import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import useGameConnection from './hooks/useGameConnection';
import ConnectionManager from './components/ConnectionManager';
import Board from './components/Board';
import StatusDisplay from './components/StatusDisplay';
import * as gameLogic from './modules/gameLogic';
import type { AppGameState, PlayerColor, Move as AppMove, AnyP2PMessage, GameStateUpdatePayload, MovePayload, InitialGameSetupPayload, InitialGameSetupMessage } from './utils/types';
import { P2PMessageKeyEnum, GameStatus } from './utils/types';
import type { Square } from 'chess.js';

function App() {
  const {
    peerId, opponentPeerId, isConnected, isHost, gameId, assignedColor,
    connectionStatus, hostGame, joinGame, sendGameData, receivedData, leaveGame, error
  } = useGameConnection();

  const [gameState, setGameState] = useState<AppGameState>(() => {
    const initialFen = gameLogic.initializeNewGame();
    const initialLogicState = gameLogic.getGameStatus(initialFen);
    return {
      gameId: null,
      fen: initialFen,
      currentTurn: initialLogicState.turn,
      localPlayerColor: null,
      opponentPeerId: null,
      isHost: null,
      status: GameStatus.AWAITING_CONNECTION,
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } }, // Simplified, chess.js handles internally
      enPassantTarget: null, // Simplified
      winner: null,
    };
  });

  // Effect to handle received P2P messages
  useEffect(() => {
    if (receivedData) {
      console.log("App.tsx received data:", receivedData);
      const message = receivedData as AnyP2PMessage; // Cast to our union type

      switch (message.type) {
        case P2PMessageKeyEnum.INITIAL_GAME_SETUP:
          if (!isHost) { // Joiner receives this from host
            const setupPayload = message.payload as InitialGameSetupPayload;
            const logicState = gameLogic.getGameStatus(setupPayload.startingFen);
            setGameState(prev => ({
              ...prev,
              fen: setupPayload.startingFen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              localPlayerColor: peerId === setupPayload.playerWhite ? 'w' : 'b',
              opponentPeerId: isHost ? prev.opponentPeerId : (peerId === setupPayload.playerWhite ? setupPayload.playerBlack : setupPayload.playerWhite),
            }));
          }
          break;
        case P2PMessageKeyEnum.MOVE:
          {
            const movePayload = message.payload as MovePayload;
            const appMove: AppMove = { from: movePayload.from, to: movePayload.to, promotion: movePayload.promotion }; // promotion is already Type | null
            
            // Apply opponent's move
            // Ensure it's not our own move echoing back (though Trystero sends to specific peers)
            if (gameState.localPlayerColor && gameState.currentTurn !== gameState.localPlayerColor) {
              const moveResult = gameLogic.makeMove(gameState.fen, appMove);
              if (moveResult) {
                const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
                setGameState(prev => ({
                  ...prev,
                  fen: moveResult.newFen,
                  currentTurn: newLogicState.turn,
                  status: newLogicState.appStatus,
                  winner: newLogicState.winner,
                }));
              } else {
                console.error("Received invalid move from opponent:", appMove);
                // Potentially request resync or handle error
              }
            }
          }
          break;
        case P2PMessageKeyEnum.GAME_STATE_UPDATE: // For full state sync if needed
          {
            const updatePayload = message.payload as GameStateUpdatePayload;
            const logicState = gameLogic.getGameStatus(updatePayload.fen);
            setGameState(prev => ({
              ...prev,
              fen: updatePayload.fen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              winner: logicState.winner,
            }));
          }
          break;
        case P2PMessageKeyEnum.RESIGN:
          setGameState(prev => ({
            ...prev,
            status: prev.localPlayerColor === 'w' ? GameStatus.RESIGNATION_BLACK_WINS : GameStatus.RESIGNATION_WHITE_WINS,
            winner: prev.localPlayerColor === 'w' ? 'b' : 'w',
          }));
          break;
        // Add other cases like DRAW_OFFER, DRAW_ACCEPT if implemented
      }
    }
  }, [receivedData, isHost, peerId, gameState.fen, gameState.currentTurn, gameState.localPlayerColor]);

  // Effect to update local game state based on connection status changes from useGameConnection
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      gameId: gameId,
      localPlayerColor: assignedColor, // This comes from useGameConnection after host/join logic
      opponentPeerId: opponentPeerId,
      isHost: isHost,
      status: isConnected ? (prev.status === GameStatus.AWAITING_CONNECTION || prev.status === GameStatus.SETTING_UP ? GameStatus.IN_PROGRESS : prev.status) : (opponentPeerId ? GameStatus.DISCONNECTED_OPPONENT_LEFT : GameStatus.AWAITING_CONNECTION),
    }));

    if (isConnected && isHost && opponentPeerId && gameState.status !== GameStatus.IN_PROGRESS && gameState.status !== GameStatus.WHITE_IN_CHECK && gameState.status !== GameStatus.BLACK_IN_CHECK ) { // Host initiates game setup on connection
        // This is the first time host knows opponent is connected and game can start
        const initialFen = gameLogic.initializeNewGame();
        const initialLogicState = gameLogic.getGameStatus(initialFen);
        
        setGameState(prev => ({
            ...prev,
            fen: initialFen,
            currentTurn: 'w', // Host (White) starts
            localPlayerColor: 'w', // Host is White
            status: initialLogicState.appStatus, // Should be IN_PROGRESS
            opponentPeerId: opponentPeerId, // from hook
            isHost: true,
        }));

        const setupPayload: InitialGameSetupPayload = {
            startingFen: initialFen,
            playerWhite: peerId!, // Host is White
            playerBlack: opponentPeerId!,
        };
        sendGameData({
            type: P2PMessageKeyEnum.INITIAL_GAME_SETUP,
            payload: setupPayload,
        } as InitialGameSetupMessage); // Correct cast to specific message type
    }


  }, [isConnected, isHost, gameId, assignedColor, opponentPeerId, peerId, sendGameData]);


  const handleHostGame = () => {
    const newGameId = hostGame(); // from useGameConnection
    const initialFen = gameLogic.initializeNewGame(); // Prepare initial state
    const initialLogicState = gameLogic.getGameStatus(initialFen);
    setGameState({
      gameId: newGameId,
      fen: initialFen,
      currentTurn: 'w', // White starts
      localPlayerColor: 'w', // Host is White
      opponentPeerId: null,
      isHost: true,
      status: GameStatus.AWAITING_CONNECTION, // Waiting for opponent
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
      enPassantTarget: null,
      winner: null,
    });
  };

  const handleJoinGame = (idToJoin: string) => {
    joinGame(idToJoin); // from useGameConnection
    // localPlayerColor will be set by CONNECTION_CONFIRMED from host via useGameConnection hook
    // or by INITIAL_GAME_SETUP from host
    const initialFen = gameLogic.initializeNewGame(); // Placeholder until host sends state
    setGameState(prev => ({
        ...prev,
        gameId: idToJoin,
        fen: initialFen, // Will be overwritten by host's INITIAL_GAME_SETUP
        currentTurn: 'w', // Default, will be overwritten
        isHost: false,
        status: GameStatus.SETTING_UP, // Waiting for host confirmation/setup
    }));
  };

  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, pieceString: string): boolean => {
    if (!isConnected || gameState.localPlayerColor === null || gameState.currentTurn !== gameState.localPlayerColor || gameState.status !== GameStatus.IN_PROGRESS && gameState.status !== GameStatus.WHITE_IN_CHECK && gameState.status !== GameStatus.BLACK_IN_CHECK) {
      console.log("Cannot make move: Not your turn or game not in progress.");
      return false;
    }

    // pieceString is like 'wP', 'bN'. gameLogic.makeMove needs {from, to, promotion}
    // Promotion needs to be handled if it's a pawn reaching the last rank.
    // For now, basic move without promotion UI.
    const pieceColor = pieceString[0] as PlayerColor;
    if (pieceColor !== gameState.localPlayerColor) {
        console.log("Cannot move opponent's piece.");
        return false; // Trying to move opponent's piece
    }

    const moveAttempt: AppMove = { from: sourceSquare, to: targetSquare, promotion: null }; // Add promotion as null initially
    // TODO: Add promotion handling logic here if a pawn reaches the promotion rank.
    // For now, assume no promotion or handle it in gameLogic if it can infer.

    const moveResult = gameLogic.makeMove(gameState.fen, moveAttempt);

    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        winner: newLogicState.winner,
      }));

      // Send move to opponent
      const movePayload: MovePayload = {
        from: sourceSquare,
        to: targetSquare,
        promotion: moveAttempt.promotion || null,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
      return true;
    } else {
      console.log("Invalid move attempted by local player:", moveAttempt);
      // Optionally provide feedback to the user about invalid move
      return false;
    }
  };
  
  const handleResign = () => {
    if (isConnected && gameState.status === GameStatus.IN_PROGRESS) {
        sendGameData({ type: P2PMessageKeyEnum.RESIGN, payload: null });
        setGameState(prev => ({
            ...prev,
            status: prev.localPlayerColor === 'w' ? GameStatus.RESIGNATION_WHITE_WINS : GameStatus.RESIGNATION_BLACK_WINS,
            winner: prev.localPlayerColor === 'w' ? 'b' : 'w', // Opponent wins
        }));
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess On GitHub</h1>
      </header>
      <main>
        <ConnectionManager
          peerId={peerId}
          gameId={gameState.gameId}
          isConnected={isConnected}
          isHost={gameState.isHost}
          connectionStatus={connectionStatus} // from useGameConnection
          onHostGame={handleHostGame}
          onJoinGame={handleJoinGame}
          onLeaveGame={leaveGame}
          error={error}
          opponentPeerId={gameState.opponentPeerId} // Pass down opponentPeerId
          assignedColor={gameState.localPlayerColor} // Pass down assignedColor (localPlayerColor)
        />

        {isConnected && gameState.localPlayerColor && (gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK || gameState.status.startsWith("CHECKMATE") || gameState.status.startsWith("DRAW") || gameState.status.startsWith("RESIGNATION")) && (
          <>
            <StatusDisplay
              currentTurn={gameState.currentTurn}
              gameStatus={gameState.status}
              localPlayerColor={gameState.localPlayerColor}
              opponentPeerId={gameState.opponentPeerId}
              isConnected={isConnected}
              isHost={gameState.isHost}
              gameId={gameState.gameId}
            />
            <Board
              gameFen={gameState.fen}
              onPieceDrop={handlePieceDrop}
              boardOrientation={gameState.localPlayerColor}
              arePiecesDraggable={isConnected && gameState.currentTurn === gameState.localPlayerColor && (gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK)}
            />
            {(gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK) && (
                 <button onClick={handleResign} style={{marginTop: '10px'}}>Resign</button>
            )}
          </>
        )}
        { !isConnected && gameState.status !== GameStatus.AWAITING_CONNECTION && <p>Disconnected or game ended.</p>}

      </main>
    </div>
  );
}

export default App;
