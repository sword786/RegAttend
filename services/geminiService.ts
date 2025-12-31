import { GoogleGenAI } from "@google/genai";
import { AiImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are a professional School Timetable Digitizer and Data Architect. 
    Your goal: Process TWO documents (Teacher Timetable and Class Timetable) to create a 100% COMPLETE and unified digital school schedule.

    ### 1. ABSOLUTE REQUIREMENT: EXHAUSTIVE EXTRACTION
    - You MUST extract EVERY SINGLE profile found in the documents. 
    - Do NOT truncate. Do NOT skip any teachers. Do NOT skip any classes.
    - Processing speed is secondary to COMPLETENESS and ACCURACY.

    ### 2. DATA SOURCES
    - Document 1: Teacher-wise Timetable (Each table header is a Teacher's Name).
    - Document 2: Class-wise Timetable (Each table header is a Class Name/Grade).

    ### 3. SHORTHAND CODES (CRITICAL)
    - The user wants the timetable grid to show CODES ONLY.
    - "subject": Use only the shorthand code (e.g., "MATH", "ENG", "DOUR").
    - "code": In the schedule slots, this MUST be the SHORTHAND CODE of the linked entity (e.g., Teacher Code "MHR" or Class Code "S1").
    - "profiles[].shortCode": Correctly extract or generate a 2-4 letter shorthand code for every profile.
    - "profiles[].name": This should still be the FULL HUMAN-READABLE NAME for search/reports.

    ### 4. DATA STRUCTURE
    - Days: Sat, Sun, Mon, Tue, Wed, Thu.
    - Periods: 1 to 9.
    - Slot Fields:
        - "subject": Shorthand Subject Code.
        - "room": (e.g., 101, Lab A).
        - "code": The SHORTHAND CODE of the linked entity (Class Code for Teachers, Teacher Code for Classes).

    ### 5. OUTPUT FORMAT (STRICT JSON ONLY)
    - Return ONLY the JSON object. No preamble or post-explanation.
    {
      "profiles": [
        {
          "name": "Full Profile Name",
          "type": "TEACHER" | "CLASS",
          "shortCode": "MHR",
          "schedule": {
            "Sat": { 
              "1": { "subject": "DOUR", "room": "101", "code": "S1" } 
            }
          }
        }
      ]
    }
`;

export const processTimetableImport = async (inputs: { 
  base64: string, 
  mimeType: string,
  label: 'TEACHER' | 'CLASS'
}[]): Promise<AiImportResult | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let contentParts: any[] = [];
    
    inputs.forEach((input, index) => {
        contentParts.push({ 
          inlineData: { 
            data: input.base64, 
            mimeType: input.mimeType 
          } 
        });
        contentParts.push({ text: `SOURCE ${index + 1}: This document contains the ${input.label} Timetable. Use CODES ONLY for the schedule entries.` });
    });

    contentParts.push({ 
      text: `TASK: 
      1. Extract ALL schedules from both documents. 
      2. Ensure the schedule "subject" and "code" fields use SHORTHAND CODES only.
      3. For every class and teacher detected, create a profile with a full name and a short code.
      4. Output the result in the specified JSON format only.` 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: { parts: contentParts },
      config: {
        systemInstruction: TIMETABLE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("AI returned an empty response.");

    const data = JSON.parse(responseText);

    if (!data.profiles || data.profiles.length === 0) {
        return {
            profiles: [],
            rawTextResponse: responseText
        };
    }

    const processedProfiles = data.profiles.map((p: any) => ({
        ...p,
        schedule: normalizeDays(p.schedule)
    }));

    return {
        profiles: processedProfiles,
        rawTextResponse: responseText
    };

  } catch (error: any) {
    console.error("Extraction Error:", error);
    throw error;
  }
};

const normalizeDays = (rawSchedule: any) => {
    const newSchedule: any = {};
    if (!rawSchedule) return {};

    const validDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const dayAliases: Record<string, string> = {
        'saturday': 'Sat', 'sat': 'Sat',
        'sunday': 'Sun', 'sun': 'Sun',
        'monday': 'Mon', 'mon': 'Mon',
        'tuesday': 'Tue', 'tue': 'Tue',
        'wednesday': 'Wed', 'wed': 'Wed',
        'thursday': 'Thu', 'thu': 'Thu'
    };

    Object.keys(rawSchedule).forEach(key => {
        const normalized = dayAliases[key.toLowerCase()];
        if (normalized && validDays.includes(normalized)) {
            newSchedule[normalized] = {};
            const periods = rawSchedule[key];
            if (periods && typeof periods === 'object') {
              Object.keys(periods).forEach(pNum => {
                  const slot = periods[pNum];
                  if (slot && slot.subject) {
                      newSchedule[normalized][pNum] = {
                          ...slot,
                          subject: slot.subject.toUpperCase(),
                          room: slot.room || slot.venue || '',
                          teacherOrClass: slot.code || ''
                      };
                  }
              });
            }
        }
    });
    return newSchedule;
};

export const generateAiResponse = async (userPrompt: string, dataContext: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are the ${dataContext.schoolName} AI Assistant. 
    You have access to the current school state.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Assistant Error:", error);
    return "The assistant is currently unavailable. Please try again in a moment.";
  }
};
