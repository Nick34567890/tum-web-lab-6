import { useEffect, useRef } from 'react';

export function useNotificationChecker(games, onNotificationTime, notificationType = 'reminder') {
  const notifiedGames = useRef(new Set());

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();

      games.forEach((game) => {
        if (game.notificationDateTime && !notifiedGames.current.has(game.appid)) {
          // Parse the datetime-local string correctly
          const notificationDate = new Date(game.notificationDateTime);
          
          // Get the time difference in seconds
          const timeDiffSeconds = Math.abs(now - notificationDate) / 1000;
          
          // Trigger if within 10 seconds of the target time
          if (timeDiffSeconds < 10) {
            const message = notificationType === 'buy' 
              ? `🛒 Time to buy: ${game.name}`
              : `🎮 Time to play: ${game.name}`;
            console.log(`🔔 Notification triggered [${notificationType}] - ${message}`);
            notifiedGames.current.add(game.appid);
            onNotificationTime(game);

            // Reset the notification flag after 2 minutes so it doesn't trigger again
            setTimeout(() => {
              notifiedGames.current.delete(game.appid);
            }, 120000);
          }
        }
      });
    };

    // Check every 5 seconds instead of 30 for better accuracy
    const interval = setInterval(checkNotifications, 5000);
    
    // Also check immediately when component mounts or games change
    checkNotifications();

    return () => clearInterval(interval);
  }, [games, onNotificationTime, notificationType]);
}
