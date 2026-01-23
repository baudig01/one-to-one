import { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface AdminCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminCodeModal({ isOpen, onClose, onSuccess }: AdminCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adminCode = import.meta.env.VITE_ADMIN_CODE;

    // Si pas de code configuré, accès libre
    if (!adminCode) {
      sessionStorage.setItem('isAdmin', 'true');
      onSuccess();
      return;
    }

    if (code === adminCode) {
      sessionStorage.setItem('isAdmin', 'true');
      setCode('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-800">Accès Admin</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code d'accès
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false); }}
              placeholder="Entrez le code"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500
                ${error ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">Code incorrect</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
