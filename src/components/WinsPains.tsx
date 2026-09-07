import { useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import type { WinPainItem, WinPainType } from '../types';
import { WIN_PAIN_CONFIG, WIN_PAIN_TYPES } from '../types';

interface WinsPainsProps {
  items: WinPainItem[];
  onChange: (items: WinPainItem[]) => void;
}

/** Amorces de discussion, pour relancer l'échange quand ça bloque. */
const PROMPTS: Record<WinPainType, string[]> = {
  win: ['Une fierté du sprint', 'Un coup de main reçu', 'Une montée en compétence'],
  pain: ['Un sujet qui a traîné', 'Une charge trop lourde', 'Un manque de contexte'],
  idea: ['Une amélioration process', 'Un outil à tester', 'Une envie de mission'],
  blocker: ['Une dépendance externe', 'Une décision en attente', 'Un accès manquant'],
};

const signedWeight = (type: WinPainType) => {
  const config = WIN_PAIN_CONFIG[type];
  return `${config.polarity === 'positive' ? '+' : '−'}${config.weight}`;
};

export function WinsPains({ items, onChange }: WinsPainsProps) {
  const [newItemText, setNewItemText] = useState('');
  const [selectedType, setSelectedType] = useState<WinPainType>('win');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const addItem = () => {
    if (!newItemText.trim()) return;
    onChange([...items, { id: crypto.randomUUID(), type: selectedType, text: newItemText.trim() }]);
    setNewItemText('');
  };

  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

  const retypeItem = (id: string, type: WinPainType) =>
    onChange(items.map((item) => (item.id === id ? { ...item, type } : item)));

  const commitEdit = (id: string) => {
    const text = editText.trim();
    if (text) onChange(items.map((item) => (item.id === id ? { ...item, text } : item)));
    setEditingId(null);
    setEditText('');
  };

  const getItemsByType = (type: WinPainType) => items.filter((item) => item.type === type);
  const activeConfig = WIN_PAIN_CONFIG[selectedType];

  return (
    <div className="space-y-5">
      {/* Sélecteur de type — le poids affiché explique son effet sur le ressenti */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WIN_PAIN_TYPES.map((type) => {
          const config = WIN_PAIN_CONFIG[type];
          const count = getItemsByType(type).length;
          const active = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all ${
                active ? config.chipActive : config.chip
              }`}
            >
              <span className="text-lg leading-none">{config.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{config.label}</span>
                <span className={`block text-[10px] ${active ? 'text-white/75' : 'text-slate-400'}`}>
                  ressenti {signedWeight(type)}
                </span>
              </span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Saisie */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder={activeConfig.placeholder}
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!newItemText.trim()}
            className="btn-primary px-4"
            aria-label={`Ajouter : ${activeConfig.label}`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Amorces :</span>
          {PROMPTS[selectedType].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setNewItemText(prompt)}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] text-slate-500
                         transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Listes par catégorie */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {WIN_PAIN_TYPES.map((type) => {
            const config = WIN_PAIN_CONFIG[type];
            const typeItems = getItemsByType(type);
            if (typeItems.length === 0) return null;

            return (
              <div key={type} className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>{config.emoji}</span>
                  <span>{config.plural}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 text-[11px] tabular-nums text-slate-500">
                    {typeItems.length}
                  </span>
                </h4>

                <div className="space-y-2">
                  {typeItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group rounded-xl border p-3 animate-slideUp ${config.surface}`}
                    >
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="input-sm flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => commitEdit(item.id)}
                            className="rounded-lg bg-white/70 p-1.5 hover:bg-white"
                            aria-label="Valider"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg p-1.5 hover:bg-black/5"
                            aria-label="Annuler"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-sm leading-snug">{item.text}</p>
                            <div className="flex flex-shrink-0 gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditText(item.text);
                                }}
                                className="rounded-lg p-1 transition-colors hover:bg-black/10"
                                aria-label="Modifier"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="rounded-lg p-1 transition-colors hover:bg-black/10"
                                aria-label="Supprimer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Reclassement : change immédiatement le ressenti calculé */}
                          <label className="mt-1.5 flex items-center gap-1.5 text-[11px] opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <span className="sr-only">Reclasser cet élément</span>
                            <select
                              value={item.type}
                              onChange={(e) => retypeItem(item.id, e.target.value as WinPainType)}
                              className="rounded-lg border border-black/10 bg-white/70 px-1.5 py-0.5 text-[11px]"
                            >
                              {WIN_PAIN_TYPES.map((option) => (
                                <option key={option} value={option}>
                                  {WIN_PAIN_CONFIG[option].emoji} {WIN_PAIN_CONFIG[option].label} (
                                  {signedWeight(option)})
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
          <p className="text-3xl">🎯</p>
          <p className="mt-2 font-medium text-slate-700">Rien de saisi pour l'instant</p>
          <p className="mt-1 text-sm text-slate-500">
            Choisis un type puis note les retours du sprint : le ressenti se calcule au fur et à mesure.
          </p>
        </div>
      )}
    </div>
  );
}
