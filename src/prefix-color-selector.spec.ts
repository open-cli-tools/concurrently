import { PrefixColorSelector } from './prefix-color-selector';

function assertSelectedColors({
    prefixColorSelector,
    expectedColors,
}: {
    prefixColorSelector: PrefixColorSelector;
    expectedColors: string[];
}) {
    expectedColors.forEach(expectedColor => {
        expect(prefixColorSelector.getNextColor()).toBe(expectedColor);
    });
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe('#getNextColor', function () {
    it('does not produce a color if prefixColors empty', () => {
        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector([]),
            expectedColors: ['', '', ''],
        });
    });

    it('does not produce a color if prefixColors undefined', () => {
        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector(),
            expectedColors: ['', '', ''],
        });
    });

    it('uses user defined prefix colors only, if no auto is used', () => {
        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector(['red', 'green', 'blue']),
            expectedColors: [
                'red',
                'green',
                'blue',

                // uses last color if last color is not "auto"
                'blue',
                'blue',
                'blue',
            ],
        });
    });

    it('picks varying colors when user defines an auto color', () => {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'green',
            'blue',
        ]);

        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector([
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
            ]),
            expectedColors: [
                // custom colors
                'red',
                'green',
                'blue', // picks auto color "blue", not repeating consecutive "green" color
                'green', // manual
                'blue', // auto picks "blue" not to repeat last
                'green', // manual
                'blue', // auto picks "blue" again not to repeat last
                'blue', // manual
                'green', // auto picks "green" again not to repeat last
                'orange',

                // uses last color if last color is not "auto"
                'orange',
                'orange',
                'orange',
            ],
        });
    });

    it('uses user defined colors then recurring auto colors without repeating consecutive colors', () => {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'green',
            'blue',
        ]);

        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector(['red', 'green', 'auto']),
            expectedColors: [
                // custom colors
                'red',
                'green',

                // picks auto colors, not repeating consecutive "green" color
                'blue',
                'green',
                'blue',
                'green',
            ],
        });
    });

    it('can sometimes produce consecutive colors', () => {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'green',
            'blue',
        ]);

        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector(['blue', 'auto']),
            expectedColors: [
                // custom colors
                'blue',

                // picks auto colors
                'green',
                // does not repeat custom colors for initial auto colors, ie does not use "blue" again so soon
                'green', // consecutive color picked, however practically there would be a lot of colors that need to be set in a particular order for this to occur
                'blue',
                'green',
                'blue',
                'green',
                'blue',
            ],
        });
    });

    it('considers the Bright variants of colors equal to the normal colors to avoid similar colors', function () {
        jest.spyOn(PrefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
            'greenBright',
            'blueBright',
            'green',
            'blue',
            'magenta',
        ]);

        assertSelectedColors({
            prefixColorSelector: new PrefixColorSelector(['green', 'blue', 'auto']),
            expectedColors: [
                // custom colors
                'green',
                'blue',

                // picks auto colors, not repeating green and blue colors and variants initially
                'magenta',

                // picks auto colors
                'greenBright',
                'blueBright',
                'green',
                'blue',
                'magenta',
            ],
        });
    });

    it('does not repeat consecutive colors when last prefixColor is auto', () => {
        const prefixColorSelector = new PrefixColorSelector(['auto']);

        // pick auto colors over 2 sets
        const expectedColors: string[] = [
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
        ];

        expectedColors.reduce((previousColor, currentExpectedColor) => {
            const actualSelectedColor = prefixColorSelector.getNextColor();
            expect(actualSelectedColor).not.toBe(previousColor); // no consecutive colors
            expect(actualSelectedColor).toBe(currentExpectedColor); // expected color
            return actualSelectedColor;
        }, '');
    });

    it('handles when more individual auto prefixColors exist than acceptable console colors', () => {
        // pick auto colors over 2 sets
        const expectedColors: string[] = [
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
            ...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS,
        ];

        const prefixColorSelector = new PrefixColorSelector(expectedColors.map(() => 'auto'));

        expectedColors.reduce((previousColor, currentExpectedColor) => {
            const actualSelectedColor = prefixColorSelector.getNextColor();
            expect(actualSelectedColor).not.toBe(previousColor); // no consecutive colors
            expect(actualSelectedColor).toBe(currentExpectedColor); // expected color
            return actualSelectedColor;
        }, '');
    });
});

describe('PrefixColorSelector#ACCEPTABLE_CONSOLE_COLORS', () => {
    it('has more than 1 auto color defined', () => {
        // ! code assumes this always has more than one entry, so make sure
        expect(PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.length).toBeGreaterThan(1);
    });
});
