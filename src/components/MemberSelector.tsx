import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, KeyRound, Copy } from 'lucide-react';
import type { TeamMember } from '../types';

interface MemberSelectorProps {
  members: TeamMember[];
  selectedMemberId: string | null;
  onSelect: (memberId: string) => void;
  onAddMember?: (member: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  onDeleteMember?: (memberId: string) => void;
  onEditMember?: (member: TeamMember) => void;
  isAdmin?: boolean;
}

export function MemberSelector({
  members,
  selectedMemberId,
  onSelect,
  onAddMember,
  onDeleteMember,
  onEditMember,
  isAdmin = false,
}: MemberSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  const handleAdd = () => {
    if (!newName.trim() || !onAddMember) return;
    onAddMember({ name: newName.trim(), role: newRole.trim() || 'Développeur' });
    setNewName('');
    setNewRole('');
    setIsAdding(false);
  };

  const startEditing = (member: TeamMember) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditRole(member.role);
  };

  const handleEdit = (member: TeamMember) => {
    if (!editName.trim() || !onEditMember) return;
    onEditMember({ ...member, name: editName.trim(), role: editRole.trim() || 'Développeur' });
    setEditingId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Sélectionner un membre</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member, index) => (
          <div
            key={member.id}
            className={`relative group p-4 rounded-xl border-2 transition-all cursor-pointer
              ${selectedMemberId === member.id
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
          >
            {editingId === member.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nom"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Rôle"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="flex-1 p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Check className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  onClick={() => onSelect(member.id)}
                  className="flex items-center gap-3"
                >
                  <div className={`w-12 h-12 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]}
                                  flex items-center justify-center text-white font-bold`}>
                    {getInitials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-sm text-gray-500 truncate">{member.role}</p>
                    {isAdmin && member.accessCode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(member.accessCode);
                        }}
                        className="flex items-center gap-1 mt-1 text-xs text-primary-600 hover:text-primary-800"
                        title="Cliquer pour copier"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span className="font-mono">{member.accessCode}</span>
                        <Copy className="w-3 h-3 opacity-50" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit/Delete buttons - Admin only */}
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(member); }}
                      className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-500"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteMember?.(member.id); }}
                      className="p-1.5 bg-red-50 rounded-lg hover:bg-red-100 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add Member Button/Form - Admin only */}
        {isAdmin && (
          isAdding ? (
            <div className="p-4 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du membre"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Rôle (ex: Dev Front)"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="flex-1 p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => { setIsAdding(false); setNewName(''); setNewRole(''); }}
                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50
                         hover:border-primary-400 hover:bg-primary-50 transition-all
                         flex items-center justify-center gap-2 text-gray-500 hover:text-primary-600"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un membre</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
