
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
    You are a Student Roster Intelligence Engine. Your goal is to convert document data (raw text from spreadsheets, images, or PDFs) into a clean student list.
    Extract: Name, Roll Number, Admission Number, and the Class/Grade name.
    
    Output Structure:
    {
      "students": [
        {
          "name": "Full Name",
          "rollNumber": "Class list position (string)",
          "admissionNumber": "Unique ID / ADM (string)",
          "className": "The specific class identifier if found (e.g., '10A', 'Grade 5', '7B')"
        }
      ]
    }

    Rules:
    1. If the input is text (from an Excel/CSV), map columns correctly to Name, Roll No, and ADM No.
    2. Identify the className for each row. If multiple classes exist in one document, identify the correct class for each student.
    3. Be precise. Use empty strings if a field is missing.
`;

const cleanErrorMessage = (error: any): string => {
    const msg = error?.message || String(error);
    if (msg.includes('Rpc failed') || msg.includes('xhr error') || msg.includes('fetch failed')) {
        return "Network connection to AI service failed.";
    }
    return "AI Service Error: " + msg;
};

export const processTimetableImport = async (inputs: { 
  base64: string, 
  mimeType: string,
  label: 'TEACHER' | 'CLASS'
}[]): Promise<AiImportResult | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Missing API Key.");
  const ai = new GoogleGenAI({ apiKey });
  
  const contentParts: any[] = inputs.map((input, index) => ([
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
    { text: `Extract all schedule data from document ${index + 1}.` }
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
      return JSON.parse(response.text || '{}');
  } catch (error: any) {
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
    if (input.text) return { text: `Spreadsheet data:\n${input.text}` };
    if (input.base64) return { inlineData: { data: input.base64, mimeType: input.mimeType! } };
    return null;
  }).filter(Boolean);

  try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          systemInstruction: STUDENT_ROSTER_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || '{"students":[]}');
  } catch (error: any) {
      throw new Error(cleanErrorMessage(error));
  }
};

export const generateAiResponseWithTools = async (userPrompt: string, history: any[], dataContext: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  const currentContext = `
    APP STATE:
    School: ${dataContext.schoolName}
    Profiles: ${JSON.stringify(dataContext.entities.map((e: any) => ({ id: e.id, name: e.name, type: e.type })))}
    Students: ${dataContext.students.length}
  `;

  return ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: currentContext }] }, ...history, { role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: 'You are the Mupini Connect Admin AI. You help manage school data using tools.',
      tools: [{ functionDeclarations: ASSISTANT_TOOLS }]
    }
  });
};

const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'update_school_settings',
    description: 'Update school name or year.',
    parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, academicYear: { type: Type.STRING } } }
  },
  {
    name: 'manage_profile',
    description: 'Manage teachers/classes.',
    parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, type: { type: Type.STRING }, id: { type: Type.STRING }, name: { type: Type.STRING } }, required: ['action', 'type'] }
  },
  {
    name: 'manage_student',
    description: 'Add or remove students.',
    parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, name: { type: Type.STRING }, classId: { type: Type.STRING } }, required: ['action'] }
  }
];
