
import React, { useState } from 'react';
import { Lock, X, ArrowRight, AlertCircle } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess, title = "Security Check" }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === 'closed') {
      onSuccess();
      setPassword('');
      setError(false);
      onClose();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-gray-800 flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-3">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
              {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Enter Admin Password
              </label>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all font-bold text-gray-800 placeholder-gray-300 ${
                  error ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
                }`}
                placeholder="••••••"
              />
              {error && (
                <div className="flex items-center mt-2 text-red-500 text-xs font-bold animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Incorrect password
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
            >
              Unlock Access <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
