// Helper to generate a rough rectangle polygon around a centroid
const generatePolygon = (lat, lng, areaSqM) => {
  // Very rough approximation: 1 degree lat is ~111km.
  // We want a tiny offset based on area. 
  // Let's assume a square. Side = sqrt(areaSqM) in meters.
  // Offset in degrees = side / 111000
  const sideOffset = Math.sqrt(areaSqM) / 111000 / 2;
  
  return [
    [lat + sideOffset, lng - sideOffset],
    [lat + sideOffset, lng + sideOffset],
    [lat - sideOffset, lng + sideOffset],
    [lat - sideOffset, lng - sideOffset],
  ];
};

export const mockDetections = [
  { 
    id: 'PU-001', 
    area: 'Wagholi', 
    city: 'Pune',
    lat: 18.5798, 
    lng: 73.9831, 
    type: 'Potential New Construction', 
    risk: 'High', 
    conf: 94, 
    changed_area: 327,
    date: '2023-10-26', 
    historical_date: '2023-01-15',
    current_date: '2023-10-25',
    status: 'SIMULATED DEMO DATA'
  },
  { 
    id: 'PU-002', 
    area: 'Kharadi', 
    city: 'Pune',
    lat: 18.5515, 
    lng: 73.9348, 
    type: 'Possible Unauthorized Structure', 
    risk: 'Medium', 
    conf: 87, 
    changed_area: 145,
    date: '2023-10-25', 
    historical_date: '2023-02-10',
    current_date: '2023-10-24',
    status: 'SIMULATED DEMO DATA'
  },
  { 
    id: 'PU-003', 
    area: 'Hinjawadi', 
    city: 'Pune',
    lat: 18.5913, 
    lng: 73.7389, 
    type: 'New Building Footprint', 
    risk: 'High', 
    conf: 91, 
    changed_area: 520,
    date: '2023-10-25', 
    historical_date: '2022-11-05',
    current_date: '2023-10-24',
    status: 'SIMULATED DEMO DATA'
  },
  { 
    id: 'PU-004', 
    area: 'Baner', 
    city: 'Pune',
    lat: 18.5590, 
    lng: 73.7868, 
    type: 'Construction Expansion', 
    risk: 'Medium', 
    conf: 82, 
    changed_area: 210,
    date: '2023-10-24', 
    historical_date: '2023-03-20',
    current_date: '2023-10-23',
    status: 'SIMULATED DEMO DATA'
  },
  { 
    id: 'PU-005', 
    area: 'Hadapsar', 
    city: 'Pune',
    lat: 18.5089, 
    lng: 73.9259, 
    type: 'Possible Encroachment', 
    risk: 'High', 
    conf: 89, 
    changed_area: 405,
    date: '2023-10-24', 
    historical_date: '2023-01-08',
    current_date: '2023-10-23',
    status: 'SIMULATED DEMO DATA'
  }
].map(det => ({
  ...det,
  polygon: generatePolygon(det.lat, det.lng, det.changed_area)
}));
