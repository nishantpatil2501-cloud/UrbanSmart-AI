import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getDetections, updateDetectionStatus } from '../services/detectionService.js';

const LocationContext = createContext();

const generatePolygon = (lat, lng, areaSqM) => {
  const sideOffset = Math.sqrt(areaSqM) / 111000 / 2;
  return [
    [lat + sideOffset, lng - sideOffset],
    [lat + sideOffset, lng + sideOffset],
    [lat - sideOffset, lng + sideOffset],
    [lat - sideOffset, lng - sideOffset],
  ];
};

export const PRESET_PLACES = [
  { name: 'Pune (Central)', lat: 18.5204, lng: 73.8567 },
  { name: 'Hinjawadi, Pune', lat: 18.5913, lng: 73.7389 },
  { name: 'Kharadi, Pune', lat: 18.5515, lng: 73.9348 },
  { name: 'Baner, Pune', lat: 18.5590, lng: 73.7868 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
];

const baseDemoDetections = [
  { id: 'PU-001', area: 'Sector Alpha', type: 'Potential New Construction', risk: 'High', conf: 94, changed_area: 327, date: '2023-10-26', historical_date: '2023-01-15', current_date: '2023-10-25', status: 'SIMULATED DEMO DATA', is_demo: true },
  { id: 'PU-002', area: 'Sector Beta', type: 'Possible Unauthorized Structure', risk: 'Medium', conf: 87, changed_area: 145, date: '2023-10-25', historical_date: '2023-02-10', current_date: '2023-10-24', status: 'SIMULATED DEMO DATA', is_demo: true },
  { id: 'PU-003', area: 'Sector Gamma', type: 'New Building Footprint', risk: 'High', conf: 91, changed_area: 520, date: '2023-10-25', historical_date: '2022-11-05', current_date: '2023-10-24', status: 'SIMULATED DEMO DATA', is_demo: true },
  { id: 'PU-004', area: 'Sector Delta', type: 'Construction Expansion', risk: 'Medium', conf: 82, changed_area: 210, date: '2023-10-24', historical_date: '2023-03-20', current_date: '2023-10-23', status: 'SIMULATED DEMO DATA', is_demo: true },
  { id: 'PU-005', area: 'Sector Epsilon', type: 'Possible Encroachment', risk: 'High', conf: 89, changed_area: 405, date: '2023-10-24', historical_date: '2023-01-08', current_date: '2023-10-23', status: 'SIMULATED DEMO DATA', is_demo: true }
];

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    lat: 18.5204,
    lng: 73.8567,
    placeName: 'Pune (Central)',
    isUserCurrent: false,
  });
  const [error, setError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mockDetections, setMockDetections] = useState([]);
  const [usingSupabase, setUsingSupabase] = useState(false);

  const generateFallbackDetections = useCallback((lat, lng, placeName) => {
    const offsets = [
      [0.004, 0.005],
      [-0.003, 0.004],
      [0.002, -0.006],
      [-0.005, -0.002],
      [0.001, 0.007]
    ];

    return baseDemoDetections.map((det, idx) => {
      const detLat = lat + offsets[idx][0];
      const detLng = lng + offsets[idx][1];
      return {
        ...det,
        city: placeName,
        lat: detLat,
        lng: detLng,
        polygon: generatePolygon(detLat, detLng, det.changed_area)
      };
    });
  }, []);

  const loadDetections = useCallback(async (lat, lng, placeName) => {
    try {
      const supabaseData = await getDetections({ limit: 100 });
      if (supabaseData && supabaseData.length > 0) {
        setUsingSupabase(true);
        const mapped = supabaseData.map((item) => ({
          id: item.id,
          lat: Number(item.latitude),
          lng: Number(item.longitude),
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          area: item.area || 'Zone Sector',
          city: placeName || item.area || 'Selected Region',
          type: item.type || 'Potential New Construction',
          risk: item.risk || 'Medium',
          conf: Number(item.confidence) || 85,
          changed_area: item.changed_area || 300,
          date: item.date ? item.date.split('T')[0] : '2023-10-26',
          historical_date: '2023-01-15',
          current_date: '2023-10-25',
          status: item.is_demo ? 'SIMULATED DEMO DATA' : item.status,
          is_demo: Boolean(item.is_demo),
          polygon: (item.polygon && Array.isArray(item.polygon) && item.polygon.length > 0)
            ? item.polygon
            : generatePolygon(Number(item.latitude), Number(item.longitude), 300)
        }));
        setMockDetections(mapped);
        return;
      }
    } catch (err) {
      // Supabase unconfigured or table empty — proceed to fallback
    }

    setUsingSupabase(false);
    setMockDetections(generateFallbackDetections(lat, lng, placeName));
  }, [generateFallbackDetections]);

  const updateLocation = useCallback((lat, lng, placeName, isUserCurrent = false) => {
    const formattedName = placeName || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    setLocation({ lat, lng, placeName: formattedName, isUserCurrent });
    setError(null);
    loadDetections(lat, lng, formattedName);
  }, [loadDetections]);

  const updateStatus = useCallback(async (id, newStatus) => {
    try {
      if (usingSupabase) {
        await updateDetectionStatus(id, newStatus);
      }
    } catch (e) {
      console.warn('Could not persist status to Supabase, updating local state.');
    }

    setMockDetections((prev) =>
      prev.map((det) => (det.id === id ? { ...det, status: newStatus } : det))
    );
  }, [usingSupabase]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoadingLocation(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updateLocation(lat, lng, 'My Current Location', true);
      },
      (err) => {
        setLoadingLocation(false);
        setError('Location permission denied or unavailable. Please select a location manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocation]);

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (mockDetections.length === 0) {
      updateLocation(18.5204, 73.8567, 'Pune (Central)', false);
    }
  }, [mockDetections, updateLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        error,
        loadingLocation,
        mockDetections,
        usingSupabase,
        updateLocation,
        updateStatus,
        requestCurrentLocation,
        PRESET_PLACES,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationData = () => useContext(LocationContext);
