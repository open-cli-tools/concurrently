import { CommandInfo } from '../command';
import { combinations, ExpandMatrices } from './expand-matrices';

const createCommandInfo = (command: string): CommandInfo => ({
    command,
    name: '',
});

describe('ExpandMatrices', () => {
    it('should replace placeholders with matrix values', () => {
        const matrices = [
            ['a', 'b'],
            ['1', '2'],
        ];
        const expandMatrices = new ExpandMatrices(matrices);
        const commandInfo = createCommandInfo('echo {1} and {2}');

        const result = expandMatrices.parse(commandInfo);

        expect(result).toEqual([
            { command: 'echo a and 1', name: '' },
            { command: 'echo a and 2', name: '' },
            { command: 'echo b and 1', name: '' },
            { command: 'echo b and 2', name: '' },
        ]);
    });

    it('should handle escaped placeholders', () => {
        const matrices = [['a', 'b']];
        const expandMatrices = new ExpandMatrices(matrices);
        const commandInfo = createCommandInfo('echo \\{1} and {1}');

        const result = expandMatrices.parse(commandInfo);

        expect(result).toEqual([
            { command: 'echo {1} and a', name: '' },
            { command: 'echo {1} and b', name: '' },
        ]);
    });

    it('should replace placeholders with empty string if index is out of bounds', () => {
        const matrices = [['a']];
        const expandMatrices = new ExpandMatrices(matrices);
        const commandInfo = createCommandInfo('echo {2}');

        const result = expandMatrices.parse(commandInfo);

        expect(result).toEqual([{ command: 'echo ', name: '' }]);
    });
});

describe('combinations', () => {
    it('should return all possible combinations of the given dimensions', () => {
        const dimensions = [
            ['a', 'b'],
            ['1', '2'],
        ];

        const result = combinations(dimensions);

        expect(result).toEqual([
            ['a', '1'],
            ['a', '2'],
            ['b', '1'],
            ['b', '2'],
        ]);
    });

    it('should handle single dimension', () => {
        const dimensions = [['a', 'b']];

        const result = combinations(dimensions);

        expect(result).toEqual([['a'], ['b']]);
    });

    it('should handle empty dimensions', () => {
        const dimensions: string[][] = [];

        const result = combinations(dimensions);

        expect(result).toEqual([[]]);
    });

    it('should handle dimensions with empty arrays', () => {
        const dimensions = [['a', 'b'], []];

        const result = combinations(dimensions);

        expect(result).toEqual([]);
    });

    it('should handle dimensions with multiple empty arrays', () => {
        const dimensions = [[], []];

        const result = combinations(dimensions);

        expect(result).toEqual([]);
    });

    it('should handle dimensions with some empty arrays', () => {
        const dimensions = [['a', 'b'], [], ['x', 'y']];

        const result = combinations(dimensions);

        expect(result).toEqual([]);
    });

    it('should handle dimensions with all empty arrays', () => {
        const dimensions = [[], [], []];

        const result = combinations(dimensions);

        expect(result).toEqual([]);
    });
});
