import { supabase } from '../lib/supabase.js';

/**
 * Fetch all detections from Supabase.
 * @param {Object} options Filter options (includeDemo, risk, limit)
 */
export async function getDetections(options = {}) {
  const { includeDemo = true, risk = null, limit = 1000, includeMarkers = false } = options;

  let query = supabase
    .from('detections')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!includeMarkers) {
    query = query.neq('status', 'VIEWPORT_MARKER');
  }

  if (!includeDemo) {
    query = query.eq('is_demo', false);
  }

  if (risk && risk !== 'ALL') {
    query = query.eq('risk', risk);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching detections from Supabase:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single detection record by ID.
 * @param {string} id Detection ID
 */
export async function getDetectionById(id) {
  const { data, error } = await supabase
    .from('detections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching detection ${id}:`, error);
    throw error;
  }

  return data;
}

/**
 * Insert a new detection record into Supabase.
 * @param {Object} detection Record containing id, latitude, longitude, polygon, area, confidence, risk, date, status, is_demo
 */
export async function createDetection(detection) {
  const payload = {
    id: detection.id || `DET-${Date.now()}`,
    latitude: detection.latitude || detection.lat,
    longitude: detection.longitude || detection.lng,
    polygon: detection.polygon || [],
    area: detection.area || 'Unknown Zone',
    confidence: detection.confidence || detection.conf || 0,
    risk: detection.risk || 'Medium',
    date: detection.date || new Date().toISOString(),
    status: detection.status || 'Pending Inspection',
    is_demo: detection.is_demo !== undefined ? detection.is_demo : false,
  };

  const { data, error } = await supabase
    .from('detections')
    .upsert([payload], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error creating detection record:', error);
    throw error;
  }

  return data;
}

/**
 * Update status of an existing detection record.
 * @param {string} id Detection ID
 * @param {string} status New status string
 */
export async function updateDetectionStatus(id, status) {
  const { data, error } = await supabase
    .from('detections')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating detection ${id} status:`, error);
    throw error;
  }

  return data;
}

/**
 * Delete a detection record by ID.
 * @param {string} id Detection ID
 */
export async function deleteDetection(id) {
  const { error } = await supabase
    .from('detections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting detection ${id}:`, error);
    throw error;
  }

  return true;
}
