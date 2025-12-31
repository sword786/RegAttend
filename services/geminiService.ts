import { GoogleGenAI, Type } from "@google/genai";
import { AiImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are a professional School Timetable Digitizer and Data Architect. 
    Your goal: Process TWO documents (Teacher Timetable and Class Timetable) to create a 100% COMPLETE and unified digital school schedule.

    ### 1. ABSOLUTE REQUIREMENT: EXHAUSTIVE EXTRACTION
    - You MUST extract EVERY SINGLE profile found in the documents. 
    - Do NOT truncate the list. Do NOT skip any teachers. Do NOT skip any classes.
    - If there are 50 teachers, you must return 50 teacher profiles.
    - Processing speed is secondary to COMPLETENESS and ACCURACY.

    ### 2. DATA SOURCES
    - Source 1 usually contains Teacher-wise schedules (Each table or section represents one Teacher).
    - Source 2 usually contains Class-wise schedules (Each table or section represents one Class/Grade).

    ### 3. SHORTHAND CODES
    - "subject": Use only the shorthand code (e.g., "MATH", "ENG", "PHYS").
    - "shortCode": Assign or extract a 2-4 letter unique code for every profile.
    - "teacherOrClass": In the schedule slots, this MUST be the SHORTHAND CODE of the linked entity (e.g., if a Teacher is in Grade 10A, the code is '10A').

    ### 4. DATA STRUCTURE
    - Days: Sat, Sun, Mon, Tue, Wed, Thu.
    - Periods: 1 to 9.
    - If a slot is empty in the document, skip it in the "schedule" array.
`;

export const processTimetableImport = async (inputs: { 
  base64: string, 
  mimeType: string,
  label: 'TEACHER' | 'CLASS'
}[]): Promise<AiImportResult | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const contentParts: any[] = inputs.map((input, index) => ([
      { inlineData: { data: input.base64, mimeType: input.mimeType } },
      { text: `DOCUMENT ${index + 1} (${input.label} TIMETABLE): Extract every single individual schedule from this document.` }
    ])).flat();

    contentParts.push({ 
      text: `FINAL COMMAND: Scan every page and every table. I need the FULL list of all profiles (Teachers and Classes). 
      DO NOT skip anyone. Verify that you have extracted all sections before responding.
      Output valid JSON matching the schema precisely.` 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contentParts },
      config: {
        systemInstruction: TIMETABLE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profiles: {
              type: Type.ARRAY,
              description: "Full list of all detected teacher and class profiles. MUST NOT BE TRUNCATED.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Full name of the teacher or class grade" },
                  type: { type: Type.STRING, description: "Must be 'TEACHER' or 'CLASS'" },
                  shortCode: { type: Type.STRING, description: "Unique 2-4 letter identifier" },
                  schedule: {
                    type: Type.ARRAY,
                    description: "Complete list of all non-empty timetable slots for this person/class",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING, description: "Sat, Sun, Mon, Tue, Wed, or Thu" },
                        period: { type: Type.INTEGER, description: "1-9" },
                        subject: { type: Type.STRING, description: "Subject code" },
                        room: { type: Type.STRING, description: "Room number/name" },
                        teacherOrClass: { type: Type.STRING, description: "The code of the teacher or class assigned to this slot" }
                      },
                      required: ["day", "period", "subject"]
                    }
                  }
                },
                required: ["name", "type", "shortCode", "schedule"]
              }
            }
          },
          required: ["profiles"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Empty response from AI.");

    const data = JSON.parse(responseText);
    
    if (!data.profiles || data.profiles.length === 0) {
        return { profiles: [], rawTextResponse: responseText };
    }

    const processedProfiles = data.profiles.map((p: any) => ({
        name: p.name,
        type: p.type.toUpperCase() === 'TEACHER' ? 'TEACHER' : 'CLASS',
        shortCode: p.shortCode,
        schedule: convertArrayToSchedule(p.schedule)
    }));

    return {
        profiles: processedProfiles,
        rawTextResponse: responseText
    };

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};

export const generateAiResponse = async (userPrompt: string, dataContext: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: `You are the AI assistant for ${dataContext.schoolName}. You help with school schedules.`,
      }
    });
    return response.text || "I couldn't process that request.";
  } catch (error) {
    return "Service temporarily unavailable. If you are seeing quota errors, please connect a personal API key in Settings.";
  }
};

/**
 * Converts the flat array of schedule entries from the AI into the nested object structure
 * expected by the application: Record<Day, Record<Period, Entry>>
 */
const convertArrayToSchedule = (entries: any[]) => {
    const newSchedule: any = {};
    if (!Array.isArray(entries)) return {};

    const validDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    const dayAliases: Record<string, string> = {
        'saturday': 'Sat', 'sat': 'Sat',
        'sunday': 'Sun', 'sun': 'Sun',
        'monday': 'Mon', 'mon': 'Mon',
        'tuesday': 'Tue', 'tue': 'Tue',
        'wednesday': 'Wed', 'wed': 'Wed',
        'thursday': 'Thu', 'thu': 'Thu'
    };

    entries.forEach(entry => {
        const dayKey = entry.day?.toLowerCase();
        const day = dayAliases[dayKey] || (validDays.find(d => dayKey?.includes(d.toLowerCase())));
        
        if (day && validDays.includes(day)) {
            if (!newSchedule[day]) newSchedule[day] = {};
            const period = entry.period;
            if (period >= 1 && period <= 9) {
                newSchedule[day][period] = {
                    subject: (entry.subject || 'UNKN').toUpperCase(),
                    room: entry.room || '',
                    teacherOrClass: entry.teacherOrClass || ''
                };
            }
        }
    });
    return newSchedule;
};