import { supabase, refreshSession } from '@/integrations/supabase/client';

// Configuration
const HEARTBEAT_INTERVAL = 4 * 60 * 1000; // 4 minutes
const CONNECTION_CHECK_INTERVAL = 60 * 1000; // 1 minute
const MAX_RECONNECT_ATTEMPTS = 5;

// Connection state
let isOnline = true;
let reconnectAttempts = 0;
let heartbeatInterval: number | null = null;
let connectionCheckInterval: number | null = null;
let registeredCallbacks: (() => void)[] = [];

/**
 * Sends a heartbeat to the server to keep the connection alive
 */
const sendHeartbeat = async () => {
  try {
    // Simple query to keep connection alive
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (count !== undefined) {
      console.log('Heartbeat: Connection alive');
      isOnline = true;
      reconnectAttempts = 0;
    }
  } catch (error) {
    console.warn('Heartbeat failed:', error);
    isOnline = false;
    attemptReconnect();
  }
};

/**
 * Attempts to reconnect to Supabase
 */
const attemptReconnect = async () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached');
    return;
  }

  reconnectAttempts++;

  console.log(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

  try {
    // Refresh the auth session
    const { data, error } = await refreshSession();
    
    if (error) {
      console.error('Session refresh failed:', error);
      return;
    }
    
    if (data?.session) {
      // Reconnect to Realtime channels
      resetChannels();
      
      console.log('Reconnection successful');
      isOnline = true;
      reconnectAttempts = 0;
      
      // Trigger callbacks
      if (registeredCallbacks.length > 0) {
        console.log('Executing reconnection callbacks');
        registeredCallbacks.forEach(callback => callback());
      }
    }
  } catch (error) {
    console.error('Reconnection error:', error);
  }
};

/**
 * Resets all Supabase Realtime channels
 */
const resetChannels = () => {
  try {
    // Remove all existing channels
    supabase.removeAllChannels();
    console.log('All Realtime channels reset');
  } catch (error) {
    console.error('Error resetting channels:', error);
  }
};

/**
 * Check connection status
 */
const checkConnection = async () => {
  if (!isOnline) {
    attemptReconnect();
    return;
  }

  try {
    // Simple query to check if we're still connected
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error || count === undefined) {
      console.warn('Connection check failed:', error);
      isOnline = false;
      attemptReconnect();
    }
  } catch (error) {
    console.warn('Connection check error:', error);
    isOnline = false;
    attemptReconnect();
  }
};

/**
 * Initializes the connection manager
 */
export const initConnectionManager = () => {
  // Initialize online listener
  window.addEventListener('online', () => {
    console.log('Browser reported online status');
    isOnline = true;
    attemptReconnect();
  });

  window.addEventListener('offline', () => {
    console.log('Browser reported offline status');
    isOnline = false;
  });

  // Set up heartbeat interval
  if (heartbeatInterval === null) {
    heartbeatInterval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    console.log('Heartbeat started with interval:', HEARTBEAT_INTERVAL / 1000, 'seconds');
  }

  // Set up connection check interval
  if (connectionCheckInterval === null) {
    connectionCheckInterval = window.setInterval(checkConnection, CONNECTION_CHECK_INTERVAL);
    console.log('Connection check started with interval:', CONNECTION_CHECK_INTERVAL / 1000, 'seconds');
  }

  // Initial heartbeat
  sendHeartbeat();

  return {
    /**
     * Registers a callback to be executed on successful reconnection
     */
    onReconnect: (callback: () => void) => {
      registeredCallbacks.push(callback);
    },
    
    /**
     * Manually triggers a reconnection attempt
     */
    reconnect: () => {
      attemptReconnect();
    },
    
    /**
     * Returns the current connection status
     */
    isOnline: () => isOnline,
    
    /**
     * Manually triggers a heartbeat
     */
    sendHeartbeat,
    
    /**
     * Cleans up intervals when component unmounts
     */
    cleanup: () => {
      if (heartbeatInterval !== null) {
        window.clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      if (connectionCheckInterval !== null) {
        window.clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
      }
      
      registeredCallbacks = [];
      console.log('Connection manager cleaned up');
    }
  };
};

// Expose a singleton instance
export const connectionManager = initConnectionManager(); 