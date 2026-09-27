import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const LocationContext = createContext();

export const PRESET_PLACES = [
  { name: 'Wagholi', lat: 18.5793, lng: 73.9812 },
  { name: 'Kharadi', lat: 18.5515, lng: 73.9348 },
  { name: 'Hinjawadi', lat: 18.5913, lng: 73.7389 },
  { name: 'Baner', lat: 18.5590, lng: 73.7868 },
  { name: 'Hadapsar', lat: 18.5089, lng: 73.9260 },
  { name: 'Koregaon Park', lat: 18.5362, lng: 73.8939 },
  { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
  { name: 'Kalyani Nagar', lat: 18.5492, lng: 73.9039 },
  { name: 'Aundh', lat: 18.5579, lng: 73.8073 },
  { name: 'Wakad', lat: 18.5987, lng: 73.7687 },
  { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
  { name: 'Bavdhan', lat: 18.5134, lng: 73.7749 },
  { name: 'Pashan', lat: 18.5388, lng: 73.7915 },
  { name: 'Balewadi', lat: 18.5713, lng: 73.7732 },
  { name: 'Sus', lat: 18.5459, lng: 73.7547 },
  { name: 'Shivajinagar', lat: 18.5323, lng: 73.8447 },
  { name: 'Deccan Gymkhana', lat: 18.5157, lng: 73.8415 },
  { name: 'Camp', lat: 18.5152, lng: 73.8797 },
  { name: 'Yerawada', lat: 18.5529, lng: 73.8887 },
  { name: 'Vishrantwadi', lat: 18.567, lng: 73.877 },
  { name: 'Lohegaon', lat: 18.5862, lng: 73.9213 },
  { name: 'Dhanori', lat: 18.5878, lng: 73.8943 },
  { name: 'Kondhwa', lat: 18.455, lng: 73.8824 },
  { name: 'NIBM', lat: 18.4593, lng: 73.9015 },
  { name: 'Katraj', lat: 18.4485, lng: 73.856 },
  { name: 'Warje', lat: 18.4908, lng: 73.8 },
  { name: 'Sinhagad Road', lat: 18.4839, lng: 73.829 },
  { name: 'Dhayari', lat: 18.4468, lng: 73.8077 },
  { name: 'Ambegaon', lat: 18.4526, lng: 73.8432 },
  { name: 'Pimple Saudagar', lat: 18.5919, lng: 73.8021 },
  { name: 'Pimple Nilakh', lat: 18.5779, lng: 73.7937 },
  { name: 'Pimpri', lat: 18.6298, lng: 73.7997 },
  { name: 'Chinchwad', lat: 18.6323, lng: 73.7844 },
  { name: 'Ravet', lat: 18.6475, lng: 73.7441 },
  { name: 'Moshi', lat: 18.6657, lng: 73.8444 },
  { name: 'Pune (Central)', lat: 18.5204, lng: 73.8567 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 }
];

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    lat: 18.5793,
    lng: 73.9812,
    placeName: 'Wagholi',
    isUserCurrent: false,
  });
  const [error, setError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mockDetections, setMockDetections] = useState([]);
  const [usingSupabase, setUsingSupabase] = useState(false);

  const updateLocation = useCallback((lat, lng, placeName, isUserCurrent = false) => {
    const formattedName = placeName || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    setLocation({ lat, lng, placeName: formattedName, isUserCurrent });
    setError(null);
    setMockDetections([]); // Clear detections since we're not generating fakes anymore
  }, []);

  const updateStatus = useCallback(async (id, newStatus) => {
    setMockDetections((prev) =>
      prev.map((det) => (det.id === id ? { ...det, status: newStatus } : det))
    );
  }, []);

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
        PRESET_PLACES,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationData = () => useContext(LocationContext);
