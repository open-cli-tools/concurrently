import { PrefixColorSelector } from './prefix-color-selector';

it('does not produce a color if it should not', () => {
    const prefixColorSelector = new PrefixColorSelector([], false);

    let selectedColor = prefixColorSelector.getNextColor(0);
    expect(selectedColor).toBe('');
    selectedColor = prefixColorSelector.getNextColor(1);
    expect(selectedColor).toBe('');
    selectedColor = prefixColorSelector.getNextColor(2);
    expect(selectedColor).toBe('');
});

it('uses user defined prefix colors only if not allowed to use auto colors', () => {
    const prefixColorSelector = new PrefixColorSelector(['red', 'green', 'blue'], false);

    let selectedColor = prefixColorSelector.getNextColor(0);
    expect(selectedColor).toBe('red');
    selectedColor = prefixColorSelector.getNextColor(1);
    expect(selectedColor).toBe('green');
    selectedColor = prefixColorSelector.getNextColor(2);
    expect(selectedColor).toBe('blue');

    // uses last color if no more user defined colors
    selectedColor = prefixColorSelector.getNextColor(3);
    expect(selectedColor).toBe('blue');
    selectedColor = prefixColorSelector.getNextColor(4);
    expect(selectedColor).toBe('blue');
});

it('uses user defined colors then recurring auto colors without repeating consecutive colors', () => {
    const prefixColorSelector = new PrefixColorSelector(['red', 'green'], true);

    jest.spyOn(prefixColorSelector, 'ACCEPTABLE_CONSOLE_COLORS', 'get').mockReturnValue([
        'green',
        'blue',
    ]);

    let selectedColor = prefixColorSelector.getNextColor(0);
    expect(selectedColor).toBe('red');
    selectedColor = prefixColorSelector.getNextColor(1);
    expect(selectedColor).toBe('green');

    // auto colors now, does not repeat last user color of green
    selectedColor = prefixColorSelector.getNextColor(2);
    expect(selectedColor).toBe('blue');

    selectedColor = prefixColorSelector.getNextColor(3);
    expect(selectedColor).toBe('green');

    selectedColor = prefixColorSelector.getNextColor(4);
    expect(selectedColor).toBe('blue');
});

it('has more than 1 auto color defined', () => {
    const prefixColorSelector = new PrefixColorSelector([], true);
    // ! code assumes this always has more than one entry, so make sure
    expect(prefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.length).toBeGreaterThan(1);
});

it('can use only auto colors and does not repeat consecutive colors', () => {
    const prefixColorSelector = new PrefixColorSelector([], true);

    let previousColor;
    let selectedColor: string;
    Array(prefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.length * 2).forEach((_, index) => {
        previousColor = selectedColor;
        selectedColor = prefixColorSelector.getNextColor(index);
        expect(selectedColor).not.toBe(previousColor);
    });
});
