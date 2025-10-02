// PatientForm displays and edits structured patient information.
// It is fully controlled by the parent via props and callbacks.
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Calendar, Stethoscope, FileText, ClipboardList, Activity } from 'lucide-react';

// Central data model used throughout the app for a patient's record
export interface PatientData {
  id: string;
  patientName: string;
  age: string;
  gender: string;
  symptoms: string;
  medicalHistory: string;
  diagnosis: string;
  treatmentPlan: string;
  transcript: string;
  formattedTranscript?: string;
  createdAt: string;
  // Vitals
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
}

interface PatientFormProps {
  patientData: PatientData;
  onPatientDataChange: (data: PatientData) => void;
  onSave: () => void;
  transcript?: string;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  patientData,
  onPatientDataChange,
  onSave,
  transcript = '',
}) => {
  // Helper: update a specific field of the patient in an immutable way
  const handleInputChange = (field: keyof PatientData, value: string) => {
    onPatientDataChange({
      ...patientData,
      [field]: value,
    });
  };

  // Convenience: append the captured transcript text into a field
  const insertTranscriptToField = (field: keyof PatientData) => {
    if (transcript) {
      const currentValue = patientData[field] as string;
      const newValue = currentValue ? `${currentValue}\n\n${transcript}` : transcript;
      handleInputChange(field, newValue);
    }
  };

  return (
    <Card className="medical-card p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Patient Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Name */}
          <div className="space-y-2">
            <Label htmlFor="patientName" className="text-sm font-medium text-foreground">
              Patient Name
            </Label>
            <Input
              id="patientName"
              value={patientData.patientName}
              onChange={(e) => handleInputChange('patientName', e.target.value)}
              placeholder="Enter patient's full name"
              className="w-full"
            />
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age" className="text-sm font-medium text-foreground">
              Age
            </Label>
            <Input
              id="age"
              type="number"
              value={patientData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="Enter age"
              className="w-full"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm font-medium text-foreground">
              Gender
            </Label>
            <Select value={patientData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vitals Section: capture common vital signs in a compact grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Vital Signs</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Blood Pressure */}
            <div className="space-y-2">
              <Label htmlFor="bloodPressure" className="text-sm font-medium text-foreground">
                Blood Pressure
              </Label>
              <Input
                id="bloodPressure"
                value={patientData.bloodPressure}
                onChange={(e) => handleInputChange('bloodPressure', e.target.value)}
                placeholder="e.g., 120/80 mmHg"
                className="w-full"
              />
            </div>

            {/* Heart Rate */}
            <div className="space-y-2">
              <Label htmlFor="heartRate" className="text-sm font-medium text-foreground">
                Heart Rate
              </Label>
              <Input
                id="heartRate"
                value={patientData.heartRate}
                onChange={(e) => handleInputChange('heartRate', e.target.value)}
                placeholder="e.g., 72 bpm"
                className="w-full"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-sm font-medium text-foreground">
                Temperature
              </Label>
              <Input
                id="temperature"
                value={patientData.temperature}
                onChange={(e) => handleInputChange('temperature', e.target.value)}
                placeholder="e.g., 98.6°F"
                className="w-full"
              />
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-2">
              <Label htmlFor="respiratoryRate" className="text-sm font-medium text-foreground">
                Respiratory Rate
              </Label>
              <Input
                id="respiratoryRate"
                value={patientData.respiratoryRate}
                onChange={(e) => handleInputChange('respiratoryRate', e.target.value)}
                placeholder="e.g., 16 breaths/min"
                className="w-full"
              />
            </div>

            {/* Oxygen Saturation */}
            <div className="space-y-2">
              <Label htmlFor="oxygenSaturation" className="text-sm font-medium text-foreground">
                Oxygen Saturation
              </Label>
              <Input
                id="oxygenSaturation"
                value={patientData.oxygenSaturation}
                onChange={(e) => handleInputChange('oxygenSaturation', e.target.value)}
                placeholder="e.g., 98%"
                className="w-full"
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-medium text-foreground">
                Weight
              </Label>
              <Input
                id="weight"
                value={patientData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="e.g., 70 kg"
                className="w-full"
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height" className="text-sm font-medium text-foreground">
                Height
              </Label>
              <Input
                id="height"
                value={patientData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="e.g., 175 cm"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Symptoms / Chief Complaint */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="symptoms" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Symptoms / Chief Complaint
            </Label>
            {transcript && (
              <Button
                onClick={() => insertTranscriptToField('symptoms')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Insert Transcript
              </Button>
            )}
          </div>
          <Textarea
            id="symptoms"
            value={patientData.symptoms}
            onChange={(e) => handleInputChange('symptoms', e.target.value)}
            placeholder="Describe the patient's primary symptoms and chief complaint"
            className="min-h-[100px] resize-y"
          />
        </div>

        {/* Medical History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="medicalHistory" className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Medical History
            </Label>
            {transcript && (
              <Button
                onClick={() => insertTranscriptToField('medicalHistory')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Insert Transcript
              </Button>
            )}
          </div>
          <Textarea
            id="medicalHistory"
            value={patientData.medicalHistory}
            onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
            placeholder="Previous medical conditions, surgeries, medications, allergies"
            className="min-h-[100px] resize-y"
          />
        </div>

        {/* Diagnosis */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="diagnosis" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Diagnosis
            </Label>
            {transcript && (
              <Button
                onClick={() => insertTranscriptToField('diagnosis')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Insert Transcript
              </Button>
            )}
          </div>
          <Textarea
            id="diagnosis"
            value={patientData.diagnosis}
            onChange={(e) => handleInputChange('diagnosis', e.target.value)}
            placeholder="Enter diagnosis (can be edited after transcription)"
            className="min-h-[80px] resize-y"
          />
        </div>

        {/* Treatment Plan / Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="treatmentPlan" className="text-sm font-medium text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Treatment Plan / Notes
            </Label>
            {transcript && (
              <Button
                onClick={() => insertTranscriptToField('treatmentPlan')}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Insert Transcript
              </Button>
            )}
          </div>
          <Textarea
            id="treatmentPlan"
            value={patientData.treatmentPlan}
            onChange={(e) => handleInputChange('treatmentPlan', e.target.value)}
            placeholder="Treatment recommendations, follow-up instructions, prescriptions"
            className="min-h-[120px] resize-y"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={onSave} className="px-8 py-2 success-glow">
            Save Patient Information
          </Button>
        </div>
      </div>
    </Card>
  );
};
