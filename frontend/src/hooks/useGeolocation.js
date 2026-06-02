import { useState, useRef, useCallback } from 'react';

/**
 * useGeolocation Hook (AegisHer Safety platform)
 * Tracks user coordinates continuously using HTML5 Geolocation API.
 * Employs coordinates drift generator if user locks location permissions.
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const mockIntervalRef = useRef(null);

  const startTracking = useCallback(() => {
    if (watchIdRef.current || mockIntervalRef.current) return;

    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      triggerMockTracking();
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    };

    const successHandler = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyInMeters: position.coords.accuracy,
        timestamp: position.timestamp,
        isMocked: false
      });
    };

    const errorHandler = (err) => {
      console.warn(`Geolocation lookup issue (${err.code}): ${err.message}. Starting AegisHer location drift simulator.`);
      setError(err.message);
      triggerMockTracking();
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      options
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (mockIntervalRef.current !== null) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    setLocation(null);
  }, []);

  // Generates drift coordinates in New Delhi coordinates by default to simulate high-accuracy movement
  const triggerMockTracking = () => {
    if (mockIntervalRef.current) return;

    let lat = 28.6139;
    let lng = 77.2090;
    
    setLocation({
      latitude: lat,
      longitude: lng,
      accuracyInMeters: 15,
      timestamp: Date.now(),
      isMocked: true
    });

    mockIntervalRef.current = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.00008;
      lng += (Math.random() - 0.5) * 0.00008;
      setLocation({
        latitude: lat,
        longitude: lng,
        accuracyInMeters: 10 + Math.random() * 6,
        timestamp: Date.now(),
        isMocked: true
      });
    }, 3000);
  };

  return {
    location,
    error,
    startTracking,
    stopTracking
  };
}
