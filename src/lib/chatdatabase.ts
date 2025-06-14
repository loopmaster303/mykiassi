import Dexie, { Table } from 'dexie';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface ChatThread {
  id: string;
  title: string;
  model: string;
  style: string;
  messages: ChatMessage[];
  updatedAt: number;
  persona?: string;
  tool?: string;
  memory?: ChatMessage[];
}

export class ChatDatabase extends Dexie {
  [x: string]: any;
  threads!: Table<ChatThread, string>;

  constructor() {
    super('ChatDatabase');
    this.version(1).stores({
      threads: 'id, title, updatedAt'
    });
  }
}

export const db = new ChatDatabase();