import { useState, useEffect } from "react";

export default function useLeaflet() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.L) {
      setReady(true);
      return;
    }

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = () => setReady(true);
    document.head.appendChild(js);

    return () => {
      document.head.removeChild(css);
      document.head.removeChild(js);
    };
  }, []);

  return ready;
}
