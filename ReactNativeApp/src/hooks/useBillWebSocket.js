import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { getToken } from '../services/authStorage';
import { BASE_URL } from '../services/api';

const WS_BASE = BASE_URL.replace(/^http/, 'ws');
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

export default function useBillWebSocket(billId, onAssignmentUpdate) {
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const cancelledRef = useRef(false);

  const connect = useCallback(async () => {
    if (!billId || cancelledRef.current) return;

    try {
      const token = await getToken();
      if (!token || cancelledRef.current) return;

      const url = `${WS_BASE}/bills/${billId}/ws?token=${token}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (cancelledRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'assignment_update') {
            onAssignmentUpdate(msg.data);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        wsRef.current = null;
        if (cancelledRef.current) return;
        if (retriesRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current);
          retriesRef.current += 1;
          setTimeout(() => {
            if (!cancelledRef.current) connect();
          }, delay);
        }
      };
    } catch {
      // token retrieval failed
    }
  }, [billId, onAssignmentUpdate]);

  useEffect(() => {
    cancelledRef.current = false;
    retriesRef.current = 0;
    connect();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !wsRef.current && !cancelledRef.current) {
        retriesRef.current = 0;
        connect();
      }
    });

    return () => {
      cancelledRef.current = true;
      sub.remove();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
