// Main page that orchestrates voice recording, AI analysis, patient form editing,
// and note management backed by Supabase.
import React, { useState, useEffect } from 'react';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { PatientForm, PatientData } from '@/components/PatientForm';
import { PatientView } from '@/components/PatientView';
import { NotesManager } from '@/components/NotesManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Stethoscope, FileText, Mic, Activity, Heart, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Supabase client (browser-safe "anon" key) for database + edge function calls
import { supabase } from '@/integrations/supabase/client';
import heycareLogoImage from '@/assets/heycare-logo.avif';

const Index = () => {
  // Live transcript from the recorder (includes interim + final text)
  const [currentTranscript, setCurrentTranscript] = useState('');
  // Notes loaded from Supabase (persisted patients/records)
  const [savedNotes, setSavedNotes] = useState<PatientData[]>([]);
  // Dialog state for starting a new recording when unsaved data exists
  const [showNewRecordingDialog, setShowNewRecordingDialog] = useState(false);
  // Current patient model being edited or created
  const [currentPatient, setCurrentPatient] = useState<PatientData>({
    id: '',
    patientName: '',
    age: '',
    gender: '',
    symptoms: '',
    medicalHistory: '',
    diagnosis: '',
    treatmentPlan: '',
    transcript: '',
    createdAt: new Date().toISOString(),
    // Vitals
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  });
  const [activeTab, setActiveTab] = useState('record');
  // When viewing a saved note, this holds the selected patient
  const [viewingNote, setViewingNote] = useState<PatientData | null>(null);
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Load patients from Supabase on component mount
  useEffect(() => {
    loadPatients();
  }, []);

  // Fetch all patients from the database, newest first, and map DB columns
  // to the UI's PatientData shape for consistent rendering/editing.
  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading patients:', error);
        toast({
          title: "Error loading patients",
          description: "Could not load patient records from database.",
          variant: "destructive",
        });
        return;
      }

      // Map database fields to PatientData interface
      const mappedPatients: PatientData[] = (data || []).map(patient => ({
        id: patient.id,
        patientName: patient.patient_name,
        age: patient.age || '',
        gender: patient.gender || '',
        symptoms: patient.symptoms || '',
        medicalHistory: patient.medical_history || '',
        diagnosis: patient.diagnosis || '',
        treatmentPlan: patient.treatment_plan || '',
        transcript: patient.transcript || '',
        formattedTranscript: patient.formatted_transcript || '',
        createdAt: patient.created_at,
        bloodPressure: patient.blood_pressure || '',
        heartRate: patient.heart_rate || '',
        temperature: patient.temperature || '',
        respiratoryRate: patient.respiratory_rate || '',
        oxygenSaturation: patient.oxygen_saturation || '',
        weight: patient.weight || '',
        height: patient.height || '',
      }));

      setSavedNotes(mappedPatients);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error loading patients",
        description: "Could not load patient records from database.",
        variant: "destructive",
      });
    }
  };

  const handleTranscriptUpdate = (transcript: string) => {
    // Keep the live transcript in state so it can be inserted into fields
    setCurrentTranscript(transcript);
  };

  // Called during pause and on final stop; sends the transcript to the
  // Supabase Edge Function which calls the LLM to extract structured fields.
  const handleTranscriptAnalysis = async (transcript: string) => {
    try {
      // Call Supabase edge function to analyze transcript segment
      const { data, error } = await supabase.functions.invoke('analyze-transcript', {
        body: { transcript }
      });

      if (error) {
        console.error('Error calling analyze-transcript function:', error);
        throw new Error(error.message || 'Failed to analyze transcript');
      }

      if (data?.success && data?.data) {
        return data.data;
      } else {
        throw new Error('Invalid response from transcript analysis');
      }
    } catch (error) {
      console.error('Error analyzing transcript segment:', error);
      return null;
    }
  };

  // Finalize a recording session: analyze the full transcript and merge
  // extracted fields into the current patient, preserving any manual entries.
  const handleRecordingComplete = async (finalTranscript: string) => {
    setCurrentTranscript(finalTranscript);
    
    if (finalTranscript.trim()) {
      try {
        // Show loading message
        toast({
          title: "Analyzing transcript",
          description: "Using AI to extract patient information...",
        });

        // Call Supabase edge function to analyze transcript
        const { data, error } = await supabase.functions.invoke('analyze-transcript', {
          body: { transcript: finalTranscript }
        });

        if (error) {
          console.error('Error calling analyze-transcript function:', error);
          throw new Error(error.message || 'Failed to analyze transcript');
        }

        if (data?.success && data?.data) {
          const extractedInfo = data.data;
          
          // Update patient data with extracted information, replacing N/A values with new data
          const updatedPatient = { ...currentPatient };
          
          // Helper function to merge values, replacing N/A and empty values
          const mergeValue = (currentVal: string, newVal: string) => {
            if (newVal && newVal !== 'N/A') {
              return newVal;
            }
            return currentVal;
          };
          
          updatedPatient.transcript = finalTranscript;
          updatedPatient.formattedTranscript = extractedInfo.formattedTranscript || '';
          updatedPatient.patientName = mergeValue(currentPatient.patientName, extractedInfo.patientName);
          updatedPatient.age = mergeValue(currentPatient.age, extractedInfo.age);
          updatedPatient.gender = mergeValue(currentPatient.gender, extractedInfo.gender);
          updatedPatient.symptoms = mergeValue(currentPatient.symptoms, extractedInfo.symptoms);
          updatedPatient.medicalHistory = mergeValue(currentPatient.medicalHistory, extractedInfo.medicalHistory);
          updatedPatient.diagnosis = mergeValue(currentPatient.diagnosis, extractedInfo.diagnosis);
          updatedPatient.treatmentPlan = mergeValue(currentPatient.treatmentPlan, extractedInfo.treatmentPlan);
          
          // Update vitals
          updatedPatient.bloodPressure = mergeValue(currentPatient.bloodPressure, extractedInfo.bloodPressure);
          updatedPatient.heartRate = mergeValue(currentPatient.heartRate, extractedInfo.heartRate);
          updatedPatient.temperature = mergeValue(currentPatient.temperature, extractedInfo.temperature);
          updatedPatient.respiratoryRate = mergeValue(currentPatient.respiratoryRate, extractedInfo.respiratoryRate);
          updatedPatient.oxygenSaturation = mergeValue(currentPatient.oxygenSaturation, extractedInfo.oxygenSaturation);
          updatedPatient.weight = mergeValue(currentPatient.weight, extractedInfo.weight);
          updatedPatient.height = mergeValue(currentPatient.height, extractedInfo.height);
          
          setCurrentPatient(updatedPatient);
          
          // Show completion message with info about auto-filled fields
          const filledFields = [];
          if (extractedInfo.patientName && extractedInfo.patientName !== 'N/A') filledFields.push('name');
          if (extractedInfo.age && extractedInfo.age !== 'N/A') filledFields.push('age');
          if (extractedInfo.gender && extractedInfo.gender !== 'N/A') filledFields.push('gender');
          if (extractedInfo.symptoms && extractedInfo.symptoms !== 'N/A') filledFields.push('symptoms');
          if (extractedInfo.medicalHistory && extractedInfo.medicalHistory !== 'N/A') filledFields.push('medical history');
          if (extractedInfo.diagnosis && extractedInfo.diagnosis !== 'N/A') filledFields.push('diagnosis');
          if (extractedInfo.treatmentPlan && extractedInfo.treatmentPlan !== 'N/A') filledFields.push('treatment plan');
          if (extractedInfo.bloodPressure && extractedInfo.bloodPressure !== 'N/A') filledFields.push('blood pressure');
          if (extractedInfo.heartRate && extractedInfo.heartRate !== 'N/A') filledFields.push('heart rate');
          if (extractedInfo.temperature && extractedInfo.temperature !== 'N/A') filledFields.push('temperature');
          if (extractedInfo.respiratoryRate && extractedInfo.respiratoryRate !== 'N/A') filledFields.push('respiratory rate');
          if (extractedInfo.oxygenSaturation && extractedInfo.oxygenSaturation !== 'N/A') filledFields.push('oxygen saturation');
          if (extractedInfo.weight && extractedInfo.weight !== 'N/A') filledFields.push('weight');
          if (extractedInfo.height && extractedInfo.height !== 'N/A') filledFields.push('height');
          
          const description = filledFields.length > 0 
            ? `AI analysis complete! Auto-filled: ${filledFields.join(', ')}. Please review and edit as needed.`
            : 'AI analysis complete. You can now fill in patient information.';
          
          toast({
            title: "Recording complete",
            description,
          });
        } else {
          throw new Error('Invalid response from transcript analysis');
        }
      } catch (error) {
        console.error('Error analyzing transcript:', error);
        toast({
          title: "Analysis failed",
          description: "Could not analyze transcript with AI. Transcript saved for manual entry.",
          variant: "destructive",
        });
        
        // Fallback: just save the transcript
        setCurrentPatient(prev => ({ ...prev, transcript: finalTranscript }));
      }
      
      setActiveTab('patient');
    }
  };

  // Controlled form change handler from <PatientForm />
  const handlePatientDataChange = (data: PatientData) => {
    setCurrentPatient(data);
  };

  // Insert or update the patient record in Supabase, then reset the form.
  const handleSavePatient = async () => {
    if (!currentPatient.patientName.trim()) {
      toast({
        title: "Patient name required",
        description: "Please enter the patient's name before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if we're editing an existing patient
      if (currentPatient.id) {
        // Update existing patient
        const { error } = await supabase
          .from('patients')
          .update({
            patient_name: currentPatient.patientName,
            age: currentPatient.age,
            gender: currentPatient.gender,
            symptoms: currentPatient.symptoms,
            medical_history: currentPatient.medicalHistory,
            diagnosis: currentPatient.diagnosis,
            treatment_plan: currentPatient.treatmentPlan,
            transcript: currentPatient.transcript,
            formatted_transcript: currentPatient.formattedTranscript || '',
            blood_pressure: currentPatient.bloodPressure,
            heart_rate: currentPatient.heartRate,
            temperature: currentPatient.temperature,
            respiratory_rate: currentPatient.respiratoryRate,
            oxygen_saturation: currentPatient.oxygenSaturation,
            weight: currentPatient.weight,
            height: currentPatient.height,
          })
          .eq('id', currentPatient.id);

        if (error) throw error;

        toast({
          title: "Patient information updated",
          description: `Updated information for ${currentPatient.patientName}.`,
        });
      } else {
        // Create new patient
        const { error } = await supabase
          .from('patients')
          .insert({
            patient_name: currentPatient.patientName,
            age: currentPatient.age,
            gender: currentPatient.gender,
            symptoms: currentPatient.symptoms,
            medical_history: currentPatient.medicalHistory,
            diagnosis: currentPatient.diagnosis,
            treatment_plan: currentPatient.treatmentPlan,
            transcript: currentPatient.transcript,
            formatted_transcript: currentPatient.formattedTranscript || '',
            blood_pressure: currentPatient.bloodPressure,
            heart_rate: currentPatient.heartRate,
            temperature: currentPatient.temperature,
            respiratory_rate: currentPatient.respiratoryRate,
            oxygen_saturation: currentPatient.oxygenSaturation,
            weight: currentPatient.weight,
            height: currentPatient.height,
          });

        if (error) throw error;

        toast({
          title: "Patient information saved",
          description: `Saved information for ${currentPatient.patientName}.`,
        });
      }

      // Reload patients from database
      await loadPatients();

      // Reset current patient for next entry
      setCurrentPatient({
        id: '',
        patientName: '',
        age: '',
        gender: '',
        symptoms: '',
        medicalHistory: '',
        diagnosis: '',
        treatmentPlan: '',
        transcript: '',
        createdAt: new Date().toISOString(),
        // Vitals
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
      });
      setCurrentTranscript('');
      setActiveTab('notes');
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        title: "Error saving patient",
        description: "Could not save patient information to database.",
        variant: "destructive",
      });
    }
  };

  // Open a saved note in the read-only patient view tab
  const handleViewNote = (note: PatientData) => {
    setViewingNote(note);
    setActiveTab('view');
  };

  // Switch to the patient edit tab with the selected note loaded
  const handleEditNote = (note: PatientData) => {
    setCurrentPatient(note);
    setCurrentTranscript(note.transcript);
    setActiveTab('patient');
  };

  // From the read-only view, jump into edit mode for the same record
  const handleEditFromView = () => {
    if (viewingNote) {
      setCurrentPatient(viewingNote);
      setCurrentTranscript(viewingNote.transcript);
      setActiveTab('patient');
    }
  };

  // Return to the list of saved notes from the read-only view
  const handleBackToNotes = () => {
    setViewingNote(null);
    setActiveTab('notes');
  };

  // Open a confirmation dialog for deleting a note
  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteDialog(true);
  };

  // Permanently delete the selected note from Supabase (after confirm)
  const confirmDeleteNote = async () => {
    if (noteToDelete) {
      try {
        const noteToDeleteData = savedNotes.find(note => note.id === noteToDelete);
        
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', noteToDelete);

        if (error) throw error;

        // If we're currently viewing the note being deleted, go back to notes
        if (viewingNote && viewingNote.id === noteToDelete) {
          setViewingNote(null);
          setActiveTab('notes');
        }
        
        // Reload patients from database
        await loadPatients();

        toast({
          title: "Note deleted",
          description: `Patient note for ${noteToDeleteData?.patientName || 'patient'} has been removed.`,
        });
      } catch (error) {
        console.error('Error deleting patient:', error);
        toast({
          title: "Error deleting patient",
          description: "Could not delete patient record from database.",
          variant: "destructive",
        });
      }
    }
    setNoteToDelete(null);
    setShowDeleteDialog(false);
  };

  // Prompt to save if unsaved data exists before starting a new recording
  const handleNewRecordingClick = () => {
    // Check if there's unsaved patient data
    const hasUnsavedData = currentPatient.patientName.trim() || 
                          currentPatient.symptoms.trim() || 
                          currentPatient.diagnosis.trim() || 
                          currentPatient.treatmentPlan.trim() ||
                          currentTranscript.trim();

    if (hasUnsavedData) {
      setShowNewRecordingDialog(true);
    } else {
      handleNewRecording();
    }
  };

  // Reset the form and go to the recorder tab
  const handleNewRecording = () => {
    setCurrentPatient({
      id: '',
      patientName: '',
      age: '',
      gender: '',
      symptoms: '',
      medicalHistory: '',
      diagnosis: '',
      treatmentPlan: '',
      transcript: '',
      createdAt: new Date().toISOString(),
      // Vitals
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
    });
    setCurrentTranscript('');
    setActiveTab('record');
    setShowNewRecordingDialog(false);
  };

  // Convenience action: save (if name present) then reset for a fresh recording
  const handleSaveAndNewRecording = () => {
    if (currentPatient.patientName.trim()) {
      handleSavePatient();
    }
    handleNewRecording();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Professional Header */}
      <header className="professional-header sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <img 
                    src={heycareLogoImage} 
                    alt="HeyCare Logo" 
                    className="h-12 w-auto"
                  />
                  <div className="ml-3">
                    <p className="text-muted-foreground text-sm font-medium">AI-Powered Medical Documentation</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end text-sm">
                <p className="text-foreground font-medium">Quick Actions</p>
                <p className="text-muted-foreground">Start recording anytime</p>
              </div>
              <Button 
                onClick={handleNewRecordingClick} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                New Recording
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* New Recording Confirmation Dialog */}
      <AlertDialog open={showNewRecordingDialog} onOpenChange={setShowNewRecordingDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Save Current Patient Information?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved patient information. Would you like to save it before starting a new recording?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNewRecordingDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleNewRecording}>
              Don't Save
            </Button>
            <AlertDialogAction onClick={handleSaveAndNewRecording} className="bg-primary hover:bg-primary/90">
              Save & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <FileText className="w-5 h-5" />
              Delete Patient Note?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteNote} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content: Tabs for recorder, patient form, notes, and read-only view */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-8 h-14 p-1 bg-card/60 backdrop-blur-sm border border-border/50 ${activeTab === 'view' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="record" className="tab-enhanced flex items-center gap-3 py-3 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <Mic className="w-4 h-4" />
              <span className="font-medium">Record</span>
            </TabsTrigger>
            <TabsTrigger value="patient" className="tab-enhanced flex items-center gap-3 py-3 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <Stethoscope className="w-4 h-4" />
              <span className="font-medium">Patient Info</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="tab-enhanced flex items-center gap-3 py-3 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <FileText className="w-4 h-4" />
              <span className="font-medium">Notes ({savedNotes.length})</span>
            </TabsTrigger>
            {activeTab === 'view' && (
              <TabsTrigger value="view" className="tab-enhanced flex items-center gap-3 py-3 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                <User className="w-4 h-4" />
                <span className="font-medium">View Patient</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="record" className="space-y-6 animate-fade-in">
            <div className="max-w-4xl mx-auto">
              <VoiceRecorder
                onTranscriptUpdate={handleTranscriptUpdate}
                onRecordingComplete={handleRecordingComplete}
                onTranscriptAnalysis={handleTranscriptAnalysis}
              />
            </div>
          </TabsContent>

          <TabsContent value="patient" className="space-y-6 animate-fade-in">
            <div className="max-w-6xl mx-auto">
              <PatientForm
                patientData={currentPatient}
                onPatientDataChange={handlePatientDataChange}
                onSave={handleSavePatient}
                transcript={currentTranscript}
              />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6 animate-fade-in">
            <div className="max-w-6xl mx-auto">
              <NotesManager
                notes={savedNotes}
                onEditNote={handleViewNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>
          </TabsContent>

          <TabsContent value="view" className="space-y-6 animate-fade-in">
            <div className="max-w-6xl mx-auto">
              {viewingNote && (
                <PatientView
                  patientData={viewingNote}
                  onEdit={handleEditFromView}
                  onDelete={handleDeleteNote}
                  onBack={handleBackToNotes}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
