import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import NavBar from './components/NavBar';
import useGameConnection from './hooks/useGameConnection';
import ConnectionManager from './components/ConnectionManager';
import Board from './components/Board';
import StatusDisplay from './components/StatusDisplay';
import * as gameLogic from './modules/gameLogic';
import * as p2pService from './modules/p2pService';
import type {
  AppGameState, PlayerColor, Move as AppMove, AnyP2PMessage,
  GameStateUpdatePayload, MovePayload, InitialGameSetupPayload, InitialGameSetupMessage,
  PieceSymbol as AppPieceSymbol,
  SyncGameStatePayload,
  RequestGameStateMessage as AppRequestGameStateMessage,
  SyncGameStateMessage as AppSyncGameStateMessage,
  DrawType as AppDrawType,
  ResignPayload
} from './utils/types';
import { P2PMessageKeyEnum, GameStatus, PieceSymbol, DrawType } from './utils/types';
import { Chess, type Square } from 'chess.js';

function App() {
  const {
    peerId, opponentPeerId, isConnected, isHost, gameId, assignedColor,
    connectionStatus, hostGame, joinGame, sendGameData, receivedData, leaveGame, error
  } = useGameConnection();

  const [showResignConfirmDialog, setShowResignConfirmDialog] = useState(false);
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
      isCheck: initialLogicState.isCheck,
      isCheckmate: initialLogicState.isCheckmate,
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
      enPassantTarget: null,
      winner: null,
      moveHistory: [],
      drawType: null,
    };
  });

  useEffect(() => {
    if (receivedData) {
      console.log("App.tsx received data:", receivedData);
      const message = receivedData as AnyP2PMessage;

      switch (message.type) {
        case P2PMessageKeyEnum.INITIAL_GAME_SETUP:
          if (!isHost) {
            const setupPayload = message.payload as InitialGameSetupPayload;
            const logicState = gameLogic.getGameStatus(setupPayload.startingFen);
            setGameState(prev => ({
              ...prev,
              fen: setupPayload.startingFen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              isCheck: logicState.isCheck,
              isCheckmate: logicState.isCheckmate,
              drawType: logicState.drawType,
              localPlayerColor: peerId === setupPayload.playerWhite ? 'w' : 'b',
              opponentPeerId: isHost ? prev.opponentPeerId : (peerId === setupPayload.playerWhite ? setupPayload.playerBlack : setupPayload.playerWhite),
            }));
          }
          break;
        case P2PMessageKeyEnum.MOVE:
          {
            const movePayload = message.payload as MovePayload;
            const appMove: AppMove = { from: movePayload.from, to: movePayload.to, promotion: movePayload.promotion };
            if (gameState.localPlayerColor && gameState.currentTurn !== gameState.localPlayerColor) {
              const moveResult = gameLogic.makeMove(gameState.fen, appMove);
              if (moveResult) {
                const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
                setGameState(prev => ({
                  ...prev,
                  fen: moveResult.newFen,
                  currentTurn: newLogicState.turn,
                  status: newLogicState.appStatus,
                  isCheck: newLogicState.isCheck,
                  isCheckmate: newLogicState.isCheckmate,
                  winner: newLogicState.winner,
                  drawType: newLogicState.drawType,
                  moveHistory: [...prev.moveHistory, appMove],
                }));
              } else {
                console.error("Received invalid move from opponent:", appMove);
                if (!isHost && peerId && opponentPeerId) {
                    console.log("Requesting game state from host due to invalid opponent move.");
                    sendGameData(p2pService.createRequestGameStateMessage());
                    setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
                }
              }
            }
          }
          break;
        case P2PMessageKeyEnum.GAME_STATE_UPDATE:
          {
            const updatePayload = message.payload as GameStateUpdatePayload;
            const logicState = gameLogic.getGameStatus(updatePayload.fen);
            setGameState(prev => ({
              ...prev,
              fen: updatePayload.fen,
              currentTurn: logicState.turn,
              status: logicState.appStatus,
              isCheck: logicState.isCheck,
              isCheckmate: logicState.isCheckmate,
              winner: logicState.winner,
              drawType: logicState.drawType,
            }));
          }
          break;
        case P2PMessageKeyEnum.REQUEST_GAME_STATE:
          if (isHost && opponentPeerId && peerId) {
            console.log("Host received REQUEST_GAME_STATE from opponent. Sending current state.");
            const syncMessage = p2pService.createSyncGameStateMessage(
              gameState.fen,
              gameState.currentTurn,
              gameState.status,
              gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null,
              gameState.moveHistory,
              isHost ? peerId : opponentPeerId, // playerWhiteId
              isHost ? opponentPeerId : peerId, // playerBlackId
              true // isHostInitiated
            );
            sendGameData(syncMessage);
            setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
          }
          break;
        case P2PMessageKeyEnum.SYNC_GAME_STATE:
          {
            const syncPayload = message.payload as SyncGameStatePayload;
            console.log("Received SYNC_GAME_STATE:", syncPayload);
            if (isHost && !syncPayload.isHostInitiated) {
                console.warn("Host received SYNC_GAME_STATE not initiated by host. Ignoring for now.");
                break;
            }
            const logicState = gameLogic.getGameStatus(syncPayload.fen);
            setGameState(prev => ({
              ...prev,
              fen: syncPayload.fen,
              currentTurn: syncPayload.turn, 
              status: logicState.appStatus, 
              isCheck: logicState.isCheck,
              isCheckmate: logicState.isCheckmate,
              winner: logicState.winner,
              drawType: logicState.drawType,
              moveHistory: syncPayload.moveHistory || [],
              localPlayerColor: prev.localPlayerColor || (peerId === syncPayload.playerWhiteId ? 'w' : (peerId === syncPayload.playerBlackId ? 'b' : null)),
              opponentPeerId: prev.opponentPeerId || (peerId === syncPayload.playerWhiteId ? syncPayload.playerBlackId : syncPayload.playerWhiteId),
            }));
            setTimeout(() => {
                setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZATION_SUCCESSFUL }));
                setTimeout(() => {
                    const currentLogicState = gameLogic.getGameStatus(syncPayload.fen); 
                    setGameState(prev => ({ ...prev, status: currentLogicState.appStatus, isCheck: currentLogicState.isCheck, isCheckmate: currentLogicState.isCheckmate, drawType: currentLogicState.drawType }));
                }, 1500); 
            }, 500); 
          }
          break;
        case P2PMessageKeyEnum.RESIGN:
          {
            const resignPayload = message.payload as ResignPayload;
            console.log("Received RESIGN message from opponent:", resignPayload);
            if (resignPayload && resignPayload.resigningPlayerColor) {
              const newLogicState = gameLogic.handleResignation(gameState.fen, resignPayload.resigningPlayerColor);
              setGameState(prev => ({
                ...prev,
                ...newLogicState, // Apply the full state from handleResignation
              }));
            } else {
              console.warn("Received invalid RESIGN message payload:", resignPayload);
            }
          }
          break;
      }
    }
  }, [receivedData, isHost, peerId, opponentPeerId, sendGameData, gameState.fen, gameState.currentTurn, gameState.localPlayerColor, gameState.status, gameState.moveHistory]);

  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      gameId: gameId,
      localPlayerColor: assignedColor, 
      opponentPeerId: opponentPeerId,
      isHost: isHost,
      status: prev.isCheckmate || prev.winner || prev.drawType || 
              prev.status === GameStatus.RESIGNATION_BLACK_WINS || 
              prev.status === GameStatus.RESIGNATION_WHITE_WINS ? prev.status :
              (connectionStatus === GameStatus.IN_PROGRESS && isConnected ? GameStatus.IN_PROGRESS :
              connectionStatus === GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT ? GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT :
              connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC ? GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC :
              connectionStatus === GameStatus.DISCONNECTED_OPPONENT_LEFT ? GameStatus.DISCONNECTED_OPPONENT_LEFT :
              isConnected ? (prev.status === GameStatus.AWAITING_CONNECTION || prev.status === GameStatus.SETTING_UP || prev.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL ? GameStatus.IN_PROGRESS : prev.status) :
              GameStatus.AWAITING_CONNECTION),
    }));

    if (connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC && isHost && peerId && opponentPeerId) {
      console.log("Host detected opponent reconnected. Sending SYNC_GAME_STATE.");
      const syncMessage = p2pService.createSyncGameStateMessage(
        gameState.fen,
        gameState.currentTurn,
        gameState.status, 
        gameState.moveHistory.length > 0 ? gameState.moveHistory[gameState.moveHistory.length - 1] : null,
        gameState.moveHistory,
        isHost ? peerId : opponentPeerId, 
        isHost ? opponentPeerId : peerId, 
        true 
      );
      sendGameData(syncMessage);
      setGameState(prev => ({ ...prev, status: GameStatus.RESYNCHRONIZING_GAME_STATE }));
    } else if (connectionStatus === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC && !isHost) {
        console.log("Client detected opponent reconnected. Awaiting SYNC_GAME_STATE from host.");
        setGameState(prev => ({ ...prev, status: GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC })); 
    }

    if (isConnected && isHost && opponentPeerId && gameState.status !== GameStatus.IN_PROGRESS && !gameState.moveHistory.length && (connectionStatus === GameStatus.IN_PROGRESS || (typeof connectionStatus === 'string' && connectionStatus.includes("connected")))) {
        if (gameState.fen === gameLogic.initializeNewGame() && gameState.localPlayerColor !== 'w') { 
            const initialFen = gameLogic.initializeNewGame(); 
            const initialLogicState = gameLogic.getGameStatus(initialFen);
            setGameState(prev => ({
                ...prev,
                fen: initialFen,
                currentTurn: 'w', 
                localPlayerColor: 'w', 
                status: initialLogicState.appStatus,
                isCheck: initialLogicState.isCheck,
                isCheckmate: initialLogicState.isCheckmate,
                drawType: initialLogicState.drawType,
                opponentPeerId: opponentPeerId, 
                isHost: true, 
            }));
            const setupPayload: InitialGameSetupPayload = {
                startingFen: initialFen,
                playerWhite: peerId!, 
                playerBlack: opponentPeerId!,
            };
            sendGameData({
                type: P2PMessageKeyEnum.INITIAL_GAME_SETUP,
                payload: setupPayload,
            } as InitialGameSetupMessage);
        }
    }
  }, [isConnected, isHost, gameId, assignedColor, opponentPeerId, peerId, sendGameData, connectionStatus, gameState.fen, gameState.currentTurn, gameState.status, gameState.moveHistory]);

  const handleHostGame = () => {
    const newGameId = hostGame(); 
    const initialFen = gameLogic.initializeNewGame();
    const initialLogicState = gameLogic.getGameStatus(initialFen);
    setGameState({
      gameId: newGameId,
      fen: initialFen,
      currentTurn: 'w',
      localPlayerColor: 'w', 
      opponentPeerId: null, 
      isHost: true,
      status: GameStatus.AWAITING_CONNECTION,
      isCheck: initialLogicState.isCheck,
      isCheckmate: initialLogicState.isCheckmate,
      drawType: initialLogicState.drawType,
      castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } }, 
      enPassantTarget: null, 
      winner: null, 
      moveHistory: [], 
    });
  };

  const handleJoinGame = (idToJoin: string) => {
    joinGame(idToJoin); 
    const initialFen = gameLogic.initializeNewGame(); 
    setGameState(prev => ({
        ...prev,
        gameId: idToJoin,
        fen: initialFen, 
        currentTurn: 'w', 
        isHost: false,
        status: GameStatus.SETTING_UP, 
        localPlayerColor: null, 
        opponentPeerId: null, 
        castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
        enPassantTarget: null,
        winner: null,
        moveHistory: [],
        isCheck: false,
        isCheckmate: false,
        drawType: null,
    }));
  };

  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, pieceString: string): boolean => {
    if (!isConnected || gameState.localPlayerColor === null || gameState.currentTurn !== gameState.localPlayerColor || 
        !(gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK || gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL)
    ) {
      console.log("Cannot make move: Not your turn, game not in progress, or not connected.", {
        isConnected,
        localPlayerColor: gameState.localPlayerColor,
        currentTurn: gameState.currentTurn,
        status: gameState.status
      });
      return false;
    }
    const chessForValidation = new Chess(gameState.fen);
    const pieceOnSource = chessForValidation.get(sourceSquare);
    if (!pieceOnSource || pieceOnSource.color !== gameState.localPlayerColor) {
        console.log("Cannot move: Piece on source square is not yours or doesn't exist.", { sourceSquare, pieceOnSource, localColor: gameState.localPlayerColor });
        return false;
    }

    const isPawn = pieceOnSource.type === PieceSymbol.PAWN;
    const promotionRank = gameState.localPlayerColor === 'w' ? '8' : '1';
    const isPromotion = isPawn && targetSquare[1] === promotionRank;

    if (isPromotion) {
      console.log("Promotion move detected, should be handled by PromotionChoice component via Board.");
      return false; 
    }

    const moveAttempt: AppMove = { from: sourceSquare, to: targetSquare, promotion: null };
    const moveResult = gameLogic.makeMove(gameState.fen, moveAttempt);

    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        isCheck: newLogicState.isCheck,
        isCheckmate: newLogicState.isCheckmate,
        winner: newLogicState.winner,
        drawType: newLogicState.drawType,
        moveHistory: [...prev.moveHistory, moveAttempt],
      }));
      const movePayload: MovePayload = {
        from: sourceSquare,
        to: targetSquare,
        promotion: null,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
      return true;
    } else {
      console.log("Invalid non-promotion move attempted by local player:", moveAttempt, "FEN:", gameState.fen);
      return false;
    }
  };

  const onBoardPromotionPieceSelect = (
    selectedPromotionPiece?: string, 
    promoteFromSquare?: Square,
    promoteToSquare?: Square
  ): boolean => {
    if (!isConnected || gameState.localPlayerColor === null || gameState.currentTurn !== gameState.localPlayerColor ||
        !(gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK || gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL)) {
      console.log("Cannot complete promotion: Not your turn or game not in appropriate state.");
      return false;
    }
    if (!promoteFromSquare || !promoteToSquare || !selectedPromotionPiece || selectedPromotionPiece.length !== 2) {
      console.error("Promotion selection data incomplete or malformed:", { selectedPromotionPiece, promoteFromSquare, promoteToSquare });
      return false;
    }

    const promotionPieceType = selectedPromotionPiece.charAt(1).toLowerCase() as Exclude<AppPieceSymbol, 'p' | 'k'>;
    const moveWithPromotion: AppMove = {
      from: promoteFromSquare,
      to: promoteToSquare,
      promotion: promotionPieceType,
    };

    console.log("Attempting promotion move via onBoardPromotionPieceSelect:", moveWithPromotion);
    const moveResult = gameLogic.makeMove(gameState.fen, moveWithPromotion);

    if (moveResult) {
      const newLogicState = gameLogic.getGameStatus(moveResult.newFen);
      setGameState(prev => ({
        ...prev,
        fen: moveResult.newFen,
        currentTurn: newLogicState.turn,
        status: newLogicState.appStatus,
        isCheck: newLogicState.isCheck,
        isCheckmate: newLogicState.isCheckmate,
        winner: newLogicState.winner,
        drawType: newLogicState.drawType,
        moveHistory: [...prev.moveHistory, moveWithPromotion],
      }));
      const movePayload: MovePayload = {
        from: promoteFromSquare,
        to: promoteToSquare,
        promotion: promotionPieceType,
      };
      sendGameData({ type: P2PMessageKeyEnum.MOVE, payload: movePayload });
      return true;
    } else {
      console.error("Error completing promotion move via onBoardPromotionPieceSelect:", moveWithPromotion, "FEN:", gameState.fen);
      return false;
    }
  };

  const handleResignClick = () => {
    if (gameState.status === GameStatus.IN_PROGRESS || gameState.status === GameStatus.WHITE_IN_CHECK || gameState.status === GameStatus.BLACK_IN_CHECK) {
      setShowResignConfirmDialog(true);
    } else {
      console.log("Cannot resign: Game not in a resignable state.");
    }
  };

  const handleConfirmResign = () => {
    setShowResignConfirmDialog(false);
    if (gameState.localPlayerColor && isConnected) {
      // Send P2P message
      const resignMessage = p2pService.createResignMessage(gameState.localPlayerColor);
      sendGameData(resignMessage);

      // Update local game state immediately
      const newLogicState = gameLogic.handleResignation(gameState.fen, gameState.localPlayerColor);
      setGameState(prev => ({
        ...prev,
        ...newLogicState,
      }));
      console.log(`Player ${gameState.localPlayerColor} resigned. Local state updated.`);
    } else {
      console.warn("Cannot resign: No local player color or not connected.");
    }
  };

  const handleCancelResign = () => {
    setShowResignConfirmDialog(false);
  };
  

  const getGameDisplayStatusForNavBar = (
    gs: AppGameState,
    localPlayerColor: PlayerColor | null,
  ): string => {
    let turnIndicator = '';
    const turnColorText = gs.currentTurn === 'w' ? 'White' : 'Black';

    const isGameEffectivelyOver = gs.isCheckmate || !!gs.winner || !!gs.drawType ||
                                gs.status === GameStatus.RESIGNATION_BLACK_WINS ||
                                gs.status === GameStatus.RESIGNATION_WHITE_WINS;

    if (gs.currentTurn && !isGameEffectivelyOver) {
      const isMyTurn = localPlayerColor === gs.currentTurn;
      turnIndicator = isMyTurn ? `Your turn (${turnColorText})` : `${turnColorText}'s turn`;
    }

    if (gs.isCheckmate) {
      const winnerColorText = gs.winner === 'w' ? 'White' : 'Black';
      return `Checkmate! ${winnerColorText} wins!`;
    }
    if (gs.drawType) {
      switch (gs.drawType) {
        case DrawType.STALEMATE: return 'Draw by Stalemate!';
        case DrawType.THREEFOLD_REPETITION: return 'Draw by Threefold Repetition!';
        case DrawType.INSUFFICIENT_MATERIAL: return 'Draw by Insufficient Material!';
        case DrawType.FIFTY_MOVE_RULE: return 'Draw by Fifty-Move Rule!';
        default: return 'Game Drawn!'; 
      }
    }
     if (gs.winner === 'draw') { 
        switch (gs.status) {
            case GameStatus.STALEMATE_DRAW: return 'Draw by Stalemate!';
            case GameStatus.DRAW_BY_THREEFOLD_REPETITION: return 'Draw by Threefold Repetition!';
            case GameStatus.DRAW_BY_FIFTY_MOVE_RULE: return 'Draw by Fifty-Move Rule!';
            case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL: return 'Draw by Insufficient Material!';
            case GameStatus.DRAW_AGREED: return 'Draw Agreed.';
            default: return 'Game Drawn!';
        }
    }
    if (gs.status === GameStatus.RESIGNATION_WHITE_WINS) return localPlayerColor === 'w' ? 'You resigned. Black wins.' : 'Opponent resigned. White wins!';
    if (gs.status === GameStatus.RESIGNATION_BLACK_WINS) return localPlayerColor === 'b' ? 'You resigned. White wins.' : 'Opponent resigned. Black wins!';
    
    if (gs.isCheck && !isGameEffectivelyOver) return `Check! ${turnIndicator}`;
    if (turnIndicator) return turnIndicator;

    if (gs.status === GameStatus.AWAITING_CONNECTION || gs.status === GameStatus.SETTING_UP) {
        return "Waiting for game to start...";
    }
    if (gs.status === GameStatus.RESYNCHRONIZING_GAME_STATE || gs.status === GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC) {
        return "Synchronizing...";
    }
     if (gs.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL && !isGameEffectivelyOver) { 
        return `Game Synced! ${turnIndicator || (gs.currentTurn ? `${gs.currentTurn === 'w' ? 'White' : 'Black'}'s turn` : '') }`;
    }
    if (gs.status === GameStatus.IN_PROGRESS && !isGameEffectivelyOver && gs.currentTurn) { 
       return `${gs.currentTurn === 'w' ? 'White' : 'Black'}'s turn`;
    }
    if (gs.status === GameStatus.DISCONNECTED_OPPONENT_LEFT) return "Opponent disconnected.";
    if (gs.status === GameStatus.GAME_ENDED_BY_ERROR) return "Game ended due to an error.";

    return 'Loading game...'; 
  };

  const getNavBarDisplayStatus = ( 
    currentAppGameStatus: GameStatus, 
    hookP2PStatus: GameStatus,      
    isConnectedToPeer: boolean,     
    currentRoomId: string | null,
    currentOpponentId: string | null,
    localColor: PlayerColor | null 
  ): string => {
    if (!currentRoomId) return "Not in a game";

    if (!isConnectedToPeer || !currentOpponentId) { 
      switch (hookP2PStatus) {
        case GameStatus.AWAITING_CONNECTION: return "Waiting for opponent...";
        case GameStatus.SETTING_UP: return "Setting up room...";
        case GameStatus.CONNECTION_FAILED: return "Connection Failed";
        default: return "Establishing Connection...";
      }
    }
    
    switch (currentAppGameStatus) {
      case GameStatus.IN_PROGRESS:
      case GameStatus.WHITE_IN_CHECK:
      case GameStatus.BLACK_IN_CHECK:
        return "Connected"; 
      
      case GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT:
        return "Reconnecting...";
      case GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC:
        return "Opponent reconnected, syncing...";
      case GameStatus.RESYNCHRONIZING_GAME_STATE:
        return "Syncing game...";
      case GameStatus.RESYNCHRONIZATION_SUCCESSFUL:
        return "Game Synced"; 
      
      case GameStatus.DISCONNECTED_OPPONENT_LEFT:
        return "Opponent Left";
      case GameStatus.CHECKMATE_WHITE_WINS: 
      case GameStatus.CHECKMATE_BLACK_WINS:
      case GameStatus.RESIGNATION_WHITE_WINS:
      case GameStatus.RESIGNATION_BLACK_WINS:
      case GameStatus.STALEMATE_DRAW:
      case GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL:
      case GameStatus.DRAW_BY_THREEFOLD_REPETITION:
      case GameStatus.DRAW_BY_FIFTY_MOVE_RULE:
      case GameStatus.DRAW_AGREED:
        return "Game Over"; 
      
      case GameStatus.GAME_ENDED_BY_ERROR:
        return "Error";

      default:
        return "Connected"; 
    }
  };

const gameOverStatuses: readonly GameStatus[] = [
  GameStatus.RESIGNATION_WHITE_WINS,
  GameStatus.RESIGNATION_BLACK_WINS,
  GameStatus.STALEMATE_DRAW,
  GameStatus.DRAW_BY_THREEFOLD_REPETITION,
  GameStatus.DRAW_BY_FIFTY_MOVE_RULE,
  GameStatus.DRAW_BY_INSUFFICIENT_MATERIAL,
  GameStatus.DRAW_AGREED,
  GameStatus.GAME_ENDED_BY_ERROR,
  GameStatus.DISCONNECTED_OPPONENT_LEFT,
  GameStatus.CHECKMATE_BLACK_WINS,
  GameStatus.CHECKMATE_WHITE_WINS,
] as const;

const isGameOver = gameState.isCheckmate ||
                   !!gameState.winner ||
                   !!gameState.drawType ||
                   gameOverStatuses.includes(gameState.status);

  const navBarConnectionStatusDisplay = getNavBarDisplayStatus(gameState.status, connectionStatus, isConnected, gameId, opponentPeerId, gameState.localPlayerColor);
  const navBarGameDisplayStatus = getGameDisplayStatusForNavBar(gameState, gameState.localPlayerColor);

  const showMainGameComponents = isConnected && opponentPeerId && gameState.localPlayerColor && 
                                 (gameState.status === GameStatus.IN_PROGRESS || 
                                  gameState.status === GameStatus.WHITE_IN_CHECK || 
                                  gameState.status === GameStatus.BLACK_IN_CHECK ||
                                  gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL || 
                                  isGameOver); 

  return (
    <div className="App">
      <NavBar
        connectionStatusDisplay={navBarConnectionStatusDisplay}
        gameId={gameId}
        peerId={peerId}
        isHost={isHost ?? false} 
        opponentPeerId={opponentPeerId}
        rawConnectionStatus={connectionStatus} 
        gameDisplayStatus={navBarGameDisplayStatus}
        currentTurn={gameState.currentTurn}
        isCheck={gameState.isCheck}
        localPlayerColor={gameState.localPlayerColor}
        isGameOver={isGameOver}
        onResignConfirm={handleConfirmResign} // Changed from handleResignConfirm
      />
      <main className="app-main-content">
        <div className="content-wrapper">
          <div className="content-section connection-manager-section">
            <ConnectionManager
              peerId={peerId}
              gameId={gameId}
              isConnected={isConnected}
              isHost={isHost}
              onHostGame={handleHostGame}
              onJoinGame={handleJoinGame}
              onLeaveGame={leaveGame}
              error={error}
              connectionStatus={connectionStatus}
              opponentPeerId={gameState.opponentPeerId}
              assignedColor={gameState.localPlayerColor}
            />
          </div>

          {showMainGameComponents && (
            <React.Fragment>
              <div className="content-section game-area">
                <StatusDisplay
                    gameStatus={gameState.status} 
                    currentTurn={gameState.currentTurn}
                    localPlayerColor={gameState.localPlayerColor}
                    isConnected={isConnected} 
                    isCheck={gameState.isCheck}
                    isCheckmate={gameState.isCheckmate}
                    winner={gameState.winner}
                    drawType={gameState.drawType}
                    opponentPeerId={gameState.opponentPeerId}
                    isHost={gameState.isHost}
                    gameId={gameState.gameId}
                />
                <div className="board-container"> 
                  <Board
                    gameFen={gameState.fen}
                    onPieceDrop={handlePieceDrop} 
                    boardOrientation={gameState.localPlayerColor || 'w'} 
                    arePiecesDraggable={ 
                      isConnected &&
                      gameState.localPlayerColor === gameState.currentTurn && 
                      !isGameOver && 
                      (gameState.status === GameStatus.IN_PROGRESS ||
                        gameState.status === GameStatus.WHITE_IN_CHECK ||
                        gameState.status === GameStatus.BLACK_IN_CHECK ||
                        gameState.status === GameStatus.RESYNCHRONIZATION_SUCCESSFUL) 
                    }
                    onPromotionPieceSelect={onBoardPromotionPieceSelect}
                  />
                </div>
              </div>
              {/* Game controls like resign, draw offer */}
              {isConnected && !isGameOver &&
               (gameState.status === GameStatus.IN_PROGRESS ||
                gameState.status === GameStatus.WHITE_IN_CHECK ||
                gameState.status === GameStatus.BLACK_IN_CHECK) &&
                (
                <div className="content-section game-controls text-center">
                  <button onClick={handleResignClick} className="game-button">Resign</button>
                  {/* <button className="game-button">Offer Draw</button> */}
                </div>
              )}

              {showResignConfirmDialog && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <h3>Resign Game?</h3>
                    <p>Are you sure you want to resign? This will result in a loss.</p>
                    <div className="modal-actions">
                      <button onClick={handleConfirmResign} className="game-button confirm">Confirm</button>
                      <button onClick={handleCancelResign} className="game-button cancel">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          )}
          
          {!showMainGameComponents && (
             <div className="content-section text-center">
                  <p>
                    {peerId ? `Your ID: ${peerId}. ` : 'Initializing... '}
                    {gameState.gameId && !isConnected && !opponentPeerId ? `Attempting to join Game ID: ${gameState.gameId}. Please wait...` : 
                    !gameState.gameId && !isConnected ? 'Host or join a game to start.' : 
                    isConnected && !opponentPeerId && gameState.isHost ? 'Waiting for opponent to join...' :
                    'Setting up game...'}
                  </p>
                  <StatusDisplay 
                    gameStatus={gameState.status}
                    currentTurn={gameState.currentTurn}
                    localPlayerColor={gameState.localPlayerColor}
                    isConnected={isConnected}
                    isCheck={gameState.isCheck}
                    isCheckmate={gameState.isCheckmate}
                    winner={gameState.winner}
                    drawType={gameState.drawType}
                    opponentPeerId={gameState.opponentPeerId}
                    isHost={gameState.isHost}
                    gameId={gameState.gameId}
                  />
             </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
