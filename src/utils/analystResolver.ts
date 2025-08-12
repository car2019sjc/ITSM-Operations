import type { AnalystMapping } from '../types/analystMapping';
import { loadAnalystMapping } from './analystMappingStore';
import { normalizeLocationName } from './locationUtils';

export interface ResolvedAnalystInfo {
  analyst: string;
  groupFromIncident?: string;
  levelFromIncident?: string;
  mappedGroup?: string;
  mappedLevel?: string;
}

/**
 * Resolve informações de Grupo e Nível para um analista com base no mapeamento manual.
 * - Se houver linha que combine (group normalizado, analyst), retorna mappedLevel.
 * - Se houver linha que combine apenas analyst, retorna a primeira ocorrência.
 */
export function resolveAnalyst(
  analyst: string,
  incidentGroup?: string,
  incidentLevel?: string
): ResolvedAnalystInfo {
  const mapping: AnalystMapping = loadAnalystMapping();
  const normalizedIncidentGroup = incidentGroup ? normalizeLocationName(incidentGroup) : undefined;

  let matched = mapping.find(m => m.analyst.trim().toLowerCase() === (analyst || '').trim().toLowerCase() &&
    (normalizedIncidentGroup ? normalizeLocationName(m.group) === normalizedIncidentGroup : true));

  if (!matched) {
    matched = mapping.find(m => m.analyst.trim().toLowerCase() === (analyst || '').trim().toLowerCase());
  }

  return {
    analyst,
    groupFromIncident: normalizedIncidentGroup,
    levelFromIncident: incidentLevel,
    mappedGroup: matched?.group,
    mappedLevel: matched?.level,
  };
}


