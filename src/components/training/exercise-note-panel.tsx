'use client';

import { useReducer, useEffect } from 'react';

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

interface ExerciseNotePanelState {
  noteDoc: ExerciseNoteDoc | null;
  newNote: string;
  editingId: string | null;
  editContent: string;
  saving: boolean;
}

type ExerciseNotePanelAction =
  | { type: 'SET_NOTE_DOC'; value: ExerciseNoteDoc | null }
  | { type: 'SET_NEW_NOTE'; value: string }
  | { type: 'SET_EDITING_ID'; value: string | null }
  | { type: 'SET_EDIT_CONTENT'; value: string }
  | { type: 'SET_SAVING'; value: boolean };

function exerciseNotePanelReducer(state: ExerciseNotePanelState, action: ExerciseNotePanelAction): ExerciseNotePanelState {
  switch (action.type) {
    case 'SET_NOTE_DOC': return { ...state, noteDoc: action.value };
    case 'SET_NEW_NOTE': return { ...state, newNote: action.value };
    case 'SET_EDITING_ID': return { ...state, editingId: action.value };
    case 'SET_EDIT_CONTENT': return { ...state, editContent: action.value };
    case 'SET_SAVING': return { ...state, saving: action.value };
    default: return state;
  }
}

export function ExerciseNotePanel({ memberId, exerciseId, exerciseName, sessionId }: ExerciseNotePanelProps) {
  const [state, dispatch] = useReducer(exerciseNotePanelReducer, {
    noteDoc: null, newNote: '', editingId: null, editContent: '', saving: false,
  });
  const { noteDoc, newNote, editingId, editContent, saving } = state;

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/exercise-notes?memberId=${memberId}&exerciseId=${exerciseId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ExerciseNoteDoc | null) => dispatch({ type: 'SET_NOTE_DOC', value: data }))
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [memberId, exerciseId]);

  async function addNote() {
    if (!newNote.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
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
        dispatch({ type: 'SET_NOTE_DOC', value: updated });
        dispatch({ type: 'SET_NEW_NOTE', value: '' });
      }
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  async function saveEdit(entryId: string) {
    if (!noteDoc || !editContent.trim()) return;
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      const res = await fetch(`/api/exercise-notes/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: noteDoc._id, content: editContent.trim() }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ExerciseNoteDoc;
        dispatch({ type: 'SET_NOTE_DOC', value: updated });
        dispatch({ type: 'SET_EDITING_ID', value: null });
      }
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
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
                onChange={(e) => dispatch({ type: 'SET_EDIT_CONTENT', value: e.target.value })}
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
                  onClick={() => dispatch({ type: 'SET_EDITING_ID', value: null })}
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
                onClick={() => { dispatch({ type: 'SET_EDITING_ID', value: entry._id }); dispatch({ type: 'SET_EDIT_CONTENT', value: entry.content }); }}
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
          onChange={(e) => dispatch({ type: 'SET_NEW_NOTE', value: e.target.value })}
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
