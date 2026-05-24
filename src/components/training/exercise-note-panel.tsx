'use client';

import { useState, useEffect } from 'react';

interface NoteEntry {
  _id: string;
  content: string;
  createdAt: string;
}

interface ExerciseNoteDoc {
  _id: string;
  entries: NoteEntry[];
}

interface ExerciseNotePanelProps {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
}

export function ExerciseNotePanel({ memberId, exerciseId, exerciseName, sessionId }: ExerciseNotePanelProps) {
  const [noteDoc, setNoteDoc] = useState<ExerciseNoteDoc | null>(null);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/exercise-notes?memberId=${memberId}&exerciseId=${exerciseId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ExerciseNoteDoc | null) => setNoteDoc(data))
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [memberId, exerciseId]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exercise-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          exerciseId,
          exerciseName,
          content: newNote.trim(),
          sessionId,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ExerciseNoteDoc;
        setNoteDoc(updated);
        setNewNote('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(entryId: string) {
    if (!noteDoc || !editContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exercise-notes/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: noteDoc._id, content: editContent.trim() }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ExerciseNoteDoc;
        setNoteDoc(updated);
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[#1e1e1e] pt-3 space-y-2">
      <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#93c5fd]">
        Coach Notes
      </div>

      {noteDoc?.entries.map((entry) => (
        <div key={entry._id} className="bg-[#0a0a0a] rounded-md p-2">
          <div className="text-[8px] text-[#444] mb-1">
            {new Date(entry.createdAt).toLocaleDateString()}
          </div>
          {editingId === entry._id ? (
            <div className="space-y-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                aria-label="Edit note"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white p-1.5 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveEdit(entry._id)}
                  disabled={saving}
                  className="text-[9px] text-white hover:text-white/80"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-[9px] text-[#555] hover:text-[#888]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-2">
              <div className="text-[10px] text-[#888]">{entry.content}</div>
              <button
                type="button"
                onClick={() => { setEditingId(entry._id); setEditContent(entry.content); }}
                className="text-[8px] text-[#444] hover:text-[#666] shrink-0"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          onKeyDown={(e) => { if (e.key === 'Enter') void addNote(); }}
          aria-label="New exercise note"
          className="flex-1 bg-[#0a0a0a] border border-dashed border-[#1e1e1e] rounded-md text-[10px] text-white placeholder:text-[#333] px-2 py-1.5 focus:outline-none focus:border-[#333]"
        />
        <button
          type="button"
          onClick={() => void addNote()}
          disabled={saving || !newNote.trim()}
          className="text-[9px] text-[#555] hover:text-[#888] disabled:opacity-30 shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}
