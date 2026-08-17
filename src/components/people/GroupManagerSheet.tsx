import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CustomGroup } from "../../types";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

interface Props {
  groups: CustomGroup[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (groupId: string, nextName: string) => void;
  onDelete: (group: CustomGroup) => void;
}

export default function GroupManagerSheet({ groups, onClose, onCreate, onRename, onDelete }: Props) {
  useBodyScrollLock();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName("");
  };

  return (
    <div className="saram-sheet-overlay" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()} className="saram-sheet p-4">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">그룹 관리</h2>
            <p className="mt-1 text-sm text-[#7c6252]">그룹을 정리해도 사람과 이야기는 삭제되지 않아요.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-[#fff1e8] p-2 text-[#5a392a]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-5 flex gap-2">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="새 그룹 이름" className="saram-input h-12 flex-1 text-sm" />
          <button type="button" onClick={submitNew} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d85b36] text-white">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 max-h-[45vh] space-y-2 overflow-y-auto">
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-[#ead8c9] bg-white/70 p-5 text-center text-sm text-[#7c6252]">아직 만든 그룹이 없어요.</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-[#ead8c9] bg-white/70 p-3">
                {editingId === group.id ? (
                  <div className="flex gap-2">
                    <input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="saram-input h-11 flex-1 text-sm" />
                    <button onClick={() => { if (editingName.trim()) onRename(group.id, editingName.trim()); setEditingId(null); }} className="rounded-full bg-[#d85b36] px-4 text-sm font-semibold text-white">저장</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#2f1b12]">{group.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingId(group.id); setEditingName(group.name); }} className="rounded-full p-2 text-[#8d5b45]" aria-label={`${group.name} 수정`}>
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete(group)} className="rounded-full p-2 text-[#c95735]" aria-label={`${group.name} 삭제`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
