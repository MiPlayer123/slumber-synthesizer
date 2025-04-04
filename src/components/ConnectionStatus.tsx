import { useEffect, useState } from 'react';
import { connectionManager } from '@/services/connectionManager';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(connectionManager.isOnline());
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [reconnecting, setReconnecting] = useState<boolean>(false);

  useEffect(() => {
    // Check connection status periodically
    const interval = setInterval(() => {
      const online = connectionManager.isOnline();
      setIsOnline(online);
      setShowBanner(!online); // Show banner only when offline
    }, 2000);

    // Register a reconnect callback
    connectionManager.onReconnect(() => {
      setIsOnline(true);
      setShowBanner(false);
      setReconnecting(false);
    });

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleReconnect = () => {
    setReconnecting(true);
    connectionManager.sendHeartbeat();
    
    // Add a timeout to reset the reconnecting state if it takes too long
    setTimeout(() => {
      if (!connectionManager.isOnline()) {
        connectionManager.reconnect();
      }
      setReconnecting(false);
    }, 3000);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg flex items-center gap-3 max-w-md">
      {isOnline ? (
        <Wifi className="h-5 w-5" />
      ) : (
        <WifiOff className="h-5 w-5" />
      )}
      <div className="flex-1">
        <p className="font-medium">
          {isOnline ? 'Connection restored' : 'Connection lost'}
        </p>
        <p className="text-sm">
          {isOnline
            ? 'Your connection has been restored.'
            : 'Please check your internet connection or try reconnecting.'}
        </p>
      </div>
      {!isOnline && (
        <Button 
          variant="outline" 
          size="sm" 
          className="whitespace-nowrap bg-background text-foreground hover:bg-background/90"
          onClick={handleReconnect}
          disabled={reconnecting}
        >
          {reconnecting ? 'Reconnecting...' : 'Reconnect'}
        </Button>
      )}
    </div>
  );
} 