
import { GoogleGenAI } from "@google/genai";
import { EntityProfile, TimeSlot, AiImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are a professional School Timetable Digitizer. 
    Your goal: Convert multi-page school timetable documents into structured JSON.

    ### 1. DOCUMENT STRUCTURE
    - Pages 1-8: CLASS-WISE view (Header is a Class Name like "S1", "Secondary 1").
    - Pages 9-19: TEACHER-WISE view (Header is a Teacher Name like "Mr. Smith").

    ### 2. CORE EXTRACTION RULES

    #### IN TEACHER-WISE VIEW (Pages 9-19):
    - **Identify the Class (CENTER TEXT):** The text in the center is the Class ID/Name.
    - **COMBINED CLASSES (AH Logic):** 
        - If the center contains slashes (e.g., "S2/D2"), set type: "combined" and targetClasses: ["S2", "D2"].
        - IMPORTANT: Do NOT include slash-separated strings (like "S2/D2") in the "unknownCodes" list.
    - **REGULAR CLASSES:** If it's a single class ID (e.g. "S1"), include it in "unknownCodes" for name mapping.
    - **Subject & Venue:** Top-left is Subject, Top-right is Venue.

    #### IN CLASS-WISE VIEW (Pages 1-8):
    - **Subject (CENTER TEXT):** The primary subject.
    - **ELECTIVE PERIODS (ELV Logic):**
        - Trigger: Subject is "ELV" or "HS" AND footer has multiple teachers (e.g., "IYS / MRD / NJB").
        - Action: For each teacher in that footer, create a "Virtual Class" identifier: "ELV-[TeacherCode]" (e.g., "ELV-IYS").
        - Set type: "split".
        - MANDATORY: Include all "ELV-[TeacherCode]" strings in the "unknownCodes" list so the user can assign a unique class name for that specific teacher's group.
    - **REGULAR PERIODS:** Footer contains a single Teacher Code. Include the Teacher Code in "unknownCodes" for name mapping.

    ### 3. OUTPUT SPECIFICATION
    - "code": The identifier found (Teacher Code in Class View, Class ID in Teacher View, or "ELV-[TeacherCode]").
    - "type": "split" (ELV groups), "combined" (AH sessions), or "normal".
    - "unknownCodes": Collect unique identifiers that need mapping.
        - INCLUDE: "ELV-..." codes, single Teacher Codes, single Class IDs.
        - EXCLUDE: "AH" or slash-separated combined strings like "S1/D1".

    OUTPUT FORMAT (STRICT JSON ONLY):
    {
      "detectedType": "TEACHER_WISE" | "CLASS_WISE",
      "profiles": [
        {
          "name": "Full Profile Name",
          "schedule": {
            "Sat": { 
              "1": { 
                "subject": "MATH", 
                "room": "101", 
                "code": "10A",
                "type": "normal",
                "teachers": [],
                "targetClasses": []
              } 
            }
          }
        }
      ],
      "unknownCodes": ["ELV-IYS", "JD", "10A"]
    }
`;

export const processTimetableImport = async (input: { text?: string, base64?: string, mimeType?: string }): Promise<AiImportResult | null> => {
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
        contentParts.push({ text: "Digitize this timetable. CENTER text in teacher cells is the Class Name. Identify 'ELV' + multi-teachers as virtual 'ELV-Code' classes. Identify 'S2/D2' as combined sessions and skip their mapping." });
    } else if (input.text) {
        contentParts.push({ text: input.text });
    } else {
        return null;
    }

    // Use 'gemini-3-flash-preview' for higher rate limits than Pro, and valid model existence.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const systemInstruction = `
    You are the ${dataContext.schoolName} AI Assistant. 
    You have access to the current school state.
    Context: ${JSON.stringify(dataContext.entities.map((e: EntityProfile) => ({ name: e.name, code: e.shortCode })))}
  `;

  try {
    // Switch to gemini-3-flash-preview as 2.5-flash caused 404s
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
