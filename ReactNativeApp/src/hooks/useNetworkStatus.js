import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Subscribes once per mount to NetInfo and returns the current connectivity
 * state. We separate `isConnected` (link up) from `isInternetReachable` because
 * captive-portal WiFi and cellular-with-no-data both report isConnected=true
 * but fail every request — that's exactly when we want to show the offline UI.
 */
export function useNetworkStatus() {
  const [state, setState] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Seed with the current snapshot so we don't render an "online" UI for
    // the first frame when we're actually offline.
    NetInfo.fetch().then((s) => {
      if (!isMounted.current) return;
      setState({
        isConnected: s.isConnected ?? false,
        isInternetReachable: s.isInternetReachable ?? false,
        type: s.type,
      });
    });

    const unsubscribe = NetInfo.addEventListener((s) => {
      if (!isMounted.current) return;
      setState({
        isConnected: s.isConnected ?? false,
        isInternetReachable: s.isInternetReachable ?? false,
        type: s.type,
      });
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  // isInternetReachable can be null on first read — treat null as "assume
  // online" so we don't falsely show an offline banner on app launch.
  const isOnline = state.isConnected && state.isInternetReachable !== false;

  return {
    isOnline,
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}