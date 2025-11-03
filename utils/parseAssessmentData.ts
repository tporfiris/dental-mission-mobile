// utils/parseAssessmentData.ts
// Unified parsing functions for assessments and treatments
// Handles both NEW OPTIMIZED format and LEGACY formats

type AssessmentData = any;

interface ParsedAssessment {
  summary: string;
  details: string[];
}

// Helper function to convert primary tooth numbers back to permanent
const PRIMARY_TOOTH_MAPPINGS: Record<string, string> = {
  '51': '11', '52': '12', '53': '13', '54': '14', '55': '15',
  '61': '21', '62': '22', '63': '23', '64': '24', '65': '25',
  '81': '41', '82': '42', '83': '43', '84': '44', '85': '45',
  '71': '31', '72': '32', '73': '33', '74': '34', '75': '35',
  '11': '51', '12': '52', '13': '53', '14': '54', '15': '55',
  '21': '61', '22': '62', '23': '63', '24': '64', '25': '65',
  '41': '81', '42': '82', '43': '83', '44': '84', '45': '85',
  '31': '71', '32': '72', '33': '73', '34': '74', '35': '75',
};

const getCurrentToothId = (originalToothId: string, primaryTeeth: string[]): string => {
  if (primaryTeeth.includes(originalToothId)) {
    return PRIMARY_TOOTH_MAPPINGS[originalToothId] || originalToothId;
  }
  return originalToothId;
};

// ===== DENTITION ASSESSMENT PARSER =====
function parseDentitionAssessment(data: AssessmentData): ParsedAssessment {
  // NEW OPTIMIZED FORMAT - exceptions only
  if (data.exceptions !== undefined) {
    const exceptions = data.exceptions || {};
    const primaryTeeth = data.primaryTeeth || [];
    const defaultState = data.defaultState || 'present';
    
    // Count teeth by status
    const exceptionEntries = Object.entries(exceptions);
    const crownMissing = exceptionEntries.filter(([_, s]) => s === 'crown-missing');
    const rootsOnly = exceptionEntries.filter(([_, s]) => s === 'roots-only');
    const missing = exceptionEntries.filter(([_, s]) => s === 'fully-missing');
    
    // Calculate present teeth (32 total - exceptions)
    const presentCount = 32 - exceptionEntries.length;
    
    const dentitionDetails = [
      `Present teeth (${presentCount}): ${presentCount === 32 ? 'All teeth present' : `${32 - exceptionEntries.length} teeth`}`,
      `Crown missing (${crownMissing.length}): ${crownMissing.length > 0 ? crownMissing.map(([t]) => t).join(', ') : 'None'}`,
      `Roots only (${rootsOnly.length}): ${rootsOnly.length > 0 ? rootsOnly.map(([t]) => t).join(', ') : 'None'}`,
      `Fully missing (${missing.length}): ${missing.length > 0 ? missing.map(([t]) => t).join(', ') : 'None'}`,
    ];
    
    if (primaryTeeth.length > 0) {
      dentitionDetails.push(`Primary teeth (${primaryTeeth.length}): ${primaryTeeth.join(', ')}`);
    }
    
    return {
      summary: `${presentCount} present, ${missing.length} missing${crownMissing.length > 0 ? `, ${crownMissing.length} crown missing` : ''}`,
      details: dentitionDetails
    };
  }
  
  // LEGACY FORMAT 1 - savedWithPrimaryNumbers
  if (data.savedWithPrimaryNumbers && data.originalToothStates) {
    const toothStates = data.originalToothStates;
    const primaryTeeth = data.primaryTeeth || [];
    
    const present = Object.entries(toothStates).filter(([_, s]) => s === 'present');
    const crownMissing = Object.entries(toothStates).filter(([_, s]) => s === 'crown-missing');
    const rootsOnly = Object.entries(toothStates).filter(([_, s]) => s === 'roots-only');
    const missing = Object.entries(toothStates).filter(([_, s]) => s === 'fully-missing');
    
    const dentitionDetails = [
      `Present teeth (${present.length}): ${present.map(([t]) => getCurrentToothId(t, primaryTeeth)).join(', ') || 'None'}`,
      `Crown missing (${crownMissing.length}): ${crownMissing.map(([t]) => getCurrentToothId(t, primaryTeeth)).join(', ') || 'None'}`,
      `Roots only (${rootsOnly.length}): ${rootsOnly.map(([t]) => getCurrentToothId(t, primaryTeeth)).join(', ') || 'None'}`,
      `Fully missing (${missing.length}): ${missing.map(([t]) => getCurrentToothId(t, primaryTeeth)).join(', ') || 'None'}`,
    ];
    
    if (primaryTeeth.length > 0) {
      dentitionDetails.push(`Primary teeth (${primaryTeeth.length}): ${primaryTeeth.map(t => getCurrentToothId(t, primaryTeeth)).join(', ')}`);
    }
    
    return {
      summary: `${present.length} present, ${missing.length} missing`,
      details: dentitionDetails
    };
  }
  
  // LEGACY FORMAT 2 - toothStates
  if (data.toothStates) {
    const present = Object.entries(data.toothStates).filter(([_, s]) => s === 'present');
    const missing = Object.entries(data.toothStates).filter(([_, s]) => s === 'fully-missing');
    return {
      summary: `${present.length} present, ${missing.length} missing`,
      details: ['Legacy format - basic data available']
    };
  }
  
  return { summary: 'Dentition assessed', details: ['Unable to parse data'] };
}

// ===== HYGIENE ASSESSMENT PARSER =====
function parseHygieneAssessment(data: AssessmentData): ParsedAssessment {
  // NEW OPTIMIZED FORMAT - nested maps
  if (data.calculus || data.plaque || data.probingDepths) {
    const hygieneDetails = [];
    
    // Calculus
    const calculusLevel = data.calculus?.level || 'none';
    const CALCULUS_LABELS: Record<string, string> = {
      'none': 'No Calculus',
      'light': 'Light Calculus',
      'moderate': 'Moderate Calculus',
      'heavy': 'Heavy Calculus'
    };
    
    hygieneDetails.push(`CALCULUS: ${CALCULUS_LABELS[calculusLevel] || calculusLevel}`);
    
    if (calculusLevel !== 'none' && data.calculus?.distribution) {
      const distribution = data.calculus.distribution;
      hygieneDetails.push(`  Distribution: ${distribution === 'generalized' ? 'Generalized' : 'Localized'}`);
      
      if (distribution === 'localized' && data.calculus.quadrants?.length > 0) {
        hygieneDetails.push(`  Quadrants: ${data.calculus.quadrants.join(', ')}`);
      }
    }
    
    // Plaque
    const plaqueLevel = data.plaque?.level || 'none';
    const PLAQUE_LABELS: Record<string, string> = {
      'none': 'No Plaque',
      'light': 'Light Plaque',
      'moderate': 'Moderate Plaque',
      'heavy': 'Heavy Plaque'
    };
    
    hygieneDetails.push(`PLAQUE: ${PLAQUE_LABELS[plaqueLevel] || plaqueLevel}`);
    
    if (plaqueLevel !== 'none' && data.plaque?.distribution) {
      const distribution = data.plaque.distribution;
      hygieneDetails.push(`  Distribution: ${distribution === 'generalized' ? 'Generalized' : 'Localized'}`);
      
      if (distribution === 'localized' && data.plaque.quadrants?.length > 0) {
        hygieneDetails.push(`  Quadrants: ${data.plaque.quadrants.join(', ')}`);
      }
    }
    
    // Probing Depths
    if (data.probingDepths?.exceptions) {
      const exceptions = Object.entries(data.probingDepths.exceptions);
      const defaultDepth = data.probingDepths.default || 2;
      
      const depthGroups: Record<string, string[]> = {
        '7+': [],
        '5-6': [],
        '4': []
      };
      
      exceptions.forEach(([tooth, depth]: any) => {
        if (depth >= 7) {
          depthGroups['7+'].push(tooth);
        } else if (depth >= 5) {
          depthGroups['5-6'].push(tooth);
        } else if (depth === 4) {
          depthGroups['4'].push(tooth);
        }
      });
      
      hygieneDetails.push(`PROBING DEPTH (default: ${defaultDepth}mm):`);
      
      if (depthGroups['7+'].length > 0) {
        hygieneDetails.push(`  Severe (7+mm): teeth ${depthGroups['7+'].join(', ')}`);
      }
      if (depthGroups['5-6'].length > 0) {
        hygieneDetails.push(`  Moderate (5-6mm): teeth ${depthGroups['5-6'].join(', ')}`);
      }
      if (depthGroups['4'].length > 0) {
        hygieneDetails.push(`  Mild (4mm): teeth ${depthGroups['4'].join(', ')}`);
      }
    }
    
    // Bleeding
    if (data.bleedingTeeth?.length > 0) {
      hygieneDetails.push(`BLEEDING: Yes - teeth ${data.bleedingTeeth.join(', ')}`);
    }
    
    // AAP Classification
    if (data.aap?.stage || data.aap?.grade) {
      const AAP_STAGE_LABELS: Record<string, string> = {
        '1': 'Stage I - Initial',
        '2': 'Stage II - Moderate',
        '3': 'Stage III - Severe',
        '4': 'Stage IV - Advanced'
      };
      
      const AAP_GRADE_LABELS: Record<string, string> = {
        'A': 'Grade A - Slow',
        'B': 'Grade B - Moderate',
        'C': 'Grade C - Rapid',
        'D': 'Grade D - Necrotizing'
      };
      
      hygieneDetails.push('AAP CLASSIFICATION:');
      if (data.aap.stage) {
        hygieneDetails.push(`  ${AAP_STAGE_LABELS[data.aap.stage] || `Stage ${data.aap.stage}`}`);
      }
      if (data.aap.grade) {
        hygieneDetails.push(`  ${AAP_GRADE_LABELS[data.aap.grade] || `Grade ${data.aap.grade}`}`);
      }
    }
    
    return {
      summary: `Calculus: ${calculusLevel}, Plaque: ${plaqueLevel}${data.aap?.stage ? `, AAP ${data.aap.stage}` : ''}`,
      details: hygieneDetails
    };
  }
  
  // LEGACY FORMAT
  if (data.calculusLevel !== undefined || data.plaqueLevel !== undefined) {
    const calculus = data.calculusLevel || 'none';
    const plaque = data.plaqueLevel || 'none';
    return {
      summary: `Calculus: ${calculus}, Plaque: ${plaque}`,
      details: ['Legacy format - basic data available']
    };
  }
  
  return { summary: 'Hygiene assessed', details: ['Unable to parse data'] };
}

// ===== FILLINGS ASSESSMENT PARSER =====
function parseFillingsAssessment(data: AssessmentData): ParsedAssessment {
  // NEW OPTIMIZED FORMAT - teethWithIssues
  if (data.teethWithIssues) {
    const teethWithIssues = data.teethWithIssues || {};
    const primaryTeeth = data.primaryTeeth || [];
    
    const fillingsDetails = [];
    const teethWithFindings = Object.entries(teethWithIssues);
    
    if (teethWithFindings.length === 0) {
      fillingsDetails.push('No restorative issues found');
    } else {
      fillingsDetails.push(`${teethWithFindings.length} teeth with findings:`);
      
      teethWithFindings.forEach(([toothId, issues]: any) => {
        const displayToothId = getCurrentToothId(toothId, primaryTeeth);
        const toothDetails = [`Tooth ${displayToothId}:`];
        
        if (issues.fillings?.surfaces?.length > 0) {
          const material = issues.fillings.type || 'unknown';
          const surfaces = issues.fillings.surfaces.join('');
          toothDetails.push(`  Existing filling: ${material}, surfaces: ${surfaces}`);
        }
        
        if (issues.crown?.material) {
          toothDetails.push(`  Existing crown: ${issues.crown.material}`);
        }
        
        if (issues.rootCanal?.existing) {
          toothDetails.push(`  Existing root canal: Yes`);
        }
        
        if (issues.cavities?.surfaces?.length > 0) {
          const surfaces = issues.cavities.surfaces.join('');
          toothDetails.push(`  Cavities: ${surfaces} surfaces`);
        }
        
        if (issues.broken?.surfaces?.length > 0) {
          const surfaces = issues.broken.surfaces.join('');
          toothDetails.push(`  Broken/cracked: ${surfaces} surfaces`);
        }
        
        if (issues.rootCanal?.needed) {
          toothDetails.push(`  Root canal needed: Yes`);
        }
        
        fillingsDetails.push(toothDetails.join('\n'));
      });
    }
    
    if (primaryTeeth.length > 0) {
      fillingsDetails.push(`Primary teeth: ${primaryTeeth.join(', ')}`);
    }
    
    const fillingsCount = Object.values(teethWithIssues).filter((t: any) => 
      t.fillings?.surfaces?.length > 0
    ).length;
    const cavitiesCount = Object.values(teethWithIssues).filter((t: any) => 
      t.cavities?.surfaces?.length > 0
    ).length;
    const rctNeededCount = Object.values(teethWithIssues).filter((t: any) => 
      t.rootCanal?.needed
    ).length;
    
    return {
      summary: `${fillingsCount} fillings, ${cavitiesCount} cavities${rctNeededCount > 0 ? `, ${rctNeededCount} need RCT` : ''}`,
      details: fillingsDetails
    };
  }
  
  // LEGACY FORMAT
  if (data.savedWithPrimaryNumbers && data.originalTeethStates) {
    return {
      summary: 'Dental assessment completed',
      details: ['Legacy format - restoration data available']
    };
  }
  
  return { summary: 'Dental assessment completed', details: ['Unable to parse data'] };
}

// ===== EXTRACTIONS ASSESSMENT PARSER =====
function parseExtractionsAssessment(data: AssessmentData): ParsedAssessment {
  // NEW OPTIMIZED FORMAT - extractions map
  const extractions = data.extractions || data.extractionStates || {};
  const extractionEntries = Object.entries(extractions).filter(([_, s]) => s !== 'none');
  
  if (extractionEntries.length === 0) {
    return {
      summary: 'No extractions needed',
      details: ['No teeth marked for extraction']
    };
  }
  
  const loose = extractionEntries.filter(([_, s]) => s === 'loose');
  const rootTip = extractionEntries.filter(([_, s]) => s === 'root-tip');
  const nonRestorable = extractionEntries.filter(([_, s]) => s === 'non-restorable');
  
  const extractionDetails = [
    `Total extractions needed: ${extractionEntries.length}`,
    `Loose teeth (${loose.length}): ${loose.length > 0 ? loose.map(([t]) => t).join(', ') : 'None'}`,
    `Root tips (${rootTip.length}): ${rootTip.length > 0 ? rootTip.map(([t]) => t).join(', ') : 'None'}`,
    `Non-restorable (${nonRestorable.length}): ${nonRestorable.length > 0 ? nonRestorable.map(([t]) => t).join(', ') : 'None'}`,
  ];
  
  return {
    summary: `${extractionEntries.length} teeth marked for extraction`,
    details: extractionDetails
  };
}

// ===== DENTURE ASSESSMENT PARSER =====
function parseDentureAssessment(data: AssessmentData): ParsedAssessment {
  const dentureType = data.selectedDentureType;
  const dentureOptions = data.dentureOptions || {};
  const dentureDetails = [];
  
  if (dentureType && dentureType !== 'none') {
    dentureDetails.push(`Denture recommended: ${dentureType}`);
  } else {
    dentureDetails.push('No denture needed');
  }
  
  const relineServices = Object.entries(dentureOptions).filter(([_, v]) => v === true);
  if (relineServices.length > 0) {
    const relineTypes = relineServices.map(([service]) => {
      return service.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    });
    dentureDetails.push(`Reline services: ${relineTypes.join(', ')}`);
  }
  
  if (data.notes) {
    dentureDetails.push(`Notes: ${data.notes}`);
  }
  
  return {
    summary: dentureType === 'none' ? 'No denture needed' : `${dentureType} recommended`,
    details: dentureDetails
  };
}

// ===== IMPLANT ASSESSMENT PARSER =====
function parseImplantAssessment(data: AssessmentData): ParsedAssessment {
  const singleImplants = data.singleImplantTeeth || [];
  const bridgeImplants = data.bridgeImplantTeeth || [];
  const boneGrafting = data.boneGraftingPlanned;
  const timing = data.timingMode;
  
  const implantDetails = [];
  
  if (singleImplants.length > 0) {
    implantDetails.push(`Single implants: ${singleImplants.join(', ')}`);
  }
  
  if (bridgeImplants.length > 0) {
    implantDetails.push(`Bridge implants: ${bridgeImplants.join(', ')}`);
  }
  
  if (boneGrafting) {
    implantDetails.push('Bone grafting: Planned');
  }
  
  if (timing) {
    implantDetails.push(`Timing: ${timing.charAt(0).toUpperCase() + timing.slice(1)} placement`);
  }
  
  if (implantDetails.length === 0) {
    implantDetails.push('No implants planned');
  }
  
  const totalImplants = singleImplants.length + bridgeImplants.length;
  return {
    summary: totalImplants > 0 ? `${totalImplants} implants planned` : 'No implants planned',
    details: implantDetails
  };
}

// ===== MAIN PARSER =====
export function parseAssessmentData(dataString: string, assessmentType: string): ParsedAssessment {
  try {
    const data = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
    
    switch (assessmentType.toLowerCase()) {
      case 'dentition':
        return parseDentitionAssessment(data);
      case 'hygiene':
        return parseHygieneAssessment(data);
      case 'fillings':
        return parseFillingsAssessment(data);
      case 'extractions':
        return parseExtractionsAssessment(data);
      case 'denture':
        return parseDentureAssessment(data);
      case 'implant':
        return parseImplantAssessment(data);
      default:
        return { summary: 'Assessment completed', details: ['Unknown assessment type'] };
    }
  } catch (error) {
    console.error('Error parsing assessment data:', error);
    return { summary: 'Assessment completed', details: ['Unable to parse details'] };
  }
}

// ===== TREATMENT PARSER =====
export function parseTreatmentDetails(treatment: any): string[] {
  const details: string[] = [];
  
  let billingCodes: any[] = [];
  try {
    billingCodes = typeof treatment.billingCodes === 'string' 
      ? JSON.parse(treatment.billingCodes) 
      : treatment.billingCodes || [];
  } catch (e) {
    // Handle legacy format
  }
  
  switch (treatment.type) {
    case 'hygiene':
      try {
        // NEW FORMAT - notes is a JSON object
        const hygieneData = typeof treatment.notes === 'string' 
          ? JSON.parse(treatment.notes) 
          : treatment.notes;
          
        if (hygieneData.scaling !== undefined) {
          details.push(`Scaling: ${hygieneData.scaling} units`);
        }
        if (hygieneData.polishing !== undefined) {
          details.push(`Polishing: ${hygieneData.polishing} units`);
        }
        if (hygieneData.fluoride && hygieneData.fluoride !== 'none') {
          details.push(`Fluoride: ${hygieneData.fluoride}`);
        }
        if (hygieneData.medication) {
          details.push(`Medication: ${hygieneData.medication}`);
        }
        if (hygieneData.notes) {
          details.push(`Notes: ${hygieneData.notes}`);
        }
      } catch (e) {
        // LEGACY FORMAT - notes might be string
        details.push(`Units: ${treatment.units}`);
      }
      break;
      
    case 'extraction':
      details.push(`Tooth: ${treatment.tooth}`);
      if (billingCodes.length > 0 && billingCodes[0].complexity) {
        details.push(`Type: ${billingCodes[0].complexity}`);
      }
      break;
      
    case 'filling':
      details.push(`Tooth: ${treatment.tooth}`);
      if (treatment.surface && treatment.surface !== 'Various') {
        details.push(`Surface: ${treatment.surface}`);
      }
      details.push(`Units: ${treatment.units}`);
      break;
      
    case 'denture':
      if (billingCodes.length > 0) {
        details.push(`Type: ${billingCodes[0].description || 'Denture placement'}`);
      }
      if (treatment.notes) {
        details.push(`Notes: ${treatment.notes}`);
      }
      break;
      
    case 'implant':
    case 'implant-crown':
      details.push(`Tooth: ${treatment.tooth}`);
      if (billingCodes.length > 0) {
        details.push(`Type: ${billingCodes[0].category || treatment.type}`);
      }
      break;
      
    default:
      details.push(`Tooth: ${treatment.tooth}`);
      if (treatment.surface !== 'N/A') {
        details.push(`Surface: ${treatment.surface}`);
      }
      details.push(`Units: ${treatment.units}`);
  }
  
  return details;
}