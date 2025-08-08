import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

const SURFACES = ['M', 'D', 'L', 'B', 'O'] as const;
type Surface = typeof SURFACES[number];

interface ToothFilling {
  surfaces: Surface[];
  completed: boolean;
  completedAt: string | null;
}

interface FillingsTreatmentState {
  treatments: Record<string, ToothFilling>;
  notes: string;
  allCompleted: boolean;
  completedAt: string | null;
}

type TreatmentStates = Record<string, ToothFilling>;

const defaultToothFilling: ToothFilling = {
  surfaces: [],
  completed: false,
  completedAt: null,
};

const defaultTreatmentStates: TreatmentStates = {};
TOOTH_IDS.forEach(id => {
  defaultTreatmentStates[id] = { ...defaultToothFilling };
});

const defaultFillingsTreatmentState: FillingsTreatmentState = {
  treatments: defaultTreatmentStates,
  notes: '',
  allCompleted: false,
  completedAt: null,
};

interface FillingsTreatmentContextType {
  treatmentState: FillingsTreatmentState;
  setTreatmentState: (state: FillingsTreatmentState) => void;
  updateToothSurfaces: (toothId: string, surfaces: Surface[]) => void;
  toggleSurface: (toothId: string, surface: Surface) => void;
  clearTooth: (toothId: string) => void;
  updateNotes: (notes: string) => void;
  markToothCompleted: (toothId: string) => void;
  markAllCompleted: () => void;
  resetTreatment: () => void;
  getCompletedTreatments: () => Array<{toothId: string, surfaces: Surface[], completedAt: string}>;
  getTotalSurfaceCount: () => number;
}

const FillingsTreatmentContext = createContext<FillingsTreatmentContextType>({
  treatmentState: defaultFillingsTreatmentState,
  setTreatmentState: () => {},
  updateToothSurfaces: () => {},
  toggleSurface: () => {},
  clearTooth: () => {},
  updateNotes: () => {},
  markToothCompleted: () => {},
  markAllCompleted: () => {},
  resetTreatment: () => {},
  getCompletedTreatments: () => [],
  getTotalSurfaceCount: () => 0,
});

export const useFillingsTreatment = () => useContext(FillingsTreatmentContext);

export const FillingsTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<FillingsTreatmentState>(defaultFillingsTreatmentState);

  const updateToothSurfaces = (toothId: string, surfaces: Surface[]) => {
    setTreatmentState(prev => ({
      ...prev,
      treatments: {
        ...prev.treatments,
        [toothId]: {
          ...prev.treatments[toothId],
          surfaces: [...surfaces].sort(), // Keep surfaces sorted
        }
      }
    }));
  };

  const toggleSurface = (toothId: string, surface: Surface) => {
    setTreatmentState(prev => {
      const currentSurfaces = prev.treatments[toothId].surfaces;
      const newSurfaces = currentSurfaces.includes(surface)
        ? currentSurfaces.filter(s => s !== surface)
        : [...currentSurfaces, surface].sort();

      return {
        ...prev,
        treatments: {
          ...prev.treatments,
          [toothId]: {
            ...prev.treatments[toothId],
            surfaces: newSurfaces,
          }
        }
      };
    });
  };

  const clearTooth = (toothId: string) => {
    setTreatmentState(prev => ({
      ...prev,
      treatments: {
        ...prev.treatments,
        [toothId]: {
          surfaces: [],
          completed: false,
          completedAt: null,
        }
      }
    }));
  };

  const updateNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, notes }));
  };

  const markToothCompleted = (toothId: string) => {
    setTreatmentState(prev => ({
      ...prev,
      treatments: {
        ...prev.treatments,
        [toothId]: {
          ...prev.treatments[toothId],
          completed: true,
          completedAt: new Date().toISOString(),
        }
      }
    }));
  };

  const markAllCompleted = () => {
    setTreatmentState(prev => ({
      ...prev,
      allCompleted: true,
      completedAt: new Date().toISOString(),
    }));
  };

  const resetTreatment = () => {
    setTreatmentState(defaultFillingsTreatmentState);
  };

  const getCompletedTreatments = () => {
    return Object.entries(treatmentState.treatments)
      .filter(([_, treatment]) => treatment.surfaces.length > 0)
      .map(([toothId, treatment]) => ({
        toothId,
        surfaces: treatment.surfaces,
        completedAt: treatment.completedAt || new Date().toISOString(),
      }));
  };

  const getTotalSurfaceCount = () => {
    return Object.values(treatmentState.treatments)
      .reduce((total, treatment) => total + treatment.surfaces.length, 0);
  };

  return (
    <FillingsTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      updateToothSurfaces,
      toggleSurface,
      clearTooth,
      updateNotes,
      markToothCompleted,
      markAllCompleted,
      resetTreatment,
      getCompletedTreatments,
      getTotalSurfaceCount,
    }}>
      {children}
    </FillingsTreatmentContext.Provider>
  );
};