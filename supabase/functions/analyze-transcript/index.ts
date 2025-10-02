// Supabase Edge Function to analyze a transcript with an LLM and return
// structured patient information. This runs on Deno within Supabase's runtime.
//
// Key points:
// - Reads the OpenRouter API key from environment: OPENROUTER_API_KEY
// - Handles CORS for browser-origin requests
// - Prompts the LLM to return JSON only; falls back to extracting JSON if needed
// - Returns a normalized JSON payload: { success, data | error }
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Read the LLM provider API key from environment (set via Supabase secrets)
const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
// Optional safety check: if the API key is missing, the request will fail
// downstream with a 401 from OpenRouter. We rely on that rather than
// returning a 500 here to keep behavior consistent across environments.

// Minimal CORS config to support browser requests and Supabase client invocation
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Shape of the AI-extracted patient fields we expect from the model
interface PatientData {
  patientName?: string;
  age?: string;
  gender?: string;
  symptoms?: string;
  medicalHistory?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  formattedTranscript?: string;
  // Vitals
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Expect a JSON body with a "transcript" string
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Analyzing transcript:', transcript.substring(0, 100) + '...');

    // Instruction to the LLM: extract fields and also return a formatted transcript
    const prompt = `
You are a medical AI assistant. Analyze the following medical conversation transcript and extract structured patient information.

Extract the following information in JSON format:
- patientName: Patient's full name
- age: Patient's age (number only)
- gender: Patient's gender (male/female/other)
- symptoms: Patient's reported symptoms and complaints
- medicalHistory: Any mentioned medical history, past conditions, medications, allergies
- diagnosis: Any diagnosis mentioned or suspected by the healthcare provider
- treatmentPlan: Any treatment recommendations, medications prescribed, or follow-up instructions
- formattedTranscript: The original transcript with speaker identification. For each sentence or phrase, prefix it with either "Doctor: " or "Patient: " based on who is speaking. Analyze the context to determine the speaker.
- bloodPressure: Patient's blood pressure (e.g., "120/80 mmHg")
- heartRate: Patient's heart rate (e.g., "72 bpm")
- temperature: Patient's temperature (e.g., "98.6°F" or "37°C")
- respiratoryRate: Patient's respiratory rate (e.g., "16 breaths/min")
- oxygenSaturation: Patient's oxygen saturation (e.g., "98%")
- weight: Patient's weight (e.g., "70 kg" or "154 lbs")
- height: Patient's height (e.g., "175 cm" or "5'9\"")

Return only valid JSON with these exact field names. If information is not available, use "N/A" for that field. If information is later provided in the conversation that updates a previous "N/A" value, replace it with the new information.

Transcript:
${transcript}

Response format example:
{
  "patientName": "N/A",
  "age": "N/A",
  "gender": "N/A",
  "symptoms": "N/A",
  "medicalHistory": "N/A",
  "diagnosis": "N/A",
  "treatmentPlan": "N/A",
  "formattedTranscript": "",
  "bloodPressure": "N/A",
  "heartRate": "N/A",
  "temperature": "N/A",
  "respiratoryRate": "N/A",
  "oxygenSaturation": "N/A",
  "weight": "N/A",
  "height": "N/A"
}`;

    // Call OpenRouter's Chat Completions API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a medical AI that extracts structured patient information from transcripts. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Parse the JSON response from AI
    let extractedData: PatientData;
    try {
      extractedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback: try to extract JSON from response if it's wrapped in text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    console.log('Extracted patient data:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-transcript function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
