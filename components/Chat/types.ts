export interface Attachment {
  type: "image" | "file";
  url: string;
  name: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
