
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, FileText, Sparkles, Loader2, FileUp, Check, X, Upload, AlertCircle, ArrowRight, Pencil, Clock, Key, ExternalLink, Save, Download, RotateCcw, UserPlus } from 'lucide-react';
import { EntityProfile, TimeSlot } from '../types';

type SettingsTab = 'general' | 'timetable' | 'teachers' | 'classes' | 'students' | 'import';

export const Settings: React.FC = () => {
  const { 
    schoolName, updateSchoolName, 
    academicYear, updateAcademicYear,
    entities, addEntity, deleteEntity, updateEntity,
    students, addStudent, deleteStudent,
    timeSlots, updateTimeSlots,
    resetData,
    aiImportStatus, aiImportResult, aiImportErrorMessage, startAiImport, cancelAiImport, finalizeAiImport
  } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  
  // Student Management State
  const [bulkStudentInput, setBulkStudentInput] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');

  // AI Import State
  const [aiTimetableInput, setAiTimetableInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  // Entity Management State
  const [isAddingEntity, setIsAddingEntity] = useState<'TEACHER' | 'CLASS' | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  
  // TimeSlot State
  const [localTimeSlots, setLocalTimeSlots] = useState<TimeSlot[]>([]);
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  
  const classes = useMemo(() => entities.filter(e => e.type === 'CLASS'), [entities]);
  const teachers = useMemo(() => entities.filter(e => e.type === 'TEACHER'), [entities]);

  // Initialize local slots when tab changes or data updates
  useEffect(() => {
    setLocalTimeSlots(timeSlots);
  }, [timeSlots]);

  // Clean up state when tab changes to prevent UI glitches
  useEffect(() => {
    setIsAddingEntity(null);
    setEditingId(null);
    setNewEntityName('');
    setNewEntityCode('');
    setEditName('');
    setEditCode('');
    setIsEditingSlots(false);
    setAiTimetableInput('');
    cancelAiImport();
  }, [activeTab, cancelAiImport]);

  // Set default class for student import if available
  useEffect(() => {
    if (activeTab === 'students' && !targetClassId && classes.length > 0) {
        setTargetClassId(classes[0].id);
    }
  }, [activeTab, classes, targetClassId]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleAddEntity = (type: 'TEACHER' | 'CLASS') => {
    if (!newEntityName.trim()) return;
    let finalCode = newEntityCode.trim().toUpperCase() || newEntityName.trim().substring(0, 3).toUpperCase();
    addEntity({
      id: `${type.toLowerCase()}-${Date.now()}`,
      name: newEntityName.trim(),
      shortCode: finalCode,
      type,
      schedule: {} as any
    });
    setNewEntityName('');
    setNewEntityCode('');
    setIsAddingEntity(null);
  };

  const startEditing = (entity: EntityProfile) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setEditCode(entity.shortCode || '');
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
        updateEntity(editingId, { 
            name: editName.trim(), 
            shortCode: editCode.trim().toUpperCase() 
        });
        setEditingId(null);
    }
  };

  const handleBulkImportStudents = () => {
    if (!targetClassId || !bulkStudentInput.trim()) return;
    
    const lines = bulkStudentInput.split('\n');
    let count = 0;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      // Support "Name, Roll" or just "Name"
      const parts = line.split(',');
      const name = parts[0].trim();
      const roll = parts.length > 1 ? parts[1].trim() : `R-${Math.floor(Math.random() * 10000)}`;
      
      if (name) {
        addStudent({
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name,
          rollNumber: roll,
          classId: targetClassId
        });
        count++;
      }
    });
    
    setBulkStudentInput('');
    alert(`Successfully imported ${count} students.`);
  };

  const handleAddSingleStudent = () => {
      if (!targetClassId || !newStudentName.trim()) return;
      addStudent({
          id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: newStudentName.trim(),
          rollNumber: newStudentRoll.trim() || `R-${Math.floor(Math.random() * 10000)}`,
          classId: targetClassId
      });
      setNewStudentName('');
      setNewStudentRoll('');
  };

  const handleSaveSlots = () => {
      updateTimeSlots(localTimeSlots);
      setIsEditingSlots(false);
  };

  const handleSlotChange = (index: number, field: keyof TimeSlot, value: any) => {
      const newSlots = [...localTimeSlots];
      newSlots[index] = { ...newSlots[index], [field]: value };
      setLocalTimeSlots(newSlots);
  };

  const handleAddSlot = () => {
      const nextPeriod = localTimeSlots.length + 1;
      setLocalTimeSlots([...localTimeSlots, { period: nextPeriod, timeRange: '00:00 - 00:00' }]);
  };

  const handleRemoveSlot = (index: number) => {
      const newSlots = localTimeSlots.filter((_, i) => i !== index).map((s, i) => ({ ...s, period: i + 1 }));
      setLocalTimeSlots(newSlots);
  };

  const handleExportData = () => {
      const data = {
          schoolName, academicYear, entities, students, timeSlots
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mupini_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const renderEntityList = (type: 'TEACHER' | 'CLASS') => {
    const items = entities.filter(e => e.type === type);
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">{type === 'CLASS' ? 'Class Registry' : 'Teacher Registry'}</h3>
          <button 
            onClick={() => setIsAddingEntity(type)} 
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> Add {type === 'CLASS' ? 'Class' : 'Teacher'}
          </button>
        </div>
        
        {isAddingEntity === type && (
            <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row gap-3 items-end sm:items-center animate-in fade-in">
                <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase">Name</label>
                    <input 
                        autoFocus
                        value={newEntityName}
                        onChange={e => setNewEntityName(e.target.value)}
                        placeholder={`e.g. ${type === 'CLASS' ? 'Grade 10A' : 'Mr. Smith'}`}
                        className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>
                <div className="w-full sm:w-32 space-y-1">
                    <label className="text-[10px] font-bold text-blue-400 uppercase">Code</label>
                    <input 
                        value={newEntityCode}
                        onChange={e => setNewEntityCode(e.target.value)}
                        placeholder="e.g. 10A"
                        className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsAddingEntity(null)} className="px-4 py-2 bg-white text-slate-500 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50">Cancel</button>
                    <button onClick={() => handleAddEntity(type)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">Save</button>
                </div>
            </div>
        )}

        <div className="divide-y divide-slate-100">
          {items.map(item => (
            <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
               {editingId === item.id ? (
                   <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                        <input 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 p-2 border border-blue-300 rounded-lg text-sm font-bold outline-none bg-white"
                        />
                        <input 
                            value={editCode}
                            onChange={e => setEditCode(e.target.value)}
                            className="w-full sm:w-24 p-2 border border-blue-300 rounded-lg text-sm font-bold outline-none bg-white"
                        />
                        <div className="flex gap-2">
                             <button onClick={saveEditing} className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Check className="w-4 h-4" /></button>
                             <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                   </div>
               ) : (
                   <>
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shrink-0">
                            {item.shortCode || '?'}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.shortCode}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => startEditing(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete ${item.name}? This cannot be undone.`)) {
                              deleteEntity(item.id);
                            }
                          }} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                   </>
               )}
            </div>
          ))}
          {items.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">No {type === 'CLASS' ? 'classes' : 'teachers'} found.</div>
          )}
        </div>
      </div>
    );
  };

  const renderStudentManager = () => {
    if (classes.length === 0) return (
        <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">No Classes Found</p>
            <p className="text-xs text-slate-400 mt-1">Please create a Class in the 'Classes' tab before adding students.</p>
        </div>
    );

    const currentClassStudents = students.filter(s => s.classId === targetClassId);

    return (
        <div className="space-y-6">
            {/* Import / Add Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                     <div>
                         <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Student Enrollment</h3>
                         <p className="text-xs text-slate-400 mt-1">Manage students for specific classes</p>
                     </div>
                     <select 
                        value={targetClassId} 
                        onChange={e => setTargetClassId(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                     >
                         {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Bulk Import */}
                     <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk Import (CSV Format)</label>
                         <textarea 
                             value={bulkStudentInput}
                             onChange={e => setBulkStudentInput(e.target.value)}
                             placeholder={`John Doe, R-001\nJane Smith, R-002\nMike Johnson`}
                             className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                         />
                         <div className="flex justify-between items-center">
                             <span className="text-[10px] text-slate-400 font-medium">Format: Name, Roll Number (One per line)</span>
                             <button onClick={handleBulkImportStudents} disabled={!bulkStudentInput.trim()} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
                                 Process Import
                             </button>
                         </div>
                     </div>

                     {/* Single Add */}
                     <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                         <h4 className="font-bold text-slate-700 text-sm mb-4">Quick Add Student</h4>
                         <div className="space-y-3">
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                                 <input 
                                     value={newStudentName}
                                     onChange={e => setNewStudentName(e.target.value)}
                                     className="w-full p-2.5 mt-1 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-300"
                                     placeholder="Student Name"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll Number</label>
                                 <input 
                                     value={newStudentRoll}
                                     onChange={e => setNewStudentRoll(e.target.value)}
                                     className="w-full p-2.5 mt-1 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-300"
                                     placeholder="e.g. 2024-001"
                                 />
                             </div>
                             <button onClick={handleAddSingleStudent} disabled={!newStudentName.trim()} className="w-full py-2.5 mt-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-blue-700 disabled:opacity-50">
                                 Add Student
                             </button>
                         </div>
                     </div>
                 </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-bold text-slate-700 text-sm">Enrolled Students ({currentClassStudents.length})</h4>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {currentClassStudents.map(student => (
                        <div key={student.id} className="p-3 px-5 flex justify-between items-center hover:bg-slate-50">
                            <div>
                                <p className="text-sm font-bold text-slate-800">{student.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{student.rollNumber}</p>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Remove ${student.name} from class?`)) {
                                        deleteStudent(student.id);
                                    }
                                }}
                                className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {currentClassStudents.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">No students in this class yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderTimeSlotEditor = () => {
      return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Timetable Structure</h3>
                      <p className="text-xs text-slate-400 mt-1">Configure daily periods and duration</p>
                  </div>
                  <div className="flex gap-2">
                      {!isEditingSlots ? (
                          <button onClick={() => setIsEditingSlots(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100">
                              Edit Slots
                          </button>
                      ) : (
                          <>
                            <button onClick={() => { setLocalTimeSlots(timeSlots); setIsEditingSlots(false); }} className="px-4 py-2 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 rounded-xl">
                                Cancel
                            </button>
                            <button onClick={handleSaveSlots} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-blue-700">
                                Save Changes
                            </button>
                          </>
                      )}
                  </div>
              </div>

              <div className="p-6">
                  <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <div className="col-span-1">#</div>
                          <div className="col-span-9">Time Range</div>
                          <div className="col-span-2 text-center">Action</div>
                      </div>
                      {localTimeSlots.map((slot, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="col-span-1 font-black text-slate-700 text-center bg-white w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border border-slate-100">
                                  {slot.period}
                              </div>
                              <div className="col-span-9">
                                  {isEditingSlots ? (
                                      <input 
                                          value={slot.timeRange} 
                                          onChange={(e) => handleSlotChange(idx, 'timeRange', e.target.value)}
                                          className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                                          placeholder="e.g. 08:00 - 09:00"
                                      />
                                  ) : (
                                      <div className="text-sm font-bold text-slate-700 pl-2">{slot.timeRange}</div>
                                  )}
                              </div>
                              <div className="col-span-2 flex justify-center">
                                  {isEditingSlots && (
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm('Delete this time slot?')) {
                                                  handleRemoveSlot(idx);
                                              }
                                          }} 
                                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                      
                      {isEditingSlots && (
                          <button onClick={handleAddSlot} className="w-full py-3 mt-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center">
                              <Plus className="w-4 h-4 mr-2" /> Add Period
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  if (aiImportStatus === 'REVIEW' && aiImportResult) {
    const isTeacherWise = aiImportResult.detectedType === 'TEACHER_WISE';
    return (
      <div className="max-w-4xl mx-auto pb-10 px-2 sm:px-0 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
              <div className="bg-slate-900 p-6 sm:p-8 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black flex items-center uppercase tracking-widest">
                        <Sparkles className="w-5 h-5 mr-3 text-blue-400" /> AI Import Review
                    </h2>
                    <p className="text-slate-400 text-xs mt-2 font-bold">
                        Extracted <b>{aiImportResult.profiles.length}</b> {isTeacherWise ? 'Teacher' : 'Class'} schedules.
                    </p>
                  </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {aiImportResult.unknownCodes.map(code => (
                          <div key={code} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Map code: {code}</span>
                              <input 
                                  type="text"
                                  placeholder={isTeacherWise ? "Assign to Class..." : "Assign to Teacher..."}
                                  value={mappings[code] || ''}
                                  onChange={(e) => setMappings(prev => ({ ...prev, [code]: e.target.value }))}
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none"
                              />
                          </div>
                      ))}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                      <button onClick={cancelAiImport} className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>
                      <button onClick={() => finalizeAiImport(mappings)} className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg">Connect Data</button>
                  </div>
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex gap-1 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit max-w-full overflow-x-auto scrollbar-hide shadow-sm mx-auto">
        {(['general', 'timetable', 'teachers', 'classes', 'students', 'import'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">General Configuration</h3>
              <div className="flex gap-2">
                  <button onClick={handleExportData} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center transition-all">
                      <Download className="w-3.5 h-3.5 mr-2" /> Export Data
                  </button>
                  <button 
                      onClick={handleSelectKey}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 flex items-center transition-all"
                  >
                      <Key className="w-3.5 h-3.5 mr-2" /> Select Gemini Key
                  </button>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">School Name</label>
              <input type="text" value={schoolName} onChange={e => updateSchoolName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
              <input type="text" value={academicYear} onChange={e => updateAcademicYear(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white transition-all outline-none" />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                  <div>
                      <h4 className="text-rose-700 font-bold text-sm">Danger Zone</h4>
                      <p className="text-rose-500 text-xs mt-1">Resetting will delete all data including students and schedules.</p>
                  </div>
                  <button onClick={() => { if(window.confirm('Are you absolutely sure? This cannot be undone.')) resetData(); }} className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5 mr-2 inline" /> Factory Reset
                  </button>
              </div>
          </div>
        </div>
      )}

      {activeTab === 'timetable' && renderTimeSlotEditor()}
      {activeTab === 'teachers' && renderEntityList('TEACHER')}
      {activeTab === 'classes' && renderEntityList('CLASS')}
      {activeTab === 'students' && renderStudentManager()}

      {activeTab === 'import' && (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden text-center">
          {aiImportStatus === 'PROCESSING' && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-10 flex flex-col items-center justify-center animate-in fade-in">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Intelligent Extraction in Progress...</h3>
                  <p className="text-slate-400 text-xs mt-2">Reasoning through document structure</p>
              </div>
          )}
          
          <div className="max-w-xl mx-auto space-y-8">
            <div className="flex flex-col items-center">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 mb-4">
                    <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Gemini Powered Scanner</h3>
                <p className="text-slate-400 text-xs mt-2 font-bold max-w-sm">For best results, use a high-resolution scan or clear PDF of your master timetable.</p>
            </div>
            
            {aiImportErrorMessage && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col items-center gap-3 animate-in shake">
                    <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest">
                        <AlertCircle className="w-4 h-4" /> {aiImportErrorMessage}
                    </div>
                    <button 
                        onClick={handleSelectKey}
                        className="flex items-center px-4 py-2 bg-white border border-rose-200 text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors shadow-sm"
                    >
                        <Key className="w-3.5 h-3.5 mr-2" /> Re-select API Key
                    </button>
                </div>
            )}

            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="w-10 h-10 text-blue-500 mb-4 mx-auto group-hover:scale-110 transition-transform" />
              <h4 className="font-black text-slate-700 uppercase tracking-widest text-[10px] mb-4">Click to upload PDF or Image</h4>
              <input type="file" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if(f) await startAiImport(f); }} accept=".pdf,image/*" className="hidden" />
              <div className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg inline-block">Browse Files</div>
            </div>
            
            <textarea value={aiTimetableInput} onChange={e => setAiTimetableInput(e.target.value)} placeholder="Alternatively, paste the timetable text here..." className="w-full h-40 p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-50" />
            <button onClick={() => startAiImport(undefined, aiTimetableInput)} disabled={!aiTimetableInput.trim()} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all">Start Intelligent Scan</button>
            
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-slate-400 font-bold hover:text-blue-500 flex items-center justify-center gap-1 mt-4">
                View Billing Documentation <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
