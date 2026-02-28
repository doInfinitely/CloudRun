import { useEffect, useRef } from "react";

export function usePolling(fn, intervalMs, deps = []) {
  const savedFn = useRef(fn);
  useEffect(() => { savedFn.current = fn; }, [fn]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        try { await savedFn.current(); } catch (e) { console.error("polling error", e); }
      }
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [intervalMs, ...deps]);
}
