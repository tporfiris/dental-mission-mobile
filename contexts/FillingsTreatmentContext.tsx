// contexts/FillingsTreatmentContext.tsx - OPTIMIZED VERSION
import React, { createContext, useContext, useState } from 'react';

const SURFACES = ['M', 'O', 'D', 'B', 'L'] as const;
type Surface = typeof SURFACES[number];

const FILLING_MATERIALS = ['amalgam', 'composite', 'resin', 'glass ionomer'] as const;
type FillingMaterial = typeof FILLING_MATERIALS[number];

const CROWN_MATERIALS = ['metal', 'porcelain', 'PFM'] as const;
type CrownMaterial = typeof CROWN_MATERIALS[number];

const PREP_DEPTHS = ['shallow', 'medium', 'deep'] as const;
type PrepDepth = typeof PREP_DEPTHS[number];

const CANAL_COUNTS = [1, 2, 3, 4] as const;
type CanalCount = typeof CANAL_COUNTS[number];

const UPPER_RIGHT = ['11', '12', '13', '14', '15', '16', '17', '18'];
const UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];
const LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

interface ToothTreatment {
  surfaces: Surface[];
  fillingMaterial: FillingMaterial | null;
  prepDepth: PrepDepth | null;
  hasCracks: boolean | null;
  crownIndicated: boolean | null;
  crownMaterial: CrownMaterial | null;
  rootCanalDone: boolean;
  canalCount: CanalCount | null;
  completed: boolean;
}

const defaultToothTreatment: ToothTreatment = {
  surfaces: [],
  fillingMaterial: null,
  prepDepth: null,
  hasCracks: null,
  crownIndicated: null,
  crownMaterial: null,
  rootCanalDone: false,
  canalCount: null,
  completed: false,
};

interface FillingsTreatmentState {
  treatments: Record<string, ToothTreatment>;
  notes: string;
  allCompleted: boolean;
  completedAt: Date | null;
}

// Initialize all teeth with default treatment state
const initializeTeethStates = () => {
  const initialStates: Record<string, ToothTreatment> = {};
  [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].forEach(toothId => {
    initialStates[toothId] = { ...defaultToothTreatment };
  });
  return initialStates;
};

const defaultFillingsTreatmentState: FillingsTreatmentState = {
  treatments: initializeTeethStates(),
  notes: '',
  allCompleted: false,
  completedAt: null,
};

interface FillingsTreatmentContextType {
  treatmentState: FillingsTreatmentState;
  setTreatmentState: (state: FillingsTreatmentState) => void;
  updateTreatment: (toothId: string, updates: Partial<ToothTreatment>) => void;
  toggleSurface: (toothId: string, surface: Surface) => void;
  clearTooth: (toothId: string) => void;
  updateNotes: (notes: string) => void;
  markAllCompleted: () => void;
  resetTreatment: () => void;
  getCompletedTreatments: () => Array<{toothId: string; treatment: ToothTreatment}>;
  getTotalSurfaceCount: () => number;
  quickSetAllProbing: (depth: number) => void;
  // ✅ NEW: Get optimized data for saving
  getOptimizedTreatmentData: () => any;
}

const FillingsTreatmentContext = createContext<FillingsTreatmentContextType>({
  treatmentState: defaultFillingsTreatmentState,
  setTreatmentState: () => {},
  updateTreatment: () => {},
  toggleSurface: () => {},
  clearTooth: () => {},
  updateNotes: () => {},
  markAllCompleted: () => {},
  resetTreatment: () => {},
  getCompletedTreatments: () => [],
  getTotalSurfaceCount: () => 0,
  quickSetAllProbing: () => {},
  getOptimizedTreatmentData: () => ({}),
});

export const useFillingsTreatment = () => useContext(FillingsTreatmentContext);

export const FillingsTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<FillingsTreatmentState>(defaultFillingsTreatmentState);

  const updateTreatment = (toothId: string, updates: Partial<ToothTreatment>) => {
    setTreatmentState(prev => ({
      ...prev,
      treatments: {
        ...prev.treatments,
        [toothId]: { ...prev.treatments[toothId], ...updates }
      }
    }));
  };

  const toggleSurface = (toothId: string, surface: Surface) => {
    setTreatmentState(prev => {
      const treatment = prev.treatments[toothId];
      const newSurfaces = treatment.surfaces.includes(surface)
        ? treatment.surfaces.filter(s => s !== surface)
        : [...treatment.surfaces, surface].sort();
      
      return {
        ...prev,
        treatments: {
          ...prev.treatments,
          [toothId]: { ...treatment, surfaces: newSurfaces }
        }
      };
    });
  };

  const clearTooth = (toothId: string) => {
    setTreatmentState(prev => ({
      ...prev,
      treatments: {
        ...prev.treatments,
        [toothId]: { ...defaultToothTreatment }
      }
    }));
  };

  const updateNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, notes }));
  };

  const markAllCompleted = () => {
    setTreatmentState(prev => ({
      ...prev,
      allCompleted: true,
      completedAt: new Date(),
    }));
  };

  const resetTreatment = () => {
    setTreatmentState(defaultFillingsTreatmentState);
  };

  const getCompletedTreatments = () => {
    return Object.entries(treatmentState.treatments)
      .filter(([_, treatment]) => treatment.surfaces.length > 0 || treatment.rootCanalDone)
      .map(([toothId, treatment]) => ({ toothId, treatment }));
  };

  const getTotalSurfaceCount = () => {
    return Object.values(treatmentState.treatments)
      .reduce((total, treatment) => total + treatment.surfaces.length, 0);
  };

  const quickSetAllProbing = (depth: number) => {
    // Placeholder for compatibility - not used in fillings treatment
  };

  // ✅ NEW: Get optimized data that only includes teeth with treatments
  const getOptimizedTreatmentData = () => {
    const treatedTeeth: Record<string, any> = {};
    
    Object.entries(treatmentState.treatments).forEach(([toothId, treatment]) => {
      // Only include teeth that have actual treatment data
      const hasTreatment = 
        treatment.surfaces.length > 0 ||
        treatment.rootCanalDone ||
        treatment.crownIndicated === true;
      
      if (hasTreatment) {
        const optimizedTooth: any = {};
        
        // Only include non-default values
        if (treatment.surfaces.length > 0) {
          optimizedTooth.surfaces = treatment.surfaces;
          if (treatment.fillingMaterial) {
            optimizedTooth.material = treatment.fillingMaterial;
          }
          if (treatment.prepDepth) {
            optimizedTooth.depth = treatment.prepDepth;
          }
        }
        
        if (treatment.hasCracks !== null) {
          optimizedTooth.cracks = treatment.hasCracks;
        }
        
        if (treatment.crownIndicated === true) {
          optimizedTooth.crown = {
            indicated: true,
            material: treatment.crownMaterial
          };
        }
        
        if (treatment.rootCanalDone) {
          optimizedTooth.rootCanal = {
            done: true,
            canals: treatment.canalCount
          };
        }
        
        if (treatment.completed) {
          optimizedTooth.completed = true;
        }
        
        treatedTeeth[toothId] = optimizedTooth;
      }
    });
    
    return {
      treatedTeeth,
      notes: treatmentState.notes || undefined, // Omit if empty
      completedAt: treatmentState.completedAt?.toISOString(),
    };
  };

  return (
    <FillingsTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      updateTreatment,
      toggleSurface,
      clearTooth,
      updateNotes,
      markAllCompleted,
      resetTreatment,
      getCompletedTreatments,
      getTotalSurfaceCount,
      quickSetAllProbing,
      getOptimizedTreatmentData, // ✅ NEW
    }}>
      {children}
    </FillingsTreatmentContext.Provider>
  );
};

// Export types for use in components
export type { 
  ToothTreatment, 
  FillingMaterial, 
  CrownMaterial, 
  PrepDepth, 
  CanalCount, 
  Surface,
  FillingsTreatmentState 
};