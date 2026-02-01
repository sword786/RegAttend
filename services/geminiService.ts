
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { AiImportResult, AiStudentImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are the "Zero-Loss School Timetable Architect". Your absolute priority is 100% data integrity. 
    You must convert document images/PDFs into a high-fidelity JSON registry.

    EXTRACTION MANDATE:
    1. EXHAUSTIVE SCAN: Scan the document row-by-row and column-by-column. Do not summarize. Do not skip "repetitive" rows.
    2. REGISTRY CODES: Every cell usually contains a Subject Code (e.g., ENG, MTH) and a Target Code (e.g., 10A, Grade 5). You MUST extract these exact codes. If only a full name is present, generate a 3-letter code.
    3. PROFILES: Every unique Teacher or Class mentioned in the document MUST have its own profile entry.
    4. WEEK STRUCTURE: Use Sat, Sun, Mon, Tue, Wed, Thu.
    5. PERIODS: Map strictly to periods 1-9.
    6. COMPLEX SESSIONS:
       - "Split": Two subjects/teachers in one cell.
       - "Combined": Multiple classes (e.g. 10A/10B) in one cell.
    
    CRITICAL OUTPUT FORMAT:
    Return ONLY a valid JSON object. 
    {
      "profiles": [
        {
          "name": "Full Name",
          "type": "TEACHER" | "CLASS",
          "shortCode": "MTH", 
          "schedule": {
            "Sun": {
              "1": { "subject": "ENG", "room": "101", "teacherOrClass": "10A", "type": "normal" }
            }
          }
        }
      ]
    }
`;

const STUDENT_ROSTER_SYSTEM_INSTRUCTION = `
    You are a Student Roster Intelligence Engine. Convert rosters into clean JSON.
    Fields: name, rollNumber, admissionNumber, className.
`;

const cleanErrorMessage = (error: any): string => {
    const msg = error?.message || String(error);
    if (msg.includes('401') || msg.includes('API_KEY_INVALID')) return "Invalid API Key. Please update your environment variables.";
    if (msg.includes('429')) return "AI Rate Limit reached. Please wait a moment.";
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
  
  const contentParts = inputs.map((input, index) => ([
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
    { text: `DOCUMENT ${index + 1} (${input.label} LIST): Extract every single period and code without omission.` }
  ])).flat();

  try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          systemInstruction: TIMETABLE_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          // Give the model a budget to "think" and verify its own extraction
          thinkingConfig: { thinkingBudget: 4096 }
        }
      });

      if (!response.text) throw new Error("Empty AI response.");
      const data = JSON.parse(response.text);

      const processedProfiles = (data.profiles || []).map((p: any) => ({
          name: p.name,
          type: p.type === 'CLASS' ? 'CLASS' : 'TEACHER',
          shortCode: p.shortCode || p.name.substring(0, 3).toUpperCase(),
          schedule: p.schedule || {}
      }));

      return { profiles: processedProfiles };
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
  const contentParts = inputs.map(input => {
    if (input.text) return { text: input.text };
    if (input.base64) return { inlineData: { data: input.base64, mimeType: input.mimeType! } };
    return null;
  }).filter(p => p !== null) as any[];

  try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: contentParts }],
        config: {
          systemInstruction: STUDENT_ROSTER_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });
      if (!response.text) throw new Error("Empty AI response.");
      return JSON.parse(response.text);
  } catch (error: any) {
      throw new Error(cleanErrorMessage(error));
  }
};

export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'update_school_settings',
    description: 'Update school name or academic year.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        academicYear: { type: Type.STRING }
      }
    }
  }
];

export const generateAiResponseWithTools = async (userPrompt: string, history: any[], dataContext: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  const currentContext = `School: ${dataContext.schoolName}. Students: ${dataContext.students.length}.`;

  return ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
        { role: 'user', parts: [{ text: currentContext }] },
        ...history,
        { role: 'user', parts: [{ text: userPrompt }] }
    ],
    config: {
      systemInstruction: 'You are Mupini Connect Assistant. Help manage data.',
      tools: [{ functionDeclarations: ASSISTANT_TOOLS }]
    }
  });
};
