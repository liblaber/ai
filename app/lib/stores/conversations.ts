import { create } from 'zustand';
import { getConversations, type SimpleConversationResponse } from '~/lib/persistence/conversations';

interface ConversationsStore {
  conversations: SimpleConversationResponse[];
  lastLoaded: number | null;
  setConversations: (conversations: SimpleConversationResponse[]) => void;
  loadConversations: () => Promise<void>;
}

const DEDUPE_INTERVAL = 5000;

export const useConversationsStore = create<ConversationsStore>((set, get) => ({
  conversations: [],
  lastLoaded: null,
  setConversations: (conversations) => set({ conversations }),
  loadConversations: async () => {
    const { lastLoaded } = get();
    const now = Date.now();

    if (lastLoaded && now - lastLoaded < DEDUPE_INTERVAL) {
      return;
    }

    const conversations = await getConversations();
    set({ conversations, lastLoaded: now });
  },
}));
