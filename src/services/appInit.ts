import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Initialize application-wide configurations and services
 * This should be called once when the app starts up
 */
export const initializeApp = async (): Promise<void> => {
  try {
    // Initialize Capacitor plugins when running on a device
    if (Capacitor.isNativePlatform()) {
      // Hide the splash screen after initialization (with a small delay to ensure UI is ready)
      setTimeout(() => {
        SplashScreen.hide();
      }, 500);
      
      // Set status bar style
      StatusBar.setStyle({ style: Style.Dark });
      
      // Add app lifecycle event listeners
      App.addListener('appStateChange', ({ isActive }) => {
        // Handle app state changes (background/foreground)
        console.log('App state changed. Is active?', isActive);
        
        // Refresh auth session when app comes to foreground
        if (isActive) {
          supabase.auth.refreshSession();
        }
      });
      
      // Handle back button for Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          // Ask before exiting the app
          // You could implement a confirmation dialog here
          App.exitApp();
        }
      });
    }
    
    // Setup Supabase auth listeners
    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Supabase auth event:', event);
      
      switch (event) {
        case 'SIGNED_IN':
          // Handle user sign in - e.g. create user profile if needed
          if (session?.user) {
            // You might want to sync user data or update UI
            console.log('User signed in:', session.user.id);
          }
          break;
        
        case 'SIGNED_OUT':
          // Handle user sign out
          console.log('User signed out');
          // Clear any local user data if needed
          break;
          
        case 'TOKEN_REFRESHED':
          console.log('Auth token refreshed');
          break;
          
        case 'USER_UPDATED':
          console.log('User data updated');
          break;
      }
    });
    
    // Print confirmation that the app is initialized
    if (import.meta.env.DEV) {
      console.log('App initialized on platform:', Capacitor.getPlatform());
    }
    
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
};

/**
 * Performs cleanup when app is being terminated
 * This can be called when the app component unmounts
 */
export const cleanupApp = (): void => {
  // Remove any event listeners or perform cleanup
  if (Capacitor.isNativePlatform()) {
    App.removeAllListeners();
  }
  
  if (import.meta.env.DEV) {
    console.log('App cleanup completed');
  }
};
