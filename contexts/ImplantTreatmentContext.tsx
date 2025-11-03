import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

// Implant types that can be placed
type ImplantType = 'single-implant' | 'multiple-implants' | 'implant-bridge' | 
  'all-on-4' | 'all-on-6' | 'mini-implants' | 'zygomatic-implants';

// Additional procedures that can be performed during implant placement
type ImplantProcedure = 'bone-grafting' | 'sinus-lift' | 'guided-surgery' | 
  'immediate-loading' | 'membrane-placement' | 'socket-preservation';

interface PlacedImplant {
  toothLocation: string; // Tooth number where implant was placed
  implantType: ImplantType;
  additionalProcedures: ImplantProcedure[];
  notes: string;
  placedAt: string; // Timestamp when this implant was recorded as placed
}

type TreatmentType = 'single-implant' | 'implant-bridge';

interface ImplantRecord {
  id: string;
  type: TreatmentType;
  toothNumber?: string; // For single implant
  implantLocations?: string; // For bridge (e.g., "24, 26")
  ponticLocations?: string; // For bridge (e.g., "25")
  notes: string;
  placedAt: Date;
}

// Context should only store persistent treatment data
// Modal state and UI state should stay in the screen component
interface ImplantTreatmentState {
  implantRecords: ImplantRecord[];  // Only persistent data
  crownRecords: ImplantCrownRecord[];  // Add crown records
  treatmentCompleted: boolean;
  completedAt: Date | null;
}

const defaultImplantTreatmentState: ImplantTreatmentState = {
  implantRecords: [],
  crownRecords: [],
  treatmentCompleted: false,
  completedAt: null,
};

interface ImplantTreatmentContextType {
  treatmentState: ImplantTreatmentState;
  setTreatmentState: (state: ImplantTreatmentState) => void;
  
  // Legacy methods for backward compatibility
  addPlacedImplant: (implant: Omit<PlacedImplant, 'placedAt'>) => void;
  removePlacedImplant: (index: number) => void;
  updatePlacedImplant: (index: number, implant: Omit<PlacedImplant, 'placedAt'>) => void;
  
  // New methods for updated functionality
  updateImplantRecords: (records: ImplantRecord[]) => void;
  updateGeneralNotes: (notes: string) => void;
  updateModalState: (updates: Partial<Pick<ImplantTreatmentState, 'modalVisible' | 'selectedType' | 'toothNumber' | 'implantLocations' | 'ponticLocations' | 'notes' | 'editingId'>>) => void;
  setTreatmentCompleted: (completed: boolean, completedAt?: Date) => void;
  markCompleted: () => void;
  resetTreatment: () => void;
}

const ImplantTreatmentContext = createContext<ImplantTreatmentContextType>({
  treatmentState: defaultImplantTreatmentState,
  setTreatmentState: () => {},
  addPlacedImplant: () => {},
  removePlacedImplant: () => {},
  updatePlacedImplant: () => {},
  updateImplantRecords: () => {},
  updateGeneralNotes: () => {},
  updateModalState: () => {},
  setTreatmentCompleted: () => {},
  markCompleted: () => {},
  resetTreatment: () => {},
});

export const useImplantTreatment = () => useContext(ImplantTreatmentContext);

export const ImplantTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<ImplantTreatmentState>(defaultImplantTreatmentState);

  const addPlacedImplant = (implant: Omit<PlacedImplant, 'placedAt'>) => {
    const newImplant: PlacedImplant = {
      ...implant,
      placedAt: new Date().toISOString()
    };
    
    setTreatmentState(prev => ({
      ...prev,
      placedImplants: [...prev.placedImplants, newImplant]
    }));
  };

  const removePlacedImplant = (index: number) => {
    setTreatmentState(prev => ({
      ...prev,
      placedImplants: prev.placedImplants.filter((_, i) => i !== index)
    }));
  };

  const updatePlacedImplant = (index: number, implant: Omit<PlacedImplant, 'placedAt'>) => {
    setTreatmentState(prev => ({
      ...prev,
      placedImplants: prev.placedImplants.map((existing, i) => 
        i === index 
          ? { ...implant, placedAt: existing.placedAt } // Keep original placement time
          : existing
      )
    }));
  };

  const updateImplantRecords = (records: ImplantRecord[]) => {
    setTreatmentState(prev => ({
      ...prev,
      implantRecords: records
    }));
  };

  const updateGeneralNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, generalNotes: notes }));
  };

  const updateModalState = (updates: Partial<Pick<ImplantTreatmentState, 'modalVisible' | 'selectedType' | 'toothNumber' | 'implantLocations' | 'ponticLocations' | 'notes' | 'editingId'>>) => {
    setTreatmentState(prev => ({ ...prev, ...updates }));
  };

  const setTreatmentCompleted = (completed: boolean, completedAt?: Date) => {
    setTreatmentState(prev => ({
      ...prev,
      treatmentCompleted: completed,
      completedAt: completedAt || (completed ? new Date() : null)
    }));
  };

  const markCompleted = () => {
    setTreatmentState(prev => ({ 
      ...prev, 
      treatmentCompleted: true,
      completedAt: new Date() 
    }));
  };

  const resetTreatment = () => {
    setTreatmentState(createSafeInitialState());
  };

  return (
    <ImplantTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      addPlacedImplant,
      removePlacedImplant,
      updatePlacedImplant,
      updateImplantRecords,
      updateGeneralNotes,
      updateModalState,
      setTreatmentCompleted,
      markCompleted,
      resetTreatment,
    }}>
      {children}
    </ImplantTreatmentContext.Provider>
  );
};

// Export types and constants for use in components
export type { ImplantType, ImplantProcedure, PlacedImplant, TreatmentType, ImplantRecord };

export const IMPLANT_TYPES: Record<ImplantType, string> = {
  'single-implant': 'Single Implant',
  'multiple-implants': 'Multiple Implants',
  'implant-bridge': 'Implant-Supported Bridge',
  'all-on-4': 'All-on-4 Full Arch',
  'all-on-6': 'All-on-6 Full Arch',
  'mini-implants': 'Mini Implants',
  'zygomatic-implants': 'Zygomatic Implants'
};

export const IMPLANT_PROCEDURES: Record<ImplantProcedure, string> = {
  'bone-grafting': 'Bone Grafting',
  'sinus-lift': 'Sinus Lift',
  'guided-surgery': 'Guided Surgery',
  'immediate-loading': 'Immediate Loading',
  'membrane-placement': 'Membrane Placement',
  'socket-preservation': 'Socket Preservation'
};

export const TOOTH_OPTIONS = TOOTH_IDS;