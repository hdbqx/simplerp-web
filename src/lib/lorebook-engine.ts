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
    const recentHistory = history.slice(-10);
    const contextText = this.buildContextText(input, recentHistory);

    const activeEntries = this.entries
      .filter(e => e.is_active)
      .sort((a, b) => b.priority - a.priority);

    for (const entry of activeEntries) {
      if (this.shouldTrigger(entry, contextText, input, recentHistory, variables, context)) {
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

  private buildContextText(input: string, history: Message[]): string {
    const parts = [input.toLowerCase()];
    for (const msg of history) {
      if (msg.content) {
        parts.push(msg.content.toLowerCase());
      }
    }
    return parts.join(' ');
  }

  private shouldTrigger(
    entry: LorebookV2Entry,
    contextText: string,
    currentInput: string,
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

    if (entry.trigger_count !== undefined && entry.trigger_count !== -1 && entry.trigger_count <= 0) {
      return false;
    }
    
    if (entry.probability < 1 && Math.random() > entry.probability) return false;

    const triggerMode = entry.trigger_mode || 'keyword';
    
    if (triggerMode === 'constant' || entry.is_constant) {
      return this.evaluateCondition(entry, variables, history, context);
    }

    let matchesTrigger = false;
    
    switch (triggerMode) {
      case 'keyword':
        matchesTrigger = this.matchKeywords(entry, contextText, currentInput, history);
        break;
      case 'regex':
        matchesTrigger = this.matchRegex(entry, contextText);
        break;
      default:
        matchesTrigger = this.matchKeywords(entry, contextText, currentInput, history);
    }

    if (!matchesTrigger) return false;

    return this.evaluateCondition(entry, variables, history, context);
  }

  private matchKeywords(
    entry: LorebookV2Entry,
    contextText: string,
    currentInput: string,
    history: Message[]
  ): boolean {
    if (!entry.keywords) return false;

    const keywords = entry.keywords.split(/[,，\n]/).map(k => k.trim().toLowerCase()).filter(k => k);
    if (keywords.length === 0) return false;

    const scanDepth = entry.scan_depth ?? 2;
    const scanTexts = [currentInput.toLowerCase()];
    for (let i = 0; i < Math.min(scanDepth, history.length); i++) {
      const msg = history[history.length - 1 - i];
      if (msg?.content) {
        scanTexts.push(msg.content.toLowerCase());
      }
    }
    const scanText = scanTexts.join(' ');

    const matchLogic = entry.match_logic || 'any';

    switch (matchLogic) {
      case 'any':
        return keywords.some(k => scanText.includes(k));
      
      case 'all':
        return keywords.every(k => scanText.includes(k));
      
      case 'not':
        return !keywords.some(k => scanText.includes(k));
      
      case 'expression':
        if (entry.match_expression) {
          return this.evaluateMatchExpression(entry.match_expression, keywords, scanText);
        }
        return keywords.some(k => scanText.includes(k));
      
      default:
        return keywords.some(k => scanText.includes(k));
    }
  }

  private evaluateMatchExpression(expression: string, keywords: string[], text: string): boolean {
    try {
      const keywordMatches: Record<string, boolean> = {};
      for (let i = 0; i < keywords.length; i++) {
        keywordMatches[`k${i}`] = text.includes(keywords[i]);
        keywordMatches[keywords[i]] = text.includes(keywords[i]);
      }
      
      let evalExpr = expression
        .replace(/\bAND\b/gi, '&&')
        .replace(/\bOR\b/gi, '||')
        .replace(/\bNOT\b/gi, '!');
      
      for (const [key, value] of Object.entries(keywordMatches)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evalExpr = evalExpr.replace(regex, String(value));
      }
      
      const func = new Function(`return (${evalExpr});`);
      return func();
    } catch {
      return false;
    }
  }

  private matchRegex(entry: LorebookV2Entry, contextText: string): boolean {
    if (!entry.regex_pattern) return false;
    
    try {
      const regex = new RegExp(entry.regex_pattern, 'i');
      return regex.test(contextText);
    } catch {
      return false;
    }
  }

  private evaluateCondition(
    entry: LorebookV2Entry,
    variables: Record<string, any>,
    history: Message[],
    context: any
  ): boolean {
    if (!entry.trigger_condition) return true;
    
    try {
      const func = new Function('variables', 'history', 'context', `return ${entry.trigger_condition};`);
      return func(variables, history, context);
    } catch {
      return false;
    }
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

  getTriggerStats(): Map<number, { count: number; lastTriggered: number }> {
    return new Map(this.triggerHistory);
  }
}
