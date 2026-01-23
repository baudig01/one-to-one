import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { WinPainItem } from '../types';
import { WIN_PAIN_CONFIG } from '../types';

interface WinsPainsProps {
  items: WinPainItem[];
  onChange: (items: WinPainItem[]) => void;
}

type ItemType = keyof typeof WIN_PAIN_CONFIG;

export function WinsPains({ items, onChange }: WinsPainsProps) {
  const [newItemText, setNewItemText] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType>('win');

  const addItem = () => {
    if (!newItemText.trim()) return;

    const newItem: WinPainItem = {
      id: crypto.randomUUID(),
      type: selectedType,
      text: newItemText.trim(),
    };

    onChange([...items, newItem]);
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItem();
    }
  };

  const getItemsByType = (type: ItemType) => items.filter(item => item.type === type);

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(WIN_PAIN_CONFIG) as ItemType[]).map((type) => {
          const config = WIN_PAIN_CONFIG[type];
          const count = getItemsByType(type).length;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                ${selectedType === type
                  ? config.color + ' border-current shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="text-lg">{config.emoji}</span>
              <span className="font-medium">{config.label}</span>
              {count > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/50 rounded-full text-xs font-semibold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Input Field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Ajouter un ${WIN_PAIN_CONFIG[selectedType].label.toLowerCase()}...`}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={addItem}
          disabled={!newItemText.trim()}
          className="px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Items List by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(WIN_PAIN_CONFIG) as ItemType[]).map((type) => {
          const config = WIN_PAIN_CONFIG[type];
          const typeItems = getItemsByType(type);

          if (typeItems.length === 0) return null;

          return (
            <div key={type} className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <span>{config.emoji}</span>
                <span>{config.label}s ({typeItems.length})</span>
              </h4>
              <div className="space-y-2">
                {typeItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 ${config.color} animate-fadeIn`}
                  >
                    <span className="flex-1 text-sm">{item.text}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 hover:bg-black/10 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg mb-2">Aucun élément ajouté</p>
          <p className="text-sm">Commence par sélectionner un type et ajouter tes retours du sprint</p>
        </div>
      )}
    </div>
  );
}
