import { useState, useEffect, useRef } from "react";
import { bearing } from "../utils/geo.js";

export default function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const prevRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading: gpsHeading } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        setError(null);

        if (gpsHeading != null && !isNaN(gpsHeading)) {
          setHeading(gpsHeading);
        } else if (prevRef.current) {
          const b = bearing(
            prevRef.current.lat,
            prevRef.current.lng,
            latitude,
            longitude
          );
          setHeading(b);
        }
        prevRef.current = { lat: latitude, lng: longitude };
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, heading, error };
}
