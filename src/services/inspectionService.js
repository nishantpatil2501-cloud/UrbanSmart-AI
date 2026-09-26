import { supabase } from '../lib/supabase.js';

/**
 * Fetch all inspections for a specific detection case ID.
 * @param {string} detectionId Target detection ID
 */
export async function getInspectionsByDetectionId(detectionId) {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('detection_id', detectionId)
    .order('inspection_date', { ascending: false });

  if (error) {
    console.error(`Error fetching inspections for detection ${detectionId}:`, error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new inspection record.
 * @param {Object} inspection Data object (detection_id, officer, status, notes, inspection_date)
 */
export async function createInspection(inspection) {
  const payload = {
    detection_id: inspection.detection_id || inspection.detectionId,
    officer: inspection.officer || 'Unassigned Officer',
    status: inspection.status || 'Pending',
    notes: inspection.notes || '',
    inspection_date: inspection.inspection_date || inspection.inspectionDate || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('inspections')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating inspection record:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing inspection record.
 * @param {string} id Inspection UUID
 * @param {Object} updates Fields to update (status, notes, officer)
 */
export async function updateInspection(id, updates) {
  const { data, error } = await supabase
    .from('inspections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating inspection ${id}:`, error);
    throw error;
  }

  return data;
}
