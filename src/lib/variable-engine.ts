import type { Variable, VariableStage } from './db';

export class VariableEngine {
  private variables: Variable[];
  private stages: Map<number, VariableStage[]>;
  private changeListeners: Array<(key: string, oldValue: any, newValue: any) => void> = [];

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

  getVariableById(id: number): Variable | undefined {
    return this.variables.find(v => v.id === id);
  }

  setVariable(key: string, value: any): Variable | null {
    const index = this.variables.findIndex(v => v.key === key);
    if (index === -1) return null;
    
    const oldValue = this.variables[index].value;
    this.variables[index] = { ...this.variables[index], value };
    
    this.notifyChange(key, oldValue, value);
    return this.variables[index];
  }

  setVariableById(id: number, value: any): Variable | null {
    const index = this.variables.findIndex(v => v.id === id);
    if (index === -1) return null;
    
    const oldValue = this.variables[index].value;
    this.variables[index] = { ...this.variables[index], value };
    
    this.notifyChange(this.variables[index].key, oldValue, value);
    return this.variables[index];
  }

  onChange(listener: (key: string, oldValue: any, newValue: any) => void) {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(key: string, oldValue: any, newValue: any) {
    for (const listener of this.changeListeners) {
      try {
        listener(key, oldValue, newValue);
      } catch (e) {
        console.error('Variable change listener error:', e);
      }
    }
  }

  evaluateCondition(condition: string, value: any, context?: any): boolean {
    try {
      const func = new Function('v', 'context', `return ${condition};`);
      return func(value, context);
    } catch {
      return false;
    }
  }

  getActiveStage(variable: Variable, context?: any): VariableStage | null {
    const stages = this.stages.get(variable.id!) || [];
    const activeStages = stages.filter(s => s.is_active).sort((a, b) => b.priority - a.priority);
    for (const stage of activeStages) {
      if (this.evaluateCondition(stage.condition, variable.value, context)) {
        return stage;
      }
    }
    return null;
  }

  getActiveStagePrompts(context?: any): string[] {
    const prompts: string[] = [];
    for (const variable of this.variables) {
      const stage = this.getActiveStage(variable, context);
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
      const displayValue = this.formatValueForDisplay(variable);
      result = result.replace(regex, displayValue);
    }
    return result;
  }

  private formatValueForDisplay(variable: Variable): string {
    const { value, type } = variable;
    
    switch (type) {
      case 'dict':
      case 'list':
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value ?? '');
      
      case 'boolean':
        return value ? '是' : '否';
      
      case 'number':
      case 'range':
        return String(value ?? 0);
      
      default:
        return String(value ?? '');
    }
  }

  getVariableDisplay(variable: Variable, context?: any): { 
    value: any; 
    percentage?: number; 
    stage?: VariableStage;
    formattedValue: string;
  } {
    const stage = this.getActiveStage(variable, context);
    let percentage: number | undefined;
    
    if (variable.type === 'number' || variable.type === 'range') {
      if (variable.min_value !== undefined && variable.max_value !== undefined) {
        const range = variable.max_value - variable.min_value;
        if (range > 0) {
          percentage = ((variable.value - variable.min_value) / range) * 100;
        }
      }
    }
    
    const formattedValue = this.formatValueForDisplay(variable);
    
    return { 
      value: variable.value, 
      percentage, 
      stage: stage === null ? undefined : stage,
      formattedValue
    };
  }

  validateValue(variable: Variable, newValue: any): { valid: boolean; error?: string; normalized?: any } {
    const { type, min_value, max_value } = variable;
    
    switch (type) {
      case 'number':
      case 'range': {
        const num = Number(newValue);
        if (isNaN(num)) {
          return { valid: false, error: '请输入有效数字' };
        }
        if (min_value !== undefined && num < min_value) {
          return { valid: false, error: `值不能小于 ${min_value}` };
        }
        if (max_value !== undefined && num > max_value) {
          return { valid: false, error: `值不能大于 ${max_value}` };
        }
        return { valid: true, normalized: num };
      }
      
      case 'boolean': {
        const bool = Boolean(newValue);
        return { valid: true, normalized: bool };
      }
      
      case 'string': {
        return { valid: true, normalized: String(newValue ?? '') };
      }
      
      case 'dict': {
        if (typeof newValue === 'object' && !Array.isArray(newValue)) {
          return { valid: true, normalized: newValue };
        }
        if (typeof newValue === 'string') {
          try {
            const parsed = JSON.parse(newValue);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              return { valid: true, normalized: parsed };
            }
          } catch {}
        }
        return { valid: false, error: '请输入有效的JSON对象' };
      }
      
      case 'list': {
        if (Array.isArray(newValue)) {
          return { valid: true, normalized: newValue };
        }
        if (typeof newValue === 'string') {
          try {
            const parsed = JSON.parse(newValue);
            if (Array.isArray(parsed)) {
              return { valid: true, normalized: parsed };
            }
          } catch {}
          const items = newValue.split(/[,，\n]/).map(s => s.trim()).filter(s => s);
          return { valid: true, normalized: items };
        }
        return { valid: false, error: '请输入有效的数组' };
      }
      
      default:
        return { valid: true, normalized: newValue };
    }
  }

  getDefaultValue(variable: Variable): any {
    if (variable.default_value !== undefined && variable.default_value !== null) {
      return variable.default_value;
    }
    
    switch (variable.type) {
      case 'number':
      case 'range':
        return variable.min_value ?? 0;
      case 'boolean':
        return false;
      case 'string':
        return '';
      case 'dict':
        return {};
      case 'list':
        return [];
      default:
        return null;
    }
  }

  resetVariable(variable: Variable): Variable {
    const defaultValue = this.getDefaultValue(variable);
    return { ...variable, value: defaultValue };
  }

  getVariablesMap(): Record<string, any> {
    const map: Record<string, any> = {};
    for (const v of this.variables) {
      map[v.key] = v.value;
    }
    return map;
  }

  applyStageEffects(variable: Variable, context?: any): Variable {
    const stage = this.getActiveStage(variable, context);
    if (!stage || !stage.effects) return variable;
    
    try {
      const effects = JSON.parse(stage.effects);
      let newValue = variable.value;
      
      if (effects.set !== undefined) {
        newValue = effects.set;
      } else if (effects.add !== undefined && typeof variable.value === 'number') {
        newValue = variable.value + effects.add;
      } else if (effects.multiply !== undefined && typeof variable.value === 'number') {
        newValue = variable.value * effects.multiply;
      }
      
      const validation = this.validateValue(variable, newValue);
      if (validation.valid) {
        return { ...variable, value: validation.normalized };
      }
    } catch {}
    
    return variable;
  }

  batchUpdate(updates: Array<{ key: string; value: any }>): Variable[] {
    const updated: Variable[] = [];
    for (const { key, value } of updates) {
      const result = this.setVariable(key, value);
      if (result) updated.push(result);
    }
    return updated;
  }
}
