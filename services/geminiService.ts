
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { AiImportResult } from '../types';

const TIMETABLE_SYSTEM_INSTRUCTION = `
    You are a professional School Timetable Digitizer and Data Architect. 
    Your goal: Process documents to create a 100% COMPLETE and unified digital school schedule.
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

    const response: GenerateContentResponse = await ai.models.generateContent({
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
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  shortCode: { type: Type.STRING },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING },
                        period: { type: Type.INTEGER },
                        subject: { type: Type.STRING },
                        room: { type: Type.STRING },
                        teacherOrClass: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const processedProfiles = (data.profiles || []).map((p: any) => ({
        name: p.name,
        type: p.type.toUpperCase() === 'TEACHER' ? 'TEACHER' : 'CLASS',
        shortCode: p.shortCode,
        schedule: convertArrayToSchedule(p.schedule)
    }));
    return { profiles: processedProfiles };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const convertArrayToSchedule = (entries: any[]) => {
    const newSchedule: any = {};
    if (!Array.isArray(entries)) return {};
    entries.forEach(entry => {
        if (!newSchedule[entry.day]) newSchedule[entry.day] = {};
        newSchedule[entry.day][entry.period] = {
            subject: entry.subject?.toUpperCase(),
            room: entry.room || '',
            teacherOrClass: entry.teacherOrClass || ''
        };
    });
    return newSchedule;
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const currentContext = `
    CURRENT APP STATE:
    School: ${dataContext.schoolName} (${dataContext.academicYear})
    Existing Profiles: ${dataContext.entities.length > 0 ? JSON.stringify(dataContext.entities.map((e: any) => ({ id: e.id, name: e.name, type: e.type, code: e.shortCode }))) : 'None yet'}
    Total Students: ${dataContext.students.length}
  `;

  return ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
