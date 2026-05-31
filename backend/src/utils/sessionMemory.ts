export interface MemoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface UserSessionMemory {
  messages: MemoryMessage[];
  plannerSummary?: string;
  updatedAt: number;
}

export class AssistantSessionMemory {
  private static memories = new Map<string, UserSessionMemory>();
  
  // 5 user turns + 5 assistant responses = 10 messages maximum limit
  private static readonly MAX_LIMIT = 10;

  // 30 minutes TTL in milliseconds
  private static readonly TTL_MS = 30 * 60 * 1000;

  /**
   * Retrieves active memory records for a specific user, evicting expired caches
   */
  static getMemory(userId: string): UserSessionMemory {
    const now = Date.now();

    // 1. Proactive passive heap cleanup of other expired records
    for (const [key, mem] of this.memories.entries()) {
      if (now - mem.updatedAt > this.TTL_MS) {
        this.memories.delete(key);
      }
    }

    // 2. Fetch or create targeted memory
    const existing = this.memories.get(userId);
    if (!existing || (now - existing.updatedAt > this.TTL_MS)) {
      const freshMemory: UserSessionMemory = {
        messages: [],
        updatedAt: now,
      };
      this.memories.set(userId, freshMemory);
      return freshMemory;
    }

    return existing;
  }

  /**
   * Appends a new conversation message and trims history automatically
   */
  static appendMessage(userId: string, role: 'user' | 'model', text: string): void {
    const memory = this.getMemory(userId);
    memory.messages.push({ role, text });
    memory.updatedAt = Date.now();

    // Auto-trim to retain only the last MAX_LIMIT messages (5 turns)
    if (memory.messages.length > this.MAX_LIMIT) {
      memory.messages = memory.messages.slice(-this.MAX_LIMIT);
    }
  }

  /**
   * Saves/Updates the cached planner timeline summary
   */
  static updatePlannerSummary(userId: string, summary: string): void {
    const memory = this.getMemory(userId);
    memory.plannerSummary = summary;
    memory.updatedAt = Date.now();
  }

  /**
   * Clear active session memory logs
   */
  static clearMemory(userId: string): void {
    this.memories.delete(userId);
  }
}
