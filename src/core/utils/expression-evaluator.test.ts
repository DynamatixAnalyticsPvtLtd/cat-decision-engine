import { ExpressionEvaluator } from './expression-evaluator';

describe('ExpressionEvaluator', () => {
    let evaluator: ExpressionEvaluator;

    beforeEach(() => {
        evaluator = new ExpressionEvaluator();
    });

    describe('evaluateTemplate', () => {
        it('should evaluate simple expressions', () => {
            const template = 'Hello ${name}!';
            const context = { name: 'World' };
            expect(evaluator.evaluateTemplate(template, context)).toBe('Hello World!');
        });

        it('should evaluate nested expressions', () => {
            const template = 'Hello ${user.name}!';
            const context = { user: { name: 'World' } };
            expect(evaluator.evaluateTemplate(template, context)).toBe('Hello World!');
        });

        it('should leave expressions unchanged if value not found', () => {
            const template = 'Hello ${missing}!';
            const context = { name: 'World' };
            expect(evaluator.evaluateTemplate(template, context)).toBe('Hello ${missing}!');
        });

        it('should handle multiple expressions', () => {
            const template = '${greeting} ${user.name}!';
            const context = { greeting: 'Hello', user: { name: 'World' } };
            expect(evaluator.evaluateTemplate(template, context)).toBe('Hello World!');
        });

        it('should evaluate expressions using sequential tasks test data', () => {
            const context = {
                data: {
                    initialAmount: 1000,
                    calculatefee: {
                        result: {
                            fee: 356.63
                        }
                    }
                }
            };
            expect(evaluator.evaluateTemplate('${data.calculatefee.result.fee}', context)).toBe('356.63');
            expect(evaluator.evaluateTemplate('${parseFloat(data.initialAmount) + parseFloat(data.calculatefee.result.fee)}', context)).toBe('1356.63');
        });
    });

    describe('evaluateObject', () => {
        it('should evaluate expressions in object values', () => {
            const obj = {
                greeting: '${greeting}',
                user: {
                    name: '${user.name}'
                }
            };
            const context = { greeting: 'Hello', user: { name: 'World' } };
            expect(evaluator.evaluateObject(obj, context)).toEqual({
                greeting: 'Hello',
                user: {
                    name: 'World'
                }
            });
        });

        it('should handle arrays', () => {
            const obj = {
                messages: [
                    '${greeting}',
                    '${user.name}'
                ]
            };
            const context = { greeting: 'Hello', user: { name: 'World' } };
            expect(evaluator.evaluateObject(obj, context)).toEqual({
                messages: ['Hello', 'World']
            });
        });

        it('should leave non-string values unchanged', () => {
            const obj = {
                number: 42,
                boolean: true,
                null: null,
                undefined: undefined
            };
            const context = {};
            expect(evaluator.evaluateObject(obj, context)).toEqual(obj);
        });

        it('should handle nested objects with expressions', () => {
            const obj = {
                user: {
                    greeting: '${greeting}',
                    profile: {
                        name: '${user.name}',
                        age: '${user.age}'
                    }
                }
            };
            const context = {
                greeting: 'Hello',
                user: {
                    name: 'World',
                    age: 25
                }
            };
            expect(evaluator.evaluateObject(obj, context)).toEqual({
                user: {
                    greeting: 'Hello',
                    profile: {
                        name: 'World',
                        age: 25
                    }
                }
            });
        });
    });
}); 