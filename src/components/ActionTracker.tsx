import { useState } from 'react';
import { AlertTriangle, Check, ListChecks, Plus, Sparkles, Trash2, User, UserCog } from 'lucide-react';
import type { ActionItem } from '../types';

interface ActionTrackerProps {
  currentActions: ActionItem[];
  previousActions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
  onUpdatePrevious: (actions: ActionItem[]) => void;
}

export function ActionTracker({
  currentActions,
  previousActions,
  onChange,
  onUpdatePrevious,
}: ActionTrackerProps) {
  const [newActionText, setNewActionText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState<'member' | 'lead'>('member');

  const addAction = () => {
    if (!newActionText.trim()) return;
    onChange([
      ...currentActions,
      {
        id: crypto.randomUUID(),
        text: newActionText.trim(),
        assignee: newActionAssignee,
        completed: false,
        createdAt: new Date(),
      },
    ]);
    setNewActionText('');
  };

  const togglePreviousAction = (id: string) => {
    onUpdatePrevious(
      previousActions.map((action) =>
        action.id === id
          ? {
              ...action,
              completed: !action.completed,
              completedAt: !action.completed ? new Date() : undefined,
            }
          : action
      )
    );
  };

  const removeCurrentAction = (id: string) => onChange(currentActions.filter((a) => a.id !== id));

  const completedPrevious = previousActions.filter((a) => a.completed).length;
  const pendingPrevious = previousActions.length - completedPrevious;
  const completionRate =
    previousActions.length === 0 ? 0 : Math.round((completedPrevious / previousActions.length) * 100);

  return (
    <div className="space-y-6">
      {/* ---------- Revue des actions précédentes ---------- */}
      {previousActions.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListChecks className="h-4 w-4 text-slate-400" />
              Actions du one-to-one précédent
            </h4>
            <span className="chip-neutral tabular-nums">
              {completedPrevious}/{previousActions.length} terminées · {completionRate}%
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-positive-500 transition-all duration-500 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>

          <div className="space-y-2">
            {previousActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => togglePreviousAction(action.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  action.completed
                    ? 'border-positive-200 bg-positive-50 text-positive-800'
                    : 'border-warn-200 bg-warn-50 text-warn-800 hover:border-warn-300 hover:bg-warn-100/70'
                }`}
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    action.completed
                      ? 'border-positive-500 bg-positive-500 text-white'
                      : 'border-warn-400 bg-white'
                  }`}
                >
                  {action.completed && <Check className="h-4 w-4" />}
                </span>
                <span className={`flex-1 text-sm ${action.completed ? 'line-through opacity-70' : ''}`}>
                  {action.text}
                </span>
                <span className="flex-shrink-0 opacity-50" title={action.assignee === 'lead' ? 'Lead' : 'Membre'}>
                  {action.assignee === 'lead' ? <UserCog className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
              </button>
            ))}
          </div>

          {pendingPrevious > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-warn-50 px-3 py-2 text-xs text-warn-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {pendingPrevious} action{pendingPrevious > 1 ? 's' : ''} non terminée
              {pendingPrevious > 1 ? 's' : ''} — elles seront reportées sur ce one-to-one.
            </p>
          )}
        </section>
      )}

      {previousActions.length > 0 && <div className="divider" />}

      {/* ---------- Nouvelles actions ---------- */}
      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sparkles className="h-4 w-4 text-primary-500" />
          Nouvelles actions pour le prochain sprint
        </h4>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setNewActionAssignee('member')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              newActionAssignee === 'member'
                ? 'bg-white text-primary-700 shadow-soft'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Pour le membre
          </button>
          <button
            type="button"
            onClick={() => setNewActionAssignee('lead')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              newActionAssignee === 'lead'
                ? 'bg-white text-primary-700 shadow-soft'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCog className="h-3.5 w-3.5" />
            Pour moi (lead)
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newActionText}
            onChange={(e) => setNewActionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addAction();
              }
            }}
            placeholder="Action concrète, avec un verbe…"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={addAction}
            disabled={!newActionText.trim()}
            className="btn-primary px-4"
            aria-label="Ajouter une action"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {currentActions.length > 0 ? (
          <div className="space-y-2">
            {currentActions.map((action) => (
              <div
                key={action.id}
                className={`group flex items-center gap-3 rounded-xl border p-3 animate-slideUp ${
                  action.assignee === 'lead'
                    ? 'border-primary-200 bg-primary-50/70'
                    : 'border-energy-200 bg-energy-50/70'
                }`}
              >
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white ${
                    action.assignee === 'lead' ? 'bg-primary-500' : 'bg-energy-500'
                  }`}
                >
                  {action.assignee === 'lead' ? (
                    <UserCog className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="flex-1 text-sm text-slate-800">{action.text}</span>
                <span className="flex-shrink-0 text-[11px] font-medium text-slate-400">
                  {action.assignee === 'lead' ? 'Lead' : 'Membre'}
                </span>
                <button
                  type="button"
                  onClick={() => removeCurrentAction(action.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-negative-50 hover:text-negative-600"
                  aria-label="Supprimer l'action"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-sm text-slate-500">
            1 à 2 actions concrètes suffisent — mieux vaut peu et tenu.
          </p>
        )}
      </section>
    </div>
  );
}
