
import { GoogleGenAI } from "@google/genai";
import { EntityProfile, TimeSlot, AiImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are a professional School Timetable Digitizer. 
    Your goal: Convert timetable documents (PDFs, Images, or Text) into structured JSON.

    EXTRACTION RULES:
    1. IDENTIFY PROFILES: Look for headers that are Teacher Names or Class Names (e.g., "7A", "Mr. John"). Each is a "profile".
    2. WEEKLY GRID: Your school week is SATURDAY to THURSDAY. Ignore Friday.
    3. SLOT MAPPING: For each profile, find the grid of Periods (1-9) vs Days.
    4. DATA FIELDS: 
       - "subject": The lesson name (e.g., "MATH").
       - "room": The location (e.g., "S1").
       - "code": 
         - In a CLASS profile, "code" is the Teacher's initials.
         - In a TEACHER profile, "code" is the Class Name (e.g., "10C").

    CRITICAL REASONING:
    Timetables are often complex tables. Use your thinking capacity to trace rows and columns carefully. 
    Look for vertical and horizontal alignment. If you see a name at the top of a column or the start of a row, treat it as the Profile Name.

    OUTPUT FORMAT (STRICT JSON ONLY):
    {
      "detectedType": "TEACHER_WISE" | "CLASS_WISE",
      "profiles": [
        {
          "name": "Full Name of Class or Teacher",
          "schedule": {
            "Sat": { "1": { "subject": "ENG", "room": "1", "code": "JD" } },
            "Sun": { ... },
            ... up to "Thu"
          }
        }
      ],
      "unknownCodes": ["List", "of", "all", "unique", "codes", "found", "in", "slots"]
    }
`;

/**
 * Parses timetable using Gemini 3 Flash with reasoning enabled.
 * Flash is used for broad availability and speed.
 */
export const processTimetableImport = async (input: { text?: string, base64?: string, mimeType?: string }): Promise<AiImportResult | null> => {
  // Always create a fresh instance to use the most recent API Key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    let contentParts: any[] = [];
    
    if (input.base64 && input.mimeType) {
        contentParts.push({ 
          inlineData: { 
            data: input.base64, 
            mimeType: input.mimeType 
          } 
        });
        contentParts.push({ text: "Please carefully analyze this image/document. It is a school timetable. I need you to extract every single period for every teacher or class visible. Think through the table structure before outputting JSON." });
    } else if (input.text) {
        contentParts.push({ text: input.text });
    } else {
        return null;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts: contentParts },
      config: {
        systemInstruction: TIMETABLE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // Enable thinking to handle messy table layouts - 12k budget for reasoning
        thinkingConfig: { thinkingBudget: 12000 },
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("AI returned an empty response.");

    const data = JSON.parse(responseText);

    if (!data.profiles || data.profiles.length === 0) {
        console.warn("AI extraction returned 0 profiles.");
        return {
            detectedType: data.detectedType || 'CLASS_WISE',
            profiles: [],
            unknownCodes: [],
            rawTextResponse: responseText
        };
    }

    const processedProfiles = data.profiles.map((p: any) => ({
        ...p,
        schedule: normalizeDays(p.schedule)
    }));

    return {
        detectedType: data.detectedType || 'CLASS_WISE',
        profiles: processedProfiles,
        unknownCodes: data.unknownCodes || [],
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
                          subject: slot.subject.toUpperCase(),
                          room: slot.room || '',
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    You are the ${dataContext.schoolName} AI Assistant. 
    You have access to the current school state.
    Context: ${JSON.stringify(dataContext.entities.map((e: EntityProfile) => ({ name: e.name, code: e.shortCode })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } // No reasoning needed for simple chat
      }
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Assistant Error:", error);
    return "The assistant is currently unavailable. Please try again in a moment.";
  }
};
