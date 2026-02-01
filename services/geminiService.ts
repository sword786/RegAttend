
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { AiImportResult, AiStudentImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are a professional School Timetable Digitizer. 
    Extract data from the provided timetable documents into a structured JSON format.
    
    Output Structure:
    {
      "profiles": [
        {
          "name": "Teacher or Class Name",
          "type": "TEACHER" or "CLASS",
          "shortCode": "Code (optional)",
          "schedule": {
            "Mon": {
              "1": { "subject": "MATH", "room": "101", "teacherOrClass": "Grade 10" },
              "2": { "subject": "ENG", "room": "102", "teacherOrClass": "Grade 10" }
            }
          }
        }
      ]
    }

    Rules:
    1. Days must be: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
    2. Periods are integers (1-9).
    3. Extract every profile found.
`;

const STUDENT_ROSTER_SYSTEM_INSTRUCTION = `
    You are a Student Roster Intelligence Engine. Your goal is to convert document data (text, images, or PDFs) into a clean student list.
    Extract: Name, Roll Number, Admission Number, and the Class/Grade.
    
    Output Structure:
    {
      "students": [
        {
          "name": "Full Name",
          "rollNumber": "Class list position (string)",
          "admissionNumber": "Unique ID / ADM (string)",
          "className": "The specific class identifier (e.g., '10A', 'Grade 5', '7B')"
        }
      ]
    }

    Rules:
    1. If the input is a text/CSV representation of a spreadsheet, map columns correctly.
    2. If multiple classes exist in one document, identify the correct class for each row.
    3. Be precise. Use null/empty string if a field is truly missing.
`;

const cleanErrorMessage = (error: any): string => {
    const msg = error?.message || String(error);
    if (msg.includes('Rpc failed') || msg.includes('xhr error') || msg.includes('fetch failed')) {
        return "Network connection to AI service failed. Please check your internet connection.";
    }
    if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
        return "The document format is invalid or too large.";
    }
    return "AI Service Error: " + msg;
};

export const processTimetableImport = async (inputs: { 
  base64: string, 
  mimeType: string,
  label: 'TEACHER' | 'CLASS'
}[]): Promise<AiImportResult | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.includes("your_api_key")) {
    throw new Error("Missing API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const contentParts: any[] = inputs.map((input, index) => ([
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
    { text: `Document ${index + 1} (${input.label} TIMETABLE): Extract all schedule data.` }
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

      if (!response.text) {
          throw new Error("AI returned empty response.");
      }

      const data = JSON.parse(response.text);

      const processedProfiles = (data.profiles || []).map((p: any) => ({
          name: p.name,
          type: (p.type && p.type.toUpperCase().includes('TEACHER')) ? 'TEACHER' : 'CLASS',
          shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
          schedule: p.schedule || {}
      }));
      return { profiles: processedProfiles };

  } catch (error: any) {
      console.error("AI Import Failed:", error);
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
    if (input.text) {
        return { text: `Analyze this spreadsheet text data:\n${input.text}` };
    } else if (input.base64) {
        return { inlineData: { data: input.base64, mimeType: input.mimeType! } };
    }
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
      return JSON.parse(response.text);
  } catch (error: any) {
      console.error("AI Student Import Failed:", error);
      throw new Error(cleanErrorMessage(error));
  }
};

export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'update_school_settings',
    description: 'Update the main settings of the school application like name and academic year.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'New name for the school' },
        academicYear: { type: Type.STRING, description: 'The academic year, e.g., 2025' }
      }
    }
  },
  {
    name: 'manage_profile',
    description: 'Add, update or delete a teacher or class profile.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'The action to take: "add", "update", or "delete"' },
        type: { type: Type.STRING, description: 'The type of profile: "TEACHER" or "CLASS"' },
        id: { type: Type.STRING, description: 'The unique ID of the profile (required for update/delete)' },
        name: { type: Type.STRING, description: 'Full name of the teacher or class' },
        shortCode: { type: Type.STRING, description: 'A 2-4 letter unique code' }
      },
      required: ['action', 'type']
    }
  },
  {
    name: 'manage_student',
    description: 'Register or remove students from the school database.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'Action: "add", "update", or "delete"' },
        id: { type: Type.STRING, description: 'Student ID' },
        name: { type: Type.STRING, description: 'Full student name' },
        rollNumber: { type: Type.STRING, description: 'Unique roll number' },
        classId: { type: Type.STRING, description: 'ID of the class they belong to' }
      },
      required: ['action']
    }
  },
  {
    name: 'set_timetable_slot',
    description: 'Update a specific slot in the school timetable for a teacher or class.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        entityId: { type: Type.STRING, description: 'The ID of the teacher or class profile' },
        day: { type: Type.STRING, description: 'The day: Mon, Tue, Wed, Thu, Sun, Sat' },
        period: { type: Type.NUMBER, description: 'The period number (1-9)' },
        subject: { type: Type.STRING, description: 'Subject code, e.g., MATH' },
        room: { type: Type.STRING, description: 'Room name/number' },
        teacherOrClass: { type: Type.STRING, description: 'The identifier of the linked teacher or class for this slot' }
      },
      required: ['entityId', 'day', 'period', 'subject']
    }
  }
];

export const generateAiResponseWithTools = async (userPrompt: string, history: any[], dataContext: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  
  const currentContext = `
    CURRENT APP STATE:
    School: ${dataContext.schoolName} (${dataContext.academicYear})
    Existing Profiles: ${dataContext.entities.length > 0 ? JSON.stringify(dataContext.entities.map((e: any) => ({ id: e.id, name: e.name, type: e.type, code: e.shortCode }))) : 'None yet'}
    Total Students: ${dataContext.students.length}
  `;

  return ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
        { role: 'user', parts: [{ text: currentContext }] },
        ...history,
        { role: 'user', parts: [{ text: userPrompt }] }
    ],
    config: {
      systemInstruction: 'You are the Mupini Connect Admin AI. You help manage school data. ALWAYS use IDs from the context when modifying data. If an entity doesn\'t exist, create it first. Confirm actions clearly.',
      tools: [{ functionDeclarations: ASSISTANT_TOOLS }]
    }
  });
};
