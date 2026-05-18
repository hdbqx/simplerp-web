import type { LorebookV2Entry, Message } from './db';

export class LorebookEngine {
  private entries: LorebookV2Entry[];
  private triggerHistory: Map<number, { count: number; lastTriggered: number }>;
  private totalMessageCount: number = 0;

  constructor(entries: LorebookV2Entry[] = []) {
    this.entries = entries;
    this.triggerHistory = new Map();
  }

  setEntries(entries: LorebookV2Entry[]) {
    this.entries = entries;
  }

  incrementMessageCount() {
    this.totalMessageCount++;
  }

  scan(
    input: string,
    history: Message[],
    variables: Record<string, any> = {},
    context: any = {}
  ): LorebookV2Entry[] {
    const triggered: LorebookV2Entry[] = [];
    const contextText = (input + ' ' + history.map(m => m.content).join(' ')).toLowerCase();

    const activeEntries = this.entries
      .filter(e => e.is_active)
      .sort((a, b) => b.priority - a.priority);

    for (const entry of activeEntries) {
      if (this.shouldTrigger(entry, contextText, history, variables, context)) {
        triggered.push(entry);
        this.recordTrigger(entry.id!);
      }
    }

    const byParent = new Map<number | null, LorebookV2Entry[]>();
    for (const entry of triggered) {
      const parentId = entry.parent_id || null;
      const children = byParent.get(parentId) || [];
      children.push(entry);
      byParent.set(parentId, children);
    }

    const result: LorebookV2Entry[] = [];
    const addWithChildren = (entry: LorebookV2Entry, depth = 0) => {
      if (entry.insertion_depth !== undefined && depth > entry.insertion_depth) return;
      result.push(entry);
      const children = byParent.get(entry.id ?? null) || [];
      for (const child of children) {
        addWithChildren(child, depth + 1);
      }
    };

    for (const entry of byParent.get(null) || []) {
      addWithChildren(entry);
    }

    return result;
  }

  private shouldTrigger(
    entry: LorebookV2Entry,
    contextText: string,
    history: Message[],
    variables: Record<string, any>,
    context: any
  ): boolean {
    const historyData = this.triggerHistory.get(entry.id!);
    if (entry.use_once && historyData && historyData.count > 0) return false;
    if (entry.cooldown_messages > 0 && historyData) {
      const messagesSince = this.totalMessageCount - historyData.lastTriggered;
      if (messagesSince < entry.cooldown_messages) return false;
    }
    if (entry.probability < 1 && Math.random() > entry.probability) return false;

    let matchesKeywords = false;
    if (entry.keywords) {
      if (entry.keywords.trim() === '*') {
        matchesKeywords = true;
      } else {
        const keywords = entry.keywords.split(/[,，\n]/).map(k => k.trim().toLowerCase()).filter(k => k);
        matchesKeywords = keywords.some(k => contextText.includes(k));
      }
    }

    let matchesRegex = false;
    if (entry.regex_pattern) {
      try {
        const regex = new RegExp(entry.regex_pattern, 'i');
        matchesRegex = regex.test(contextText);
      } catch {
        matchesRegex = false;
      }
    }

    let matchesCondition = true;
    if (entry.trigger_condition) {
      try {
        const func = new Function('variables', 'history', 'context', `return ${entry.trigger_condition};`);
        matchesCondition = func(variables, history, context);
      } catch {
        matchesCondition = false;
      }
    }

    const hasAnyMatch = entry.keywords || entry.regex_pattern ? (matchesKeywords || matchesRegex) : true;
    return hasAnyMatch && matchesCondition;
  }

  private recordTrigger(entryId: number) {
    const existing = this.triggerHistory.get(entryId) || { count: 0, lastTriggered: this.totalMessageCount };
    this.triggerHistory.set(entryId, {
      count: existing.count + 1,
      lastTriggered: this.totalMessageCount
    });
  }

  buildInjection(triggered: LorebookV2Entry[]): { beforeSystem: string; afterSystem: string; last: string } {
    const byPosition = {
      beforeSystem: [] as string[],
      afterSystem: [] as string[],
      last: [] as string[]
    };

    for (const entry of triggered) {
      const position = entry.position || 'before_system';
      const arr = byPosition[position as keyof typeof byPosition] || byPosition.beforeSystem;
      arr.push(entry.content);
    }

    return {
      beforeSystem: byPosition.beforeSystem.join('\n---\n'),
      afterSystem: byPosition.afterSystem.join('\n---\n'),
      last: byPosition.last.join('\n---\n')
    };
  }

  resetTriggerHistory() {
    this.triggerHistory.clear();
    this.totalMessageCount = 0;
  }
}
