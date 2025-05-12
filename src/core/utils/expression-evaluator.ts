export class ExpressionEvaluator {
    /**
     * Evaluates a template string by replacing ${...} expressions with their values from context
     * @param template The template string containing expressions
     * @param context The context object containing values
     * @returns The resolved string
     */
    public evaluateTemplate(template: string, context: any): string {
        return template.replace(/\${([^}]+)}/g, (match, expression) => {
            try {
                // First try to resolve as a path
                const value = expression.split('.').reduce((obj: any, key: string) => obj?.[key], context);
                if (value !== undefined && value !== null) {
                    return String(value);
                }

                // If not found as path, try to evaluate as JavaScript
                const evalFn = new Function('context', `with (context) { return ${expression}; }`);
                const result = evalFn(context);
                return result === undefined || result === null ? match : String(result);
            } catch (error) {
                console.warn(`Failed to evaluate expression: ${expression}`, error);
                return match;
            }
        });
    }

    /**
     * Recursively evaluates all template expressions in an object
     * @param obj The object containing template expressions
     * @param context The context object containing values
     * @returns The resolved object
     */
    public evaluateObject(obj: any, context: any): any {
        if (Array.isArray(obj)) {
            return obj.map(item => {
                if (typeof item === 'string' && item.includes('${')) {
                    const evaluated = this.evaluateTemplate(item, context);
                    // Try to convert to number if it looks like a number
                    return /^\d+(\.\d+)?$/.test(evaluated) ? Number(evaluated) : evaluated;
                }
                return this.evaluateObject(item, context);
            });
        }

        if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && value.includes('${')) {
                    const evaluated = this.evaluateTemplate(value, context);
                    // Try to convert to number if it looks like a number
                    result[key] = /^\d+(\.\d+)?$/.test(evaluated) ? Number(evaluated) : evaluated;
                } else {
                    result[key] = this.evaluateObject(value, context);
                }
            }
            return result;
        }

        return obj;
    }
} 