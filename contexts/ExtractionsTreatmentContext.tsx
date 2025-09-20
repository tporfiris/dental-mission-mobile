import React, { createContext, useContext, useState } from 'react';

const TOOTH_IDS = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
];

type ExtractionComplexity = 'simple' | 'complicated';

interface ExtractionRecord {
  toothNumber: string;
  complexity: ExtractionComplexity;
  notes: string;
  id: string;
}

interface ExtractionsTreatmentState {
  // Enhanced state to preserve all form data
  extractions: ExtractionRecord[];
  completedAt: Date | null;
  
  // Form state for adding new extractions
  toothNumber: string;
  selectedComplexity: ExtractionComplexity;
  extractionNotes: string;
  
  // Modal state
  editingExtraction: ExtractionRecord | null;
  modalVisible: boolean;
}

const defaultExtractionsTreatmentState: ExtractionsTreatmentState = {
  extractions: [],
  completedAt: null,
  toothNumber: '',
  selectedComplexity: 'simple',
  extractionNotes: '',
  editingExtraction: null,
  modalVisible: false,
};

interface ExtractionsTreatmentContextType {
  treatmentState: ExtractionsTreatmentState;
  setTreatmentState: (state: ExtractionsTreatmentState) => void;
  
  // Extraction management
  addExtraction: (extraction: Omit<ExtractionRecord, 'id'>) => void;
  updateExtraction: (id: string, extraction: Omit<ExtractionRecord, 'id'>) => void;
  removeExtraction: (id: string) => void;
  
  // Form state management
  updateToothNumber: (toothNumber: string) => void;
  updateSelectedComplexity: (complexity: ExtractionComplexity) => void;
  updateExtractionNotes: (notes: string) => void;
  
  // Modal management
  setEditingExtraction: (extraction: ExtractionRecord | null) => void;
  setModalVisible: (visible: boolean) => void;
  
  // Actions
  markCompleted: () => void;
  resetTreatment: () => void;
  
  // Utilities
  validateToothNumber: (tooth: string) => boolean;
  getExtractionById: (id: string) => ExtractionRecord | undefined;
}

const ExtractionsTreatmentContext = createContext<ExtractionsTreatmentContextType>({
  treatmentState: defaultExtractionsTreatmentState,
  setTreatmentState: () => {},
  addExtraction: () => {},
  updateExtraction: () => {},
  removeExtraction: () => {},
  updateToothNumber: () => {},
  updateSelectedComplexity: () => {},
  updateExtractionNotes: () => {},
  setEditingExtraction: () => {},
  setModalVisible: () => {},
  markCompleted: () => {},
  resetTreatment: () => {},
  validateToothNumber: () => false,
  getExtractionById: () => undefined,
});

export const useExtractionsTreatment = () => useContext(ExtractionsTreatmentContext);

export const ExtractionsTreatmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [treatmentState, setTreatmentState] = useState<ExtractionsTreatmentState>(defaultExtractionsTreatmentState);

  const addExtraction = (extractionData: Omit<ExtractionRecord, 'id'>) => {
    const newExtraction: ExtractionRecord = {
      ...extractionData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    setTreatmentState(prev => ({
      ...prev,
      extractions: [...prev.extractions, newExtraction]
    }));
  };

  const updateExtraction = (id: string, extractionData: Omit<ExtractionRecord, 'id'>) => {
    setTreatmentState(prev => ({
      ...prev,
      extractions: prev.extractions.map(extraction => 
        extraction.id === id ? { ...extractionData, id } : extraction
      )
    }));
  };

  const removeExtraction = (id: string) => {
    setTreatmentState(prev => ({
      ...prev,
      extractions: prev.extractions.filter(extraction => extraction.id !== id)
    }));
  };

  const updateToothNumber = (toothNumber: string) => {
    setTreatmentState(prev => ({ ...prev, toothNumber }));
  };

  const updateSelectedComplexity = (complexity: ExtractionComplexity) => {
    setTreatmentState(prev => ({ ...prev, selectedComplexity: complexity }));
  };

  const updateExtractionNotes = (notes: string) => {
    setTreatmentState(prev => ({ ...prev, extractionNotes: notes }));
  };

  const setEditingExtraction = (extraction: ExtractionRecord | null) => {
    setTreatmentState(prev => ({ ...prev, editingExtraction: extraction }));
  };

  const setModalVisible = (visible: boolean) => {
    setTreatmentState(prev => ({ ...prev, modalVisible: visible }));
  };

  const markCompleted = () => {
    setTreatmentState(prev => ({ 
      ...prev, 
      completedAt: new Date() 
    }));
  };

  const resetTreatment = () => {
    setTreatmentState(defaultExtractionsTreatmentState);
  };

  const validateToothNumber = (tooth: string): boolean => {
    const num = parseInt(tooth);
    if (isNaN(num)) return false;
    
    // Valid tooth numbers: 11-18, 21-28, 31-38, 41-48
    const validRanges = [
      [11, 18], [21, 28], [31, 38], [41, 48]
    ];
    
    return validRanges.some(([min, max]) => num >= min && num <= max);
  };

  const getExtractionById = (id: string): ExtractionRecord | undefined => {
    return treatmentState.extractions.find(extraction => extraction.id === id);
  };

  return (
    <ExtractionsTreatmentContext.Provider value={{
      treatmentState,
      setTreatmentState,
      addExtraction,
      updateExtraction,
      removeExtraction,
      updateToothNumber,
      updateSelectedComplexity,
      updateExtractionNotes,
      setEditingExtraction,
      setModalVisible,
      markCompleted,
      resetTreatment,
      validateToothNumber,
      getExtractionById,
    }}>
      {children}
    </ExtractionsTreatmentContext.Provider>
  );
};

// Export types for use in components
export type { ExtractionComplexity, ExtractionRecord };