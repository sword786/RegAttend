
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Wand2, CheckCircle2 } from 'lucide-react';
import { generateAiResponseWithTools } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useData } from '../contexts/DataContext';

export const Assistant: React.FC = () => {
  const data = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hello! I am your administrative assistant. I can update school settings, manage teachers/classes, and edit timetables for you. How can I help today?`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    const userMsg: ChatMessage = { role: 'user', text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        // Convert history to Gemini format
        const history = messages.slice(1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const response = await generateAiResponseWithTools(userText, history, data);
        
        if (response.functionCalls) {
            const toolResults = [];
            for (const call of response.functionCalls) {
                let result = "Action performed successfully.";
                const args = call.args as any;

                try {
                    switch (call.name) {
                        case 'update_school_settings':
                            if (args.name) data.updateSchoolName(args.name);
                            if (args.academicYear) data.updateAcademicYear(args.academicYear);
                            break;
                        case 'manage_profile':
                            if (args.action === 'add') {
                                data.addEntity({
                                    id: `${args.type.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                    name: args.name,
                                    shortCode: args.shortCode,
                                    type: args.type as any,
                                    schedule: {}
                                });
                            } else if (args.action === 'update' && args.id) {
                                data.updateEntity(args.id, { name: args.name, shortCode: args.shortCode });
                            } else if (args.action === 'delete' && args.id) {
                                data.deleteEntity(args.id);
                            }
                            break;
                        case 'manage_student':
                            if (args.action === 'add') {
                                data.addStudent({
                                    id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                    name: args.name,
                                    rollNumber: args.rollNumber || `R-${Date.now()}`,
                                    classId: args.classId || ''
                                });
                            } else if (args.action === 'delete' && args.id) {
                                data.deleteStudent(args.id);
                            }
                            break;
                        case 'set_timetable_slot':
                            data.updateSchedule(args.entityId, args.day, args.period, {
                                subject: args.subject,
                                room: args.room,
                                teacherOrClass: args.teacherOrClass
                            });
                            break;
                        default:
                            result = "Unknown tool.";
                    }
                } catch (e) {
                    result = `Error executing action: ${e}`;
                }
                toolResults.push(result);
            }

            // Optional: You could call the model again with the results, 
            // but for simplicity we'll just confirm the result based on the text part if present
            if (response.text) {
                setMessages(prev => [...prev, { role: 'model', text: response.text!, timestamp: new Date() }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: "I have updated the settings for you.", timestamp: new Date() }]);
            }
        } else {
            setMessages(prev => [...prev, { role: 'model', text: response.text || "I couldn't process that request.", timestamp: new Date() }]);
        }
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: "Something went wrong while processing your request.", timestamp: new Date() }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[500px] h-[calc(100vh-12rem)] max-h-[800px]">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                <Wand2 className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">System Authority AI</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automating your school management</p>
            </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] sm:max-w-[75%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
                msg.role === 'user' ? 'bg-slate-100 border-slate-200' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-5 rounded-[1.5rem] text-sm leading-relaxed shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' 
                  : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
              }`}>
                {msg.text.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line}</p>)}
                <span className={`text-[9px] font-bold mt-4 block opacity-40 uppercase tracking-widest ${msg.role === 'user' ? 'text-white' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl rounded-tl-none ml-14 border border-indigo-100">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Applying changes...</span>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="e.g. 'Add a new teacher named John Doe' or 'Change school name'..."
            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all placeholder-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-[1rem] hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-30 disabled:shadow-none transition-all active:scale-90"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
