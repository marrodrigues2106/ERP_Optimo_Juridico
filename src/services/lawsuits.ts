import {
  getLegalCases,
  getLegalCase,
  createLegalCase,
  updateLegalCase,
  deleteLegalCase,
} from './legal_cases'

// Legacy file fallback to prevent any remaining imports from breaking the build.
// Redirects old lawsuits API calls directly to the new legal_cases system.

export const getLawsuits = getLegalCases
export const getLawsuit = getLegalCase
export const createLawsuit = createLegalCase
export const updateLawsuit = updateLegalCase
export const deleteLawsuit = deleteLegalCase
