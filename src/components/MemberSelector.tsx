import { useState } from 'react';
import { Check, Copy, KeyRound, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { TeamMember } from '../types';

interface MemberSelectorProps {
  members: TeamMember[];
  selectedMemberId: string | null;
  onSelect: (memberId: string) => void;
  onAddMember?: (member: Omit<TeamMember, 'id' | 'createdAt' | 'accessCode'>) => void;
  onDeleteMember?: (memberId: string) => void;
  onEditMember?: (member: TeamMember) => void;
  isAdmin?: boolean;
}

const AVATAR_GRADIENTS = [
  'from-primary-500 to-primary-700',
  'from-energy-500 to-energy-700',
  'from-positive-500 to-positive-700',
  'from-warn-500 to-orange-600',
  'from-fuchsia-500 to-purple-700',
  'from-negative-500 to-negative-700',
];

const getInitials = (name: string) =>
  name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const copyAccessCode = async (member: TeamMember) => {
    try {
      await navigator.clipboard.writeText(member.accessCode);
      setCopiedId(member.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Presse-papier indisponible (contexte non sécurisé) — on n'interrompt pas l'utilisateur
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          {isAdmin ? 'Sélectionner un membre' : 'L\'équipe'}
        </h3>
        <span className="chip-neutral tabular-nums">{members.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {members.map((member, index) => {
          const isSelected = selectedMemberId === member.id;

          return (
            <div
              key={member.id}
              className={`group relative rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-primary-400 bg-primary-50/70 shadow-soft'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft'
              }`}
            >
              {editingId === member.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom"
                    className="input-sm"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="Rôle"
                    className="input-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="btn-primary flex-1 py-1.5 text-xs"
                    >
                      <Check className="h-4 w-4" />
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn-secondary px-2.5 py-1.5"
                      aria-label="Annuler"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : deletingId === member.id ? (
                <div className="space-y-3">
                  <p className="text-sm text-negative-800">
                    Supprimer <strong>{member.name}</strong> de l'équipe ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDeleteMember?.(member.id);
                        setDeletingId(null);
                      }}
                      className="btn-danger flex-1 py-1.5 text-xs"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="btn-secondary flex-1 py-1.5 text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(member.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-soft ${
                        AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
                      }`}
                    >
                      {getInitials(member.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{member.name}</span>
                      <span className="block truncate text-xs text-slate-500">{member.role}</span>
                    </span>
                    {isSelected && (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>

                  {/* Code d'accès personnel — admin uniquement */}
                  {isAdmin && member.accessCode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAccessCode(member);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-200"
                      title="Copier le code d'accès"
                    >
                      <KeyRound className="h-3 w-3" />
                      <span className="font-mono tracking-wider">{member.accessCode}</span>
                      {copiedId === member.id ? (
                        <Check className="h-3 w-3 text-positive-600" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  )}

                  {isAdmin && (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(member);
                        }}
                        className="rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-soft transition-colors hover:text-slate-900"
                        aria-label="Modifier le membre"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(member.id);
                        }}
                        className="rounded-lg bg-white/90 p-1.5 text-negative-500 shadow-soft transition-colors hover:text-negative-700"
                        aria-label="Supprimer le membre"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Ajout d'un membre — admin uniquement */}
        {isAdmin &&
          (isAdding ? (
            <div className="space-y-2 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/60 p-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nom du membre"
                className="input-sm"
                autoFocus
              />
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Rôle (ex : Dev Front)"
                className="input-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="btn-primary flex-1 py-1.5 text-xs"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewName('');
                    setNewRole('');
                  }}
                  className="btn-secondary px-2.5 py-1.5"
                  aria-label="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-500
                         transition-all hover:border-primary-400 hover:bg-primary-50/60 hover:text-primary-700"
            >
              <Plus className="h-5 w-5" />
              Ajouter un membre
            </button>
          ))}
      </div>

      {members.length === 0 && !isAdmin && (
        <p className="py-6 text-center text-sm text-slate-500">Aucun membre pour le moment.</p>
      )}
    </div>
  );
}
