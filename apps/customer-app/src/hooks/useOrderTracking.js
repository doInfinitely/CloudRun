import { useState, useEffect, useRef } from "react";
import { getOrderTracking } from "../services/api.js";

const POLL_INTERVAL = 3000;

export default function useOrderTracking(orderId) {
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await getOrderTracking(orderId);
        if (!cancelled) {
          setTracking(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [orderId]);

  return { tracking, error };
}
