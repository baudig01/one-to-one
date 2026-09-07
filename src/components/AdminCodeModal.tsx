import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface AdminCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminCodeModal({ isOpen, onClose, onSuccess }: AdminCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  // Fermeture au clavier
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lift animate-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Accès admin"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warn-100 text-warn-700">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Accès admin</h2>
              <p className="text-xs text-slate-500">Réservé au lead de l'équipe</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="admin-code">
              Code d'accès
            </label>
            <input
              id="admin-code"
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              placeholder="••••••"
              className={`input-field text-center tracking-[0.3em] ${
                error ? 'border-negative-400 bg-negative-50 focus:ring-negative-500/10' : ''
              }`}
              autoFocus
            />
            {error && <p className="mt-1.5 text-sm text-negative-600">Code incorrect</p>}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1">
              <ShieldCheck className="h-4 w-4" />
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
