import chalk from 'chalk';
import { vi } from 'vitest';

import { PrefixColorSelector } from './prefix-color-selector';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('#getNextColor', function () {
    const customTests: Record<
        string,
        {
            acceptableConsoleColors?: Array<keyof typeof chalk>;
            customColors?: string[];
            expectedColors: string[];
        }
    > = {
        'does not produce a color if prefixColors empty': {
            customColors: [],
            expectedColors: ['', '', ''],
        },
        'does not produce a color if prefixColors undefined': {
            expectedColors: ['', '', ''],
        },
        'uses user defined prefix colors only, if no auto is used': {
            customColors: ['red', 'green', 'blue'],
            expectedColors: [
                'red',
                'green',
                'blue',

                // Uses last color if last color is not "auto"
                'blue',
                'blue',
                'blue',
            ],
        },
        'picks varying colors when user defines an auto color': {
            acceptableConsoleColors: ['green', 'blue'],
            customColors: [
                'red',
                'green',
                'auto',
                'green',
                'auto',
                'green',
                'auto',
                'blue',
                'auto',
                'orange',
            ],
            expectedColors: [
                // Custom colors
                'red',
                'green',
                'blue', // Picks auto color "blue", not repeating consecutive "green" color
                'green', // Manual
                'blue', // Auto picks "blue" not to repeat last
                'green', // Manual
                'blue', // Auto picks "blue" again not to repeat last
                'blue', // Manual
                'green', // Auto picks "green" again not to repeat last
                'orange',

                // Uses last color if last color is not "auto"
                'orange',
                'orange',
                'orange',
            ],
        },
        'uses user defined colors then recurring auto colors without repeating consecutive colors':
            {
                acceptableConsoleColors: ['green', 'blue'],
                customColors: ['red', 'green', 'auto'],
                expectedColors: [
                    // Custom colors
                    'red',
                    'green',

                    // Picks auto colors, not repeating consecutive "green" color
                    'blue',
                    'green',
                    'blue',
                    'green',
                ],
            },
        'can sometimes produce consecutive colors': {
            acceptableConsoleColors: ['green', 'blue'],
            customColors: ['blue', 'auto'],
            expectedColors: [
                // Custom colors
                'blue',

                // Picks auto colors
                'green',
                // Does not repeat custom colors for initial auto colors, i.e. does not use "blue" again so soon
                'green', // Consecutive color picked, however practically there would be a lot of colors that need to be set in a particular order for this to occur
                'blue',
                'green',
                'blue',
                'green',
                'blue',
            ],
        },
        'considers the Bright variants of colors equal to the normal colors to avoid similar colors':
            {
                acceptableConsoleColors: ['greenBright', 'blueBright', 'green', 'blue', 'magenta'],
                customColors: ['green', 'blue', 'auto'],
                expectedColors: [
                    // Custom colors
                    'green',
                    'blue',

                    // Picks auto colors, not repeating green and blue colors and variants initially
                    'magenta',

                    // Picks auto colors
                    'greenBright',
                    'blueBright',
                    'green',
                    'blue',
                    'magenta',
                ],
            },
    };
    it.each(Object.entries(customTests))(
        '%s',
        (_, { acceptableConsoleColors, customColors, expectedColors }) => {
            if (acceptableConsoleColors) {
                vi.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue(
                    acceptableConsoleColors,
                );
            }
            const prefixColorSelector = new PrefixColorSelector(customColors);
            const prefixColorSelectorValues = expectedColors.map(() =>
                prefixColorSelector.getNextColor(),
            );

            expect(prefixColorSelectorValues).toEqual(expectedColors);
        },
    );

    const autoTests = {
        'does not repeat consecutive colors when last prefixColor is auto': false,
        'handles when more individual auto prefixColors exist than acceptable console colors': true,
    };
    it.each(Object.entries(autoTests))('%s', (_, map) => {
        // Pick auto colors over 2 sets
        const expectedColors: string[] = [
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
        ];

        const prefixColorSelector = new PrefixColorSelector(
            map ? expectedColors.map(() => 'auto') : ['auto'],
        );

        let previousColor = '';
        for (const expectedColor of expectedColors) {
            const actualSelectedColor = prefixColorSelector.getNextColor();
            expect(actualSelectedColor).not.toBe(previousColor); // No consecutive colors
            expect(actualSelectedColor).toBe(expectedColor); // Expected color
            previousColor = actualSelectedColor;
        }
    });
});

describe('PrefixColorSelector#ACCEPTABLE_CONSOLE_COLORS', () => {
    it('has more than 1 auto color defined', () => {
        // (!) The current implementation is based on the assumption that 'ACCEPTABLE_CONSOLE_COLORS'
        //     always has more than one entry, which is what we enforce via this test
        expect(PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.length).toBeGreaterThan(1);
    });
});
