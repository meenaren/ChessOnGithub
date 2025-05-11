import { useState, useEffect, useCallback, useRef } from 'react';
import { joinRoom, type Room as TrysteroRoom } from 'trystero';
import { GameStatus, P2PMessageKeyEnum } from '../utils/types'; // Added GameStatus
import type {
  PlayerColor, ConnectionConfirmedPayload, JsonValue, AnyP2PMessage,
  ConnectionConfirmedMessage,
  RequestGameStatePayload, // Added
  SyncGameStatePayload,    // Added
  RequestGameStateMessage, // Added
  SyncGameStateMessage     // Added
} from '../utils/types';

const APP_ID = 'chess-on-github-app-v1'; // Unique ID for your application

// More specific local type for the Trystero room instance
interface AppRoom extends TrysteroRoom {
  selfId: string;
  // getPeers: () => Record<string, RTCPeerConnection>; // Already in TrysteroRoom
  // makeAction: <T extends Record<string, JsonValue>>(namespace: string) => [(payload: T, to?: string | string[] | undefined) => void, (callback: (payload: T, peerId: string) => void) => () => void]; // Already in TrysteroRoom
  // onPeerJoin: (callback: (peerId: string) => void) => () => void; // Already in TrysteroRoom
  // onPeerLeave: (callback: (peerId: string) => void) => () => void; // Already in TrysteroRoom
  // leave: () => void; // Already in TrysteroRoom
}


export interface UseGameConnectionReturn {
  peerId: string | null;
  opponentPeerId: string | null;
  isConnected: boolean;
  isHost: boolean | null;
  gameId: string | null;
  assignedColor: PlayerColor | null;
  connectionStatus: string;
  hostGame: () => string;
  joinGame: (roomId: string) => void;
  sendGameData: (data: AnyP2PMessage) => void;
  receivedData: AnyP2PMessage | null;
  leaveGame: () => void;
  error: string | null;
}

const generateRoomId = () => Math.random().toString(36).substring(2, 9);

const useGameConnection = (): UseGameConnectionReturn => {
  const roomInstanceRef = useRef<AppRoom | null>(null); 
  const [peerId, setPeerId] = useState<string | null>(null);
  const [opponentPeerId, setOpponentPeerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [assignedColor, setAssignedColor] = useState<PlayerColor | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GameStatus | string>(GameStatus.AWAITING_CONNECTION); // Use GameStatus enum
  const [receivedData, setReceivedData] = useState<AnyP2PMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionsRef = useRef<{
    send: ((data: AnyP2PMessage, to?: string | string[] | undefined) => void) | null;
    receive: ((callback: (data: AnyP2PMessage, peerId: string) => void) => void) | null;
  }>({ send: null, receive: null });
  const reconnectAttemptTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (roomInstanceRef.current) {
      roomInstanceRef.current.leave();
    }
    roomInstanceRef.current = null;
    actionsRef.current = { send: null, receive: null };
    if (reconnectAttemptTimerRef.current) {
      clearTimeout(reconnectAttemptTimerRef.current);
      reconnectAttemptTimerRef.current = null;
    }
    setPeerId(null);
    setOpponentPeerId(null);
    setIsConnected(false);
    setIsHost(null);
    setAssignedColor(null);
    setConnectionStatus(GameStatus.AWAITING_CONNECTION);
    setReceivedData(null);
    setError(null);
  }, []);

  const initializeRoom = useCallback((currentRoomId: string, hostStatus: boolean) => {
    if (roomInstanceRef.current) {
      cleanup(); 
    }

    setConnectionStatus(hostStatus ? GameStatus.SETTING_UP : `Attempting to join game ID: ${currentRoomId}...`);
    setError(null);
    if (reconnectAttemptTimerRef.current) {
      clearTimeout(reconnectAttemptTimerRef.current);
      reconnectAttemptTimerRef.current = null;
    }

    // Cast the result of joinRoom to our more specific AppRoom type
    const currentRoom = joinRoom({ appId: APP_ID }, currentRoomId) as AppRoom;
    roomInstanceRef.current = currentRoom; 
    setPeerId(currentRoom.selfId); 
    setGameId(currentRoomId);
    setIsHost(hostStatus);

    const [send, receive] = currentRoom.makeAction<AnyP2PMessage>('gameData');
    actionsRef.current = { send, receive };

    receive((data, senderId) => {
      console.log('Data received:', data, 'from:', senderId);
      setReceivedData(data);
      setOpponentPeerId(senderId); 

      if (data.type === P2PMessageKeyEnum.CONNECTION_CONFIRMED && !hostStatus) {
        const payload = data.payload as ConnectionConfirmedPayload | null; // Type assertion is fine after checking data.type
        if (payload) {
            setAssignedColor(payload.assignedColor);
            setOpponentPeerId(payload.opponentPeerId);
            setIsConnected(true);
            setConnectionStatus(GameStatus.IN_PROGRESS); // Or a more specific "Connected" status
            // UI can derive "You are White/Black" from assignedColor
        }
      }
    });

    currentRoom.onPeerJoin((joinedPeerId) => {
      console.log('Peer joined:', joinedPeerId);
      const previousOpponentId = opponentPeerId; // Capture previous opponent ID
      setOpponentPeerId(joinedPeerId);

      if (hostStatus) {
        setIsConnected(true); // Mark as connected since a peer is present
        if (previousOpponentId === joinedPeerId) {
          // This is a rejoin of the same opponent
          setConnectionStatus(GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC);
          // Host will be notified by App.tsx to send SYNC_GAME_STATE
        } else {
          // This is a new opponent (or first connection)
          // const playerColorForOpponent: PlayerColor = 'b'; // This was correctly defined before, re-adding
          setAssignedColor('w');
          setConnectionStatus(GameStatus.IN_PROGRESS); // Or "Opponent connected"
           // App.tsx will send INITIAL_GAME_SETUP
        }
        
        // Send connection confirmed in both cases (new or rejoin)
        // For rejoin, this re-confirms the connection; App.tsx handles game state sync
        const playerColorForOpponent: PlayerColor = 'b'; // Define it here to be in scope for payloadForJoiner
        const payloadForJoiner: ConnectionConfirmedPayload = {
            gameId: currentRoomId,
            assignedColor: playerColorForOpponent,
            opponentPeerId: currentRoom.selfId,
            startingFen: null, // Add missing required properties
            startingTurn: null   // Add missing required properties
        };

        actionsRef.current.send?.({
          type: P2PMessageKeyEnum.CONNECTION_CONFIRMED, // Use enum for type safety
          payload: payloadForJoiner,
        } as ConnectionConfirmedMessage, joinedPeerId);

      } else { // Client's perspective on peer join
        if (isConnected && opponentPeerId === joinedPeerId) {
          // This means the host (opponent) we were connected to has rejoined
          setConnectionStatus(GameStatus.OPPONENT_RECONNECTED_AWAITING_SYNC);
          // Client might send REQUEST_GAME_STATE if no SYNC_GAME_STATE is received soon
        } else if (!isConnected) {
           // Initial connection to a room, waiting for host's CONNECTION_CONFIRMED
          setConnectionStatus(`Connected to room. Waiting for host confirmation...`);
        }
      }
    });

    currentRoom.onPeerLeave((leftPeerId) => {
      console.log('Peer left:', leftPeerId);
      if (leftPeerId === opponentPeerId || opponentPeerId === null) { // Handle if opponentPeerId was already nulled by a quick leave/rejoin
        setIsConnected(false);
        setConnectionStatus(GameStatus.CONNECTION_LOST_ATTEMPTING_RECONNECT);
        // Don't null opponentPeerId immediately if we expect a quick rejoin for resync
        // setOpponentPeerId(null); // Keep previous opponent ID for potential resync identification

        if (!isHost && gameId && roomInstanceRef.current) { // Only client attempts auto-reconnect
          if (reconnectAttemptTimerRef.current) {
            clearTimeout(reconnectAttemptTimerRef.current);
          }
          console.log('Attempting to reconnect in 5 seconds...');
          reconnectAttemptTimerRef.current = setTimeout(() => {
            if (roomInstanceRef.current && gameId && !isConnected) { // Check again before trying
              console.log('Executing reconnection attempt...');
              // We need to ensure that initializeRoom can be called again safely.
              // Trystero's joinRoom might handle this if the room still exists.
              // For a more robust solution, a full cleanup and re-init might be needed,
              // or Trystero's internal handling might suffice.
              // Let's assume for now that calling initializeRoom again is a valid way to attempt rejoining.
              // This is a simplified auto-reconnect.
              // initializeRoom(gameId, false); // This might create issues if not handled carefully.
              // For now, we'll just set the status and let App.tsx decide on manual re-join or resync prompts.
              // A more robust auto-reconnect would require careful state management.
              // Let's change status to prompt user or allow App.tsx to handle.
              setConnectionStatus(GameStatus.DISCONNECTED_OPPONENT_LEFT); // More specific status
              setError('Connection lost. Please try rejoining or wait for host.');
            }
          }, 5000);
        } else if (isHost) {
            // Host just waits for the client to rejoin.
            setConnectionStatus(GameStatus.DISCONNECTED_OPPONENT_LEFT); // Or a "Waiting for opponent to reconnect"
        }
      }
    });

  }, [cleanup, gameId, isHost, opponentPeerId, isConnected]); // Added dependencies


  const hostGame = useCallback(() => {
    const newRoomId = generateRoomId();
    initializeRoom(newRoomId, true);
    return newRoomId;
  }, [initializeRoom]);

  const joinGame = useCallback((roomIdToJoin: string) => {
    if (!roomIdToJoin.trim()) {
      setError("Game ID cannot be empty.");
      setConnectionStatus(GameStatus.AWAITING_CONNECTION);
      return;
    }
    initializeRoom(roomIdToJoin, false);
  }, [initializeRoom]);

  const sendGameData = useCallback((data: AnyP2PMessage) => {
    if (actionsRef.current.send && opponentPeerId) {
      actionsRef.current.send(data, opponentPeerId);
    } else if (actionsRef.current.send && isHost && roomInstanceRef.current && Object.keys(roomInstanceRef.current.getPeers()).length > 0) {
      const peers = roomInstanceRef.current.getPeers();
      const firstOpponentId = Object.keys(peers)[0];
      if(firstOpponentId) {
        setOpponentPeerId(firstOpponentId);
        actionsRef.current.send(data, firstOpponentId);
      } else {
        console.error('Cannot send data: No opponent connected.');
        setError('Cannot send data: No opponent connected.');
      }
    }
     else {
      console.error('Cannot send data: Connection not established or no send action.');
      setError('Cannot send data: Connection not established.');
    }
  }, [opponentPeerId, isHost]);

  const leaveGame = useCallback(() => {
    cleanup();
    setGameId(null); 
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    peerId,
    opponentPeerId,
    isConnected,
    isHost,
    gameId,
    assignedColor,
    connectionStatus,
    hostGame,
    joinGame,
    sendGameData,
    receivedData,
    leaveGame,
    error,
  };
};

export default useGameConnection;