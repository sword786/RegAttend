import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { AiImportResult, AiStudentImportResult, BulkImportPayload } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are an expert Data Extraction AI specialized in reading "aSc Timetables" software outputs.
    Your objective is to digitize timetable grids with 100% precision by identifying the specific layout type for EACH document provided.

    CRITICAL INSTRUCTION: You must extract ALL profiles (Teachers or Classes) found in the input images. Do not summarize.

    STEP 1: DETECT LAYOUT TYPE (Per Page/Table)
    Analyze the Header/Title to decide if it is a Class or Teacher schedule.
    
    -------------------------------------------------------
    LAYOUT A: CLASS TIMETABLE (Target: Students/Grades)
    -------------------------------------------------------
    *   **Context**: Title is a Class Name (e.g., "Grade 10", "12-Sci", "Sec 1").
    *   **Visual Logic**:
        *   **CENTER/LARGE TEXT** = SUBJECT Code (e.g. "MATH", "ENG")
        *   **CORNER/SMALL TEXT** = TEACHER Code (e.g. "JD", "Smith")
    *   **Action**: Set type="CLASS". Map Center->subject, Corner->teacherOrClass.

    -------------------------------------------------------
    LAYOUT B: TEACHER TIMETABLE (Target: Faculty)
    -------------------------------------------------------
    *   **Context**: Title is a Person's Name (e.g., "John Doe", "Mr. Smith").
    *   **Visual Logic**:
        *   **CENTER/LARGE TEXT** = CLASS Code (e.g. "10A", "12B")
        *   **CORNER/SMALL TEXT** = SUBJECT Code (e.g. "MATH", "ENG")
    *   **Action**: Set type="TEACHER". Map Corner->subject, Center->teacherOrClass.

    STEP 2: EXTRACT GRID DATA
    *   **Rows**: Days of the week (Sat, Sun, Mon, Tue, Wed, Thu).
    *   **Columns**: Periods (1, 2, 3...).
    *   **Split Cells**: If a cell has a divider (e.g. "MATH 10A / ENG 10B"):
        *   Set "type": "split"
        *   "subject": First Subject
        *   "teacherOrClass": First Teacher/Class
        *   "splitSubject": Second Subject
        *   "splitTeacher": Second Teacher/Class
    
    OUTPUT JSON FORMAT:
    {
      "profiles": [
        {
          "name": "Full Name",
          "type": "CLASS" | "TEACHER",
          "shortCode": "CODE",
          "schedule": {
            "Mon": {
              "1": { "subject": "CODE", "teacherOrClass": "CODE", "type": "normal", "room": "" }
            }
          }
        }
      ]
    }
`;

const STUDENT_ROSTER_SYSTEM_INSTRUCTION = `
    You are a Student Roster Intelligence Engine. 
    Extract: Name, Roll Number, Admission Number, and Class Name.
    Return ONLY a JSON object with a "students" array.
`;

const TEXT_IMPORT_INSTRUCTION = `
    You are a specialized School Data Parser.
    Your task is to parse a raw text dump of timetables containing both Class and Teacher schedules into a structured JSON format.

    INPUT STRUCTURE:
    The text contains sections for "Class Timetables" and "Teacher Timetables".
    Each profile consists of a Name Line followed by Schedule Lines (Day: Period info...).
    
    CRITICAL: You must process ALL profiles in the text. Do not skip any.

    LOGIC FOR TYPE DETECTION:
    1. **TEACHER**: If the Name line starts with "Teacher", "Mr.", "Mrs.", or is listed under a "Teacher Timetables" header.
    2. **CLASS**: If the Name line indicates a Grade/Class (e.g., "Secondary", "Degree", "Plus One") or is listed under a "Class Timetables" header.

    PARSING ROW CONTENT:
    Rows look like: "Sat: 1: DATA | 2: DATA..." or "Mon: 1: DATA..."
    Separators: "|" separates periods. ":" separates Day/Period/Content.

    CONTENT EXTRACTION RULES:
    
    [CASE A: CLASS PROFILE]
    - Content Format: "SUBJECT (TEACHER_CODE)" e.g., "DOUR (US)"
    - Extraction:
      - subject: "DOUR"
      - teacherOrClass: "US"
    - If no parentheses (e.g. "MATH"), set subject="MATH", teacherOrClass="" (empty).

    [CASE B: TEACHER PROFILE]
    - Content Format: "CLASS_CODE" e.g., "S2" or "P1" or "D3/PG1"
    - Extraction:
      - teacherOrClass: "S2" (The class they are teaching)
      - subject: "LESSON" (Use a generic placeholder since subject is implied by the teacher's expertise, unless explicitly stated).
    
    CLEANUP:
    - Ignore "[Blank]" or empty slots.
    - Remove literal headers like "Class Timetables" or "Teacher Timetables" from the profile list.
    
    OUTPUT JSON SCHEMA (Strict):
    {
      "profiles": [
        {
          "name": "string",
          "type": "CLASS" | "TEACHER",
          "schedule": [
            { "day": "string", "period": number, "subject": "string", "teacherOrClass": "string" }
          ]
        }
      ]
    }
`;

const ASSISTANT_SYSTEM_INSTRUCTION = `
    You are Mupini Connect Assistant. You help administrators manage school data through natural language commands.
    You have tools to update settings, manage teachers/classes/students, and set individual timetable slots.
`;

const cleanErrorMessage = (error: any): string => {
    const msg = error?.message || String(error);
    if (msg.includes('401')) return "Invalid API Key.";
    if (msg.includes('429')) return "Rate limit exceeded. Please wait a moment.";
    return "AI Service Error: " + msg;
};

const cleanJson = (text: string): string => {
    let clean = text.trim();
    clean = clean.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    return clean;
};

const normalizeScheduleKeys = (schedule: any): any => {
    if (!schedule) return {};
    const normalized: any = {};
    const map: Record<string, string> = {
        'mon': 'Mon', 'monday': 'Mon',
        'tue': 'Tue', 'tuesday': 'Tue',
        'wed': 'Wed', 'wednesday': 'Wed',
        'thu': 'Thu', 'thursday': 'Thu',
        'fri': 'Fri', 'friday': 'Fri',
        'sat': 'Sat', 'saturday': 'Sat',
        'sun': 'Sun', 'sunday': 'Sun'
    };

    Object.keys(schedule).forEach(key => {
        const cleanKey = key.toLowerCase().trim();
        const found = Object.keys(map).find(k => cleanKey.startsWith(k));
        if (found) {
            normalized[map[found]] = schedule[key];
        }
    });
    return normalized;
};

export const processTextTimetableImport = async (text: string): Promise<BulkImportPayload> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing API Key.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
      // Use generateContent directly for speed, bypassing conversational overhead
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: text }] }],
        config: {
          systemInstruction: TEXT_IMPORT_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });

      if (!response.text) throw new Error("AI returned empty response.");
      
      const rawText = cleanJson(response.text);
      return JSON.parse(rawText) as BulkImportPayload;
  } catch (error: any) {
      console.error("Text Timetable Import Failed:", error);
      throw new Error(cleanErrorMessage(error));
  }
};

export const processTimetableImport = async (inputs: { 
  base64: string, 
  mimeType: string,
  label: 'TEACHER' | 'CLASS'
}[]): Promise<AiImportResult | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing API Key.");

  const ai = new GoogleGenAI({ apiKey });
  
  const contentParts = inputs.map((input, index) => ([
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
    { text: `DOCUMENT ${index + 1} (Uploaded as: ${input.label}): Analyze the visual layout. Detect if this is actually a CLASS or TEACHER timetable based on the header and cell structure, then apply the extraction logic.` }
  ])).flat();

  try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          systemInstruction: TIMETABLE_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });

      if (!response.text) throw new Error("AI returned empty response.");
      
      const rawText = cleanJson(response.text);
      let data;
      try {
          data = JSON.parse(rawText);
      } catch (e) {
          console.error("JSON Parse Error:", e, rawText);
          throw new Error("Failed to parse AI response. Please try again.");
      }

      const processedProfiles = (data.profiles || []).map((p: any) => ({
          name: p.name,
          type: (p.type && p.type.toUpperCase() === 'CLASS') ? 'CLASS' : 'TEACHER',
          shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
          schedule: normalizeScheduleKeys(p.schedule)
      }));
      return { profiles: processedProfiles };

  } catch (error: any) {
      console.error("Timetable Import Failed:", error);
      throw new Error(cleanErrorMessage(error));
  }
};

export const processStudentImport = async (inputs: { 
  base64?: string, 
  mimeType?: string,
  text?: string 
}[]): Promise<AiStudentImportResult | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing API Key.");

  const ai = new GoogleGenAI({ apiKey });
  
  const contentParts: any[] = inputs.map((input) => {
    if (input.text) return { text: input.text };
    if (input.base64) return { inlineData: { data: input.base64, mimeType: input.mimeType! } };
    return null;
  }).filter(p => p !== null);

  try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          systemInstruction: STUDENT_ROSTER_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });

      if (!response.text) throw new Error("AI returned empty response.");
      
      const rawText = cleanJson(response.text);
      return JSON.parse(rawText);
  } catch (error: any) {
      console.error("Student Import Failed:", error);
      throw new Error(cleanErrorMessage(error));
  }
};

export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'update_school_settings',
    description: 'Update school name and academic year.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        academicYear: { type: Type.STRING }
      }
    }
  },
  {
    name: 'manage_profile',
    description: 'Add or modify a teacher or class profile.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ['add', 'update', 'delete'] },
        type: { type: Type.STRING, enum: ['TEACHER', 'CLASS'] },
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        shortCode: { type: Type.STRING }
      },
      required: ['action']
    }
  },
  {
    name: 'manage_student',
    description: 'Add or delete a student.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ['add', 'delete'] },
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        rollNumber: { type: Type.STRING },
        classId: { type: Type.STRING }
      },
      required: ['action']
    }
  },
  {
    name: 'set_timetable_slot',
    description: 'Set a timetable slot for a teacher or class.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        entityId: { type: Type.STRING },
        day: { type: Type.STRING },
        period: { type: Type.NUMBER },
        subject: { type: Type.STRING },
        room: { type: Type.STRING },
        teacherOrClass: { type: Type.STRING }
      },
      required: ['entityId', 'day', 'period', 'subject']
    }
  }
];

export const generateAiResponseWithTools = async (userPrompt: string, history: any[], dataContext: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  const currentContext = `School: ${dataContext.schoolName}. Students: ${dataContext.students.length}. Entities: ${dataContext.entities.length}.`;

  return ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
        { role: 'user', parts: [{ text: currentContext }] },
        ...history,
        { role: 'user', parts: [{ text: userPrompt }] }
    ],
    config: {
      systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: ASSISTANT_TOOLS }]
    }
  });
};