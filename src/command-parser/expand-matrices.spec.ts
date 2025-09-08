import { describe, expect, it } from 'vitest';

import { CommandInfo } from '../command';
import { combinations, ExpandMatrices } from './expand-matrices';

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

describe('ExpandMatrices', () => {
    it('should replace placeholders with matrix values', () => {
        const matrices = {
            X: ['a', 'b'],
            Y: ['1', '2'],
        };
        const expandMatrices = new ExpandMatrices(matrices);
        const commandInfo = createCommandInfo('echo {M:X} and {M:Y}');

        const result = expandMatrices.parse(commandInfo);

        expect(result).toEqual([
            { command: 'echo a and 1', name: '' },
            { command: 'echo a and 2', name: '' },
            { command: 'echo b and 1', name: '' },
            { command: 'echo b and 2', name: '' },
        ]);
    });

    it('should handle escaped placeholders', () => {
        const matrices = { X: ['a', 'b'] };
        const expandMatrices = new ExpandMatrices(matrices);
        const commandInfo = createCommandInfo('echo \\{M:X} and {M:X}');

        const result = expandMatrices.parse(commandInfo);

        expect(result).toEqual([
            { command: 'echo {M:X} and a', name: '' },
            { command: 'echo {M:X} and b', name: '' },
        ]);
    });

    it('throws SyntaxError if matrix name is invalid', () => {
        const matrices = { X: ['a'] };
        const expandMatrices = new ExpandMatrices(matrices);
        const commandInfo = createCommandInfo('echo {M:INVALID}');

        expect(() => expandMatrices.parse(commandInfo)).toThrowError(
            "[concurrently] Matrix placeholder '{M:INVALID}' does not match any defined matrix.",
        );
    });
});

describe('combinations', () => {
    it('should return all possible combinations of the given dimensions', () => {
        const dimensions = {
            X: ['a', 'b'],
            Y: ['1', '2'],
        };

        const result = Array.from(combinations(dimensions));

        expect(result).toEqual([
            { X: 'a', Y: '1' },
            { X: 'a', Y: '2' },
            { X: 'b', Y: '1' },
            { X: 'b', Y: '2' },
        ]);
    });

    it('should handle single dimension', () => {
        const dimensions = { X: ['a', 'b'] };

        const result = Array.from(combinations(dimensions));
        const expected = [{ X: 'a' }, { X: 'b' }] as Record<string, string>[];

        expect(result).toEqual(expected);
    });

    it('should handle empty dimensions', () => {
        const dimensions: Record<string, string[]> = {};

        const result = Array.from(combinations(dimensions));

        expect(result).toEqual([]);
    });

    it('should handle dimensions with empty arrays', () => {
        const dimensions = { X: ['a', 'b'], Y: [] };

        const result = Array.from(combinations(dimensions));

        expect(result).toEqual([]);
    });

    it('should handle dimensions with multiple empty arrays', () => {
        const dimensions = { X: [], Y: [] };

        const result = Array.from(combinations(dimensions));

        expect(result).toEqual([]);
    });

    it('should handle dimensions with all empty arrays', () => {
        const dimensions = { X: [], Y: [], Z: [] };

        const result = Array.from(combinations(dimensions));

        expect(result).toEqual([]);
    });

    it('should handle uneven dimensions', () => {
        const dimensions = {
            A: ['x'],
            B: ['1', '2', '3'],
            C: ['foo', 'bar'],
        };

        const result = Array.from(combinations(dimensions));

        expect(result).toEqual([
            { A: 'x', B: '1', C: 'foo' },
            { A: 'x', B: '1', C: 'bar' },
            { A: 'x', B: '2', C: 'foo' },
            { A: 'x', B: '2', C: 'bar' },
            { A: 'x', B: '3', C: 'foo' },
            { A: 'x', B: '3', C: 'bar' },
        ]);
    });
});
