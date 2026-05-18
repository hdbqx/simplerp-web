import type { Variable, VariableStage } from './db';

export class VariableEngine {
  private variables: Variable[];
  private stages: Map<number, VariableStage[]>;

  constructor(variables: Variable[] = [], stages: VariableStage[] = []) {
    this.variables = variables;
    this.stages = new Map();
    for (const stage of stages) {
      const existing = this.stages.get(stage.variable_id) || [];
      existing.push(stage);
      this.stages.set(stage.variable_id, existing);
    }
  }

  getVariables(): Variable[] {
    return this.variables;
  }

  getVariable(key: string): Variable | undefined {
    return this.variables.find(v => v.key === key);
  }

  setVariable(key: string, value: any): Variable | null {
    const index = this.variables.findIndex(v => v.key === key);
    if (index === -1) return null;
    this.variables[index] = { ...this.variables[index], value };
    return this.variables[index];
  }

  evaluateCondition(condition: string, value: any): boolean {
    try {
      const func = new Function('v', `return ${condition};`);
      return func(value);
    } catch {
      return false;
    }
  }

  getActiveStage(variable: Variable): VariableStage | null {
    const stages = this.stages.get(variable.id!) || [];
    const activeStages = stages.filter(s => s.is_active).sort((a, b) => b.priority - a.priority);
    for (const stage of activeStages) {
      if (this.evaluateCondition(stage.condition, variable.value)) {
        return stage;
      }
    }
    return null;
  }

  getActiveStagePrompts(): string[] {
    const prompts: string[] = [];
    for (const variable of this.variables) {
      const stage = this.getActiveStage(variable);
      if (stage && stage.stage_prompt) {
        prompts.push(stage.stage_prompt);
      }
    }
    return prompts;
  }

  replaceVariables(text: string, settings?: any, char?: any): string {
    if (!text) return text;
    let result = text;
    for (const variable of this.variables) {
      const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'gi');
      result = result.replace(regex, String(variable.value ?? ''));
    }
    return result;
  }

  getVariableDisplay(variable: Variable): { value: any; percentage?: number; stage?: VariableStage } {
    const stage = this.getActiveStage(variable);
    let percentage: number | undefined;
    if (variable.type === 'number' || variable.type === 'range') {
      if (variable.min_value !== undefined && variable.max_value !== undefined) {
        const range = variable.max_value - variable.min_value;
        if (range > 0) {
          percentage = ((variable.value - variable.min_value) / range) * 100;
        }
      }
    }
    return { value: variable.value, percentage, stage: stage || undefined };
  }
}
