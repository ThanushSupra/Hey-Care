// Heuristic transcript parser used as a fallback/augmentation to AI extraction.
// It scans raw text for common patterns to infer patient name, age, gender,
// symptoms, medical history, diagnosis, and treatment plan. It is not the best parser, but it's a good fallback.
// We still need to use the AI parser to get the most accurate results.
import { PatientData } from '@/components/PatientForm';

interface ParsedPatientInfo {
  patientName?: string;
  age?: string;
  gender?: string;
  symptoms?: string;
  medicalHistory?: string;
  diagnosis?: string;
  treatmentPlan?: string;
}

export const parseTranscriptForPatientInfo = (transcript: string): ParsedPatientInfo => {
  const lowerTranscript = transcript.toLowerCase();
  const parsed: ParsedPatientInfo = {};

  // Extract patient name
  // Tries a few patterns like "my name is ..." or "patient ..."
  const namePatterns = [
    /(?:patient|my name is|i'm|i am|this is)\s+([a-z]+(?:\s+[a-z]+)*)/gi,
    /(?:name|called?)\s+([a-z]+(?:\s+[a-z]+)*)/gi
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = transcript.match(pattern);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      if (name.length > 1 && name.length < 50) {
        parsed.patientName = name;
        break;
      }
    }
  }

  // Extract age
  // Supports "years old" or short forms like "I'm 32"
  const agePatterns = [
    /(?:i'm|i am|age|years old)\s*(\d{1,3})\s*(?:years old|year old|years|year)?/gi,
    /(\d{1,3})\s*(?:years old|year old|years|year)/gi
  ];
  
  for (const pattern of agePatterns) {
    const ageMatch = transcript.match(pattern);
    if (ageMatch && ageMatch[1]) {
      const age = parseInt(ageMatch[1]);
      if (age > 0 && age < 150) {
        parsed.age = age.toString();
        break;
      }
    }
  }

  // Extract gender (very rough heuristic)
  if (lowerTranscript.includes('female') || lowerTranscript.includes('woman') || lowerTranscript.includes('she/her')) {
    parsed.gender = 'Female';
  } else if (lowerTranscript.includes('male') || lowerTranscript.includes('man') || lowerTranscript.includes('he/him')) {
    parsed.gender = 'Male';
  }

  // Extract symptoms/complaints by scanning for known keywords
  const symptomKeywords = [
    'pain', 'hurt', 'ache', 'sore', 'headache', 'fever', 'cough', 'cold', 'flu',
    'nausea', 'vomiting', 'diarrhea', 'constipation', 'bleeding', 'swelling',
    'rash', 'itching', 'burning', 'numbness', 'tingling', 'weakness', 'fatigue',
    'dizzy', 'shortness of breath', 'chest pain', 'back pain', 'stomach pain',
    'sinus', 'congestion', 'runny nose', 'sneezing', 'allergies'
  ];

  const symptomSentences = [] as string[];
  const sentences = transcript.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (symptomKeywords.some(keyword => lowerSentence.includes(keyword))) {
      symptomSentences.push(sentence.trim());
    }
  }
  
  if (symptomSentences.length > 0) {
    parsed.symptoms = symptomSentences.join('. ').trim();
  }

  // Extract medical history hints
  const historyKeywords = [
    'history', 'previous', 'before', 'surgery', 'operation', 'medication',
    'allergic', 'allergy', 'diabetes', 'hypertension', 'blood pressure',
    'heart', 'cancer', 'family history', 'genetic', 'chronic', 'condition'
  ];

  const historySentences = [];
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (historyKeywords.some(keyword => lowerSentence.includes(keyword))) {
      historySentences.push(sentence.trim());
    }
  }
  
  if (historySentences.length > 0) {
    parsed.medicalHistory = historySentences.join('. ').trim();
  }

  // Extract diagnosis mentions
  const diagnosisKeywords = [
    'diagnosis', 'diagnosed', 'condition', 'syndrome', 'disease', 'infection',
    'inflammation', 'disorder', 'pneumonia', 'bronchitis', 'arthritis',
    'migraine', 'anxiety', 'depression', 'strain', 'sprain'
  ];

  const diagnosisSentences = [];
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (diagnosisKeywords.some(keyword => lowerSentence.includes(keyword))) {
      diagnosisSentences.push(sentence.trim());
    }
  }
  
  if (diagnosisSentences.length > 0) {
    parsed.diagnosis = diagnosisSentences.join('. ').trim();
  }

  // Extract treatment plan
  const treatmentKeywords = [
    'treatment', 'medication', 'prescription', 'take', 'rest', 'follow up',
    'therapy', 'exercise', 'diet', 'avoid', 'recommend', 'suggest',
    'antibiotics', 'pain relief', 'ibuprofen', 'acetaminophen', 'aspirin'
  ];

  const treatmentSentences = [];
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (treatmentKeywords.some(keyword => lowerSentence.includes(keyword))) {
      treatmentSentences.push(sentence.trim());
    }
  }
  
  if (treatmentSentences.length > 0) {
    parsed.treatmentPlan = treatmentSentences.join('. ').trim();
  }

  return parsed;
};

export const mergePatientData = (existing: PatientData, parsed: ParsedPatientInfo): PatientData => {
  // Merge only into empty fields to avoid clobbering user/AI-provided data
  return {
    ...existing,
    // Only override if the existing field is empty and we have parsed data
    patientName: existing.patientName || parsed.patientName || existing.patientName,
    age: existing.age || parsed.age || existing.age,
    gender: existing.gender || parsed.gender || existing.gender,
    symptoms: existing.symptoms || parsed.symptoms || existing.symptoms,
    medicalHistory: existing.medicalHistory || parsed.medicalHistory || existing.medicalHistory,
    diagnosis: existing.diagnosis || parsed.diagnosis || existing.diagnosis,
    treatmentPlan: existing.treatmentPlan || parsed.treatmentPlan || existing.treatmentPlan,
  };
};
