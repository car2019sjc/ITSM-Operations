import type { AnalystMapping } from '../types/analystMapping';

const STORAGE_KEY = 'analyst_group_level_mapping_v1';

export function loadAnalystMapping(): AnalystMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AnalystMapping;
    return [];
  } catch (e) {
    return [];
  }
}

export function saveAnalystMapping(mapping: AnalystMapping) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch {}
}

export function clearAnalystMapping() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}


