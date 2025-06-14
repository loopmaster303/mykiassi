// src/components/ui/tools/ChatThreads.tsx
import React from 'react';

interface Thread {
  id: string;
  title: string;
}

interface ChatThreadsProps {
  threads: Thread[];
  activeThreadId: string | null;
  setActiveThread: (id: string) => void;
  updateThread: (id: string, data: Partial<Thread>) => void;
  deleteThread: (id: string) => void;
}

const ChatThreads: React.FC<ChatThreadsProps> = ({
  threads = [],
  activeThreadId,
  setActiveThread,
  updateThread,
  deleteThread
}) => {
  const hasThreads = threads.length > 0;

  return (
    <ul className="flex-1 overflow-auto space-y-1">
      {hasThreads ? (
        threads.map((thread) => (
          <li key={thread.id} className="flex items-center justify-between group">
            <button
              onClick={() => setActiveThread(thread.id)}
              className={`flex-1 text-left px-3 py-2 rounded truncate ${
                thread.id === activeThreadId ? 'bg-muted font-medium' : 'hover:bg-muted'
              }`}
              title={thread.title}
            >
              {thread.title || 'Unbenannter Thread'}
            </button>
            <div className="flex items-center space-x-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newTitle = prompt('Neuer Name für den Thread', thread.title);
                  if (newTitle !== null) {
                    const trimmed = newTitle.trim();
                    if (trimmed && trimmed !== thread.title) {
                      updateThread(thread.id, { title: trimmed });
                    }
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-200"
                title="Thread umbenennen"
                aria-label="Umbenennen"
              >
                🖉
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Thread "${thread.title}" wirklich löschen?`)) {
                    deleteThread(thread.id);
                  }
                }}
                className="p-1 text-red-500 hover:text-red-700"
                title="Thread löschen"
                aria-label="Löschen"
              >
                🗑
              </button>
            </div>
          </li>
        ))
      ) : (
        <li className="px-3 py-2 text-sm text-muted">Keine Threads vorhanden</li>
      )}
    </ul>
  );
};

export default ChatThreads;