import { useState } from 'react';
import { Plus, Check, Circle, User, UserCog, Trash2 } from 'lucide-react';
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

    const newAction: ActionItem = {
      id: crypto.randomUUID(),
      text: newActionText.trim(),
      assignee: newActionAssignee,
      completed: false,
      createdAt: new Date(),
    };

    onChange([...currentActions, newAction]);
    setNewActionText('');
  };

  const togglePreviousAction = (id: string) => {
    onUpdatePrevious(
      previousActions.map(action =>
        action.id === id
          ? { ...action, completed: !action.completed, completedAt: !action.completed ? new Date() : undefined }
          : action
      )
    );
  };

  const removeCurrentAction = (id: string) => {
    onChange(currentActions.filter(action => action.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addAction();
    }
  };

  const pendingPreviousActions = previousActions.filter(a => !a.completed);
  const completedPreviousActions = previousActions.filter(a => a.completed);

  return (
    <div className="space-y-6">
      {/* Previous Actions Review */}
      {previousActions.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span>📋</span>
            Actions du meeting précédent
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
              {completedPreviousActions.length}/{previousActions.length} terminées
            </span>
          </h4>

          <div className="space-y-2">
            {previousActions.map((action) => (
              <div
                key={action.id}
                onClick={() => togglePreviousAction(action.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${action.completed
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'}`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${action.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-orange-400'}`}
                >
                  {action.completed && <Check className="w-4 h-4" />}
                </div>
                <span className={`flex-1 ${action.completed ? 'line-through opacity-70' : ''}`}>
                  {action.text}
                </span>
                <span className="flex-shrink-0">
                  {action.assignee === 'lead' ? (
                    <UserCog className="w-4 h-4 opacity-50" />
                  ) : (
                    <User className="w-4 h-4 opacity-50" />
                  )}
                </span>
              </div>
            ))}
          </div>

          {pendingPreviousActions.length > 0 && (
            <p className="text-sm text-orange-600">
              ⚠️ {pendingPreviousActions.length} action(s) non terminée(s) - Cliquer pour marquer comme fait
            </p>
          )}
        </div>
      )}

      {/* New Actions */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span>✨</span>
          Nouvelles actions pour ce sprint
        </h4>

        {/* Assignee Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setNewActionAssignee('member')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${newActionAssignee === 'member'
                ? 'bg-blue-50 border-blue-400 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            <User className="w-4 h-4" />
            <span>Membre</span>
          </button>
          <button
            onClick={() => setNewActionAssignee('lead')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm
              ${newActionAssignee === 'lead'
                ? 'bg-purple-50 border-purple-400 text-purple-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            <UserCog className="w-4 h-4" />
            <span>Lead (toi)</span>
          </button>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newActionText}
            onChange={(e) => setNewActionText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ajouter une action..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={addAction}
            disabled={!newActionText.trim()}
            className="px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Current Actions List */}
        {currentActions.length > 0 && (
          <div className="space-y-2">
            {currentActions.map((action) => (
              <div
                key={action.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2
                  ${action.assignee === 'lead'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-blue-50 border-blue-200'}`}
              >
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-sm">{action.text}</span>
                <span className="flex-shrink-0 text-xs opacity-50">
                  {action.assignee === 'lead' ? 'Lead' : 'Membre'}
                </span>
                <button
                  onClick={() => removeCurrentAction(action.id)}
                  className="p-1 hover:bg-black/10 rounded transition-colors text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {currentActions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Ajoute 1-2 actions concrètes pour le prochain sprint
          </p>
        )}
      </div>
    </div>
  );
}
