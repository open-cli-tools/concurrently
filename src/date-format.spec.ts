import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DateFormatter, FormatterOptions } from './date-format';

const withTime = (time: string) => `2000-01-01T${time}`;
const withDate = (date: string) => `${date}T00:00:00`;

type TokenTests = undefined | { input: string; expected: string }[];

const makeTests = (
    name: string,
    token: string,
    patternTests: TokenTests[],
    options?: FormatterOptions,
) =>
    describe(`${name}`, () => {
        patternTests.forEach((tests, i) => {
            const pattern = token.repeat(i + 1);
            if (!tests) {
                return it(`is not implemented for ${pattern}`, () => {
                    expect(() => new DateFormatter(pattern)).toThrow(RangeError);
                });
            } else if (!tests.length) {
                return;
            }

            it.each(tests)(
                `for pattern ${pattern} and input "$input" returns "$expected"`,
                ({ expected, input }) => {
                    const formatter = new DateFormatter(pattern, {
                        locale: 'en',
                        calendar: 'gregoy',
                        ...options,
                    });
                    expect(formatter.format(new Date(input))).toBe(expected);
                },
            );
        });
    });

describe('combined', () => {
    it('works with tokens and punctuation', () => {
        const formatter = new DateFormatter('yyyy-MM-dd HH:mm:ss', { locale: 'en' });
        const date = new Date(2024, 8, 1, 15, 30, 50);
        expect(formatter.format(date)).toBe('2024-09-01 15:30:50');
    });

    it('works with tokens and literals', () => {
        const formatter = new DateFormatter("HH 'o''clock'", { locale: 'en' });
        const date = new Date();
        date.setHours(10);
        expect(formatter.format(date)).toBe("10 o'clock");
    });
});

describe('literals', () => {
    it.each([
        ["'", "''"],
        ['foo bar', "'foo bar'"],
        ["foo ' bar", "'foo '' bar'"],
        ["foo bar'?", "'foo bar'''?"],
    ])('returns "%s" for pattern "%s"', (expected, pattern) => {
        const formatter = new DateFormatter(pattern);
        expect(formatter.format(new Date())).toBe(expected);
    });
});

describe('tokens', () => {
    it('throws if a token does not exist', () => {
        expect(() => new DateFormatter('t')).toThrow(SyntaxError);
    });

    makeTests('era', 'G', [
        [
            { input: withDate('-000001-01-01'), expected: 'BC' },
            { input: withDate('0001-01-01'), expected: 'AD' },
        ],
        [
            { input: withDate('-000001-01-01'), expected: 'BC' },
            { input: withDate('0001-01-01'), expected: 'AD' },
        ],
        [
            { input: withDate('-000001-01-01'), expected: 'BC' },
            { input: withDate('0001-01-01'), expected: 'AD' },
        ],
        [
            { input: withDate('-000001-01-01'), expected: 'Before Christ' },
            { input: withDate('0001-01-01'), expected: 'Anno Domini' },
        ],
        [
            { input: withDate('-000001-01-01'), expected: 'B' },
            { input: withDate('0001-01-01'), expected: 'A' },
        ],
    ]);

    makeTests('year', 'y', [
        [
            { expected: '2', input: withDate('0002-01-01') },
            { expected: '20', input: withDate('0020-01-01') },
            { expected: '200', input: withDate('0200-01-01') },
            { expected: '2000', input: withDate('2000-01-01') },
        ],
        [
            { expected: '02', input: withDate('0002-01-01') },
            { expected: '20', input: withDate('0020-01-01') },
            { expected: '00', input: withDate('0200-01-01') },
            { expected: '05', input: withDate('0205-01-01') },
            { expected: '00', input: withDate('2000-01-01') },
            { expected: '05', input: withDate('2005-01-01') },
        ],
        [
            { expected: '002', input: withDate('0002-01-01') },
            { expected: '020', input: withDate('0020-01-01') },
            { expected: '200', input: withDate('0200-01-01') },
            { expected: '2000', input: withDate('2000-01-01') },
        ],
        [
            { expected: '0002', input: withDate('0002-01-01') },
            { expected: '0020', input: withDate('0020-01-01') },
            { expected: '0200', input: withDate('0200-01-01') },
            { expected: '2000', input: withDate('2000-01-01') },
        ],
        [
            { expected: '00002', input: withDate('0002-01-01') },
            { expected: '00020', input: withDate('0020-01-01') },
            { expected: '00200', input: withDate('0200-01-01') },
            { expected: '02000', input: withDate('2000-01-01') },
        ],
    ]);

    describe('year name', () => {
        makeTests('with en locale', 'U', [[{ expected: '2024', input: withDate('2024-01-01') }]], {
            locale: 'en',
        });

        makeTests(
            'with zh-CN locale + chinese calendar',
            'U',
            [[{ expected: '癸卯', input: withDate('2024-01-01') }]],
            { locale: 'zh-CN', calendar: 'chinese' },
        );
    });

    describe('related year', () => {
        makeTests('with en locale', 'r', [[{ expected: '2024', input: withDate('2024-01-01') }]], {
            locale: 'en',
        });

        makeTests(
            'with zh-CN locale + chinese calendar',
            'r',
            [
                [
                    { expected: '2023', input: withDate('2024-01-01') },
                    { expected: '2024', input: withDate('2024-03-01') },
                ],
            ],
            { locale: 'zh-CN', calendar: 'chinese' },
        );
    });

    describe('week year', () => {
        makeTests(
            'with en locale',
            'Y',
            [
                [
                    { expected: '2023', input: withDate('2023-01-01') },
                    { expected: '2024', input: withDate('2023-12-31') },
                    { expected: '2024', input: withDate('2024-01-01') },
                    { expected: '2025', input: withDate('2024-12-31') },
                ],
                [
                    { expected: '23', input: withDate('2023-01-01') },
                    { expected: '24', input: withDate('2023-12-31') },
                    { expected: '24', input: withDate('2024-01-01') },
                    { expected: '25', input: withDate('2024-12-31') },
                ],
            ],
            { locale: 'en' },
        );

        makeTests(
            'with de-DE locale',
            'Y',
            [
                [
                    { expected: '2022', input: withDate('2023-01-01') },
                    { expected: '2023', input: withDate('2023-12-31') },
                    { expected: '2024', input: withDate('2024-01-01') },
                    { expected: '2025', input: withDate('2024-12-31') },
                ],
                [
                    { expected: '22', input: withDate('2023-01-01') },
                    { expected: '23', input: withDate('2023-12-31') },
                    { expected: '24', input: withDate('2024-01-01') },
                    { expected: '25', input: withDate('2024-12-31') },
                ],
            ],
            { locale: 'de-DE' },
        );

        describe(`when minimalDays is missing`, () => {
            beforeAll(() => {
                if (typeof Intl.Locale.prototype.getWeekInfo === 'function') {
                    Intl.Locale.prototype.getWeekInfoOrig = Intl.Locale.prototype.getWeekInfo;
                }

                Intl.Locale.prototype.getWeekInfo = function () {
                    const data =
                        typeof Intl.Locale.prototype.getWeekInfoOrig === 'function'
                            ? this.getWeekInfoOrig()
                            : this.weekInfo;
                    delete data.minimalDays;
                    return data;
                };
            });

            afterAll(() => {
                if (Intl.Locale.prototype.getWeekInfoOrig) {
                    Intl.Locale.prototype.getWeekInfo = Intl.Locale.prototype.getWeekInfoOrig;
                    delete Intl.Locale.prototype.getWeekInfoOrig;
                }
            });

            makeTests(
                // needs to be a different locale than in tests to not use cached weekInfo
                'with de-CH locale',
                'Y',
                [
                    [
                        { expected: '2022', input: withDate('2023-01-01') },
                        { expected: '2023', input: withDate('2023-12-31') },
                        { expected: '2024', input: withDate('2024-01-01') },
                        { expected: '2025', input: withDate('2024-12-31') },
                    ],
                    [
                        { expected: '22', input: withDate('2023-01-01') },
                        { expected: '23', input: withDate('2023-12-31') },
                        { expected: '24', input: withDate('2024-01-01') },
                        { expected: '25', input: withDate('2024-12-31') },
                    ],
                ],
                { locale: 'de-CH' },
            );
        });
    });

    makeTests('quarter', 'Q', [
        [
            { expected: '1', input: withDate('2000-01-01') },
            { expected: '2', input: withDate('2000-04-01') },
            { expected: '3', input: withDate('2000-07-01') },
            { expected: '4', input: withDate('2000-10-01') },
        ],
        [
            { expected: '01', input: withDate('2000-01-01') },
            { expected: '02', input: withDate('2000-04-01') },
            { expected: '03', input: withDate('2000-07-01') },
            { expected: '04', input: withDate('2000-10-01') },
        ],
        undefined,
        undefined,
        [
            { expected: '1', input: withDate('2000-01-01') },
            { expected: '2', input: withDate('2000-04-01') },
            { expected: '3', input: withDate('2000-07-01') },
            { expected: '4', input: withDate('2000-10-01') },
        ],
    ]);

    makeTests('quarter - stand-alone', 'q', [
        [
            { expected: '1', input: withDate('2000-01-01') },
            { expected: '2', input: withDate('2000-04-01') },
            { expected: '3', input: withDate('2000-07-01') },
            { expected: '4', input: withDate('2000-10-01') },
        ],
        [
            { expected: '01', input: withDate('2000-01-01') },
            { expected: '02', input: withDate('2000-04-01') },
            { expected: '03', input: withDate('2000-07-01') },
            { expected: '04', input: withDate('2000-10-01') },
        ],
        undefined,
        undefined,
        [
            { expected: '1', input: withDate('2000-01-01') },
            { expected: '2', input: withDate('2000-04-01') },
            { expected: '3', input: withDate('2000-07-01') },
            { expected: '4', input: withDate('2000-10-01') },
        ],
    ]);

    describe('month', () => {
        makeTests(
            'with en locale',
            'M',
            [
                [{ expected: '1', input: withDate('2000-01-01') }],
                [{ expected: '01', input: withDate('2000-01-01') }],
                [{ expected: 'Jan', input: withDate('2000-01-01') }],
                [{ expected: 'January', input: withDate('2000-01-01') }],
                [{ expected: 'J', input: withDate('2000-01-01') }],
            ],
            { locale: 'en' },
        );

        makeTests(
            'with pl locale',
            'M',
            [
                [{ expected: '1', input: withDate('2000-01-01') }],
                [{ expected: '01', input: withDate('2000-01-01') }],
                [{ expected: 'sty', input: withDate('2000-01-01') }],
                [{ expected: 'stycznia', input: withDate('2000-01-01') }],
                [{ expected: 's', input: withDate('2000-01-01') }],
            ],
            { locale: 'pl' },
        );
    });

    describe('month - stand-alone', () => {
        makeTests(
            'with en locale',
            'L',
            [
                [{ expected: '1', input: withDate('2000-01-01') }],
                [{ expected: '01', input: withDate('2000-01-01') }],
                [{ expected: 'Jan', input: withDate('2000-01-01') }],
                [{ expected: 'January', input: withDate('2000-01-01') }],
                [{ expected: 'J', input: withDate('2000-01-01') }],
            ],
            { locale: 'en' },
        );

        makeTests(
            'with pl locale',
            'L',
            [
                [{ expected: '1', input: withDate('2000-01-01') }],
                [{ expected: '01', input: withDate('2000-01-01') }],
                [{ expected: 'sty', input: withDate('2000-01-01') }],
                [{ expected: 'styczeń', input: withDate('2000-01-01') }],
                [{ expected: 'S', input: withDate('2000-01-01') }],
            ],
            { locale: 'pl' },
        );
    });

    describe('week of year', () => {
        makeTests(
            'with en locale',
            'w',
            [
                [
                    { expected: '1', input: withDate('2023-01-01') },
                    { expected: '1', input: withDate('2023-12-31') },
                    { expected: '1', input: withDate('2024-01-01') },
                    { expected: '1', input: withDate('2024-12-31') },
                ],

                [
                    { expected: '01', input: withDate('2023-01-01') },
                    { expected: '01', input: withDate('2023-12-31') },
                    { expected: '01', input: withDate('2024-01-01') },
                    { expected: '01', input: withDate('2024-12-31') },
                ],
            ],
            { locale: 'en' },
        );

        makeTests(
            'with de-DE locale',
            'w',
            [
                [
                    { expected: '52', input: withDate('2023-01-01') },
                    { expected: '52', input: withDate('2023-12-31') },
                    { expected: '1', input: withDate('2024-01-01') },
                    { expected: '1', input: withDate('2024-12-31') },
                ],

                [
                    { expected: '52', input: withDate('2023-01-01') },
                    { expected: '52', input: withDate('2023-12-31') },
                    { expected: '01', input: withDate('2024-01-01') },
                    { expected: '01', input: withDate('2024-12-31') },
                ],
            ],
            { locale: 'de-DE' },
        );
    });

    describe('week of month', () => {
        makeTests(
            'with en locale',
            'W',
            [
                [
                    { expected: '6', input: withDate('2021-01-31') },
                    { expected: '5', input: withDate('2021-02-28') },
                ],
            ],
            { locale: 'en' },
        );

        makeTests(
            'with de-DE locale',
            'W',
            [
                [
                    { expected: '5', input: withDate('2021-01-31') },
                    { expected: '4', input: withDate('2021-02-28') },
                ],
            ],
            { locale: 'de-DE' },
        );
    });

    makeTests('day', 'd', [
        [
            { expected: '1', input: withDate('2000-01-01') },
            { expected: '10', input: withDate('2000-01-10') },
        ],
        [
            { expected: '01', input: withDate('2000-01-01') },
            { expected: '10', input: withDate('2000-01-10') },
        ],
    ]);

    makeTests('day of week in month', 'F', [
        [
            { expected: '1', input: withDate('2024-09-01') },
            { expected: '2', input: withDate('2024-09-08') },
        ],
    ]);

    makeTests('day of year', 'D', [
        [
            { expected: '1', input: withDate('2024-01-01') },
            { expected: '32', input: withDate('2024-02-01') },
            { expected: '366', input: withDate('2024-12-31') },
        ],

        [
            { expected: '01', input: withDate('2024-01-01') },
            { expected: '32', input: withDate('2024-02-01') },
            { expected: '366', input: withDate('2024-12-31') },
        ],

        [
            { expected: '001', input: withDate('2024-01-01') },
            { expected: '032', input: withDate('2024-02-01') },
            { expected: '366', input: withDate('2024-12-31') },
        ],
    ]);

    makeTests('week day', 'E', [
        [{ expected: 'Sat', input: withDate('2024-09-07') }],
        [{ expected: 'Sat', input: withDate('2024-09-07') }],
        [{ expected: 'Sat', input: withDate('2024-09-07') }],
        [{ expected: 'Saturday', input: withDate('2024-09-07') }],
    ]);

    makeTests('local week day', 'e', [
        undefined,
        undefined,
        [{ expected: 'Sat', input: withDate('2024-09-07') }],
        [{ expected: 'Saturday', input: withDate('2024-09-07') }],
    ]);

    makeTests('period', 'a', [
        [
            { expected: 'AM', input: withTime('10:00:00') },
            { expected: 'PM', input: withTime('12:00:00') },
        ],
        [
            { expected: 'AM', input: withTime('10:00:00') },
            { expected: 'PM', input: withTime('12:00:00') },
        ],
        [
            { expected: 'AM', input: withTime('10:00:00') },
            { expected: 'PM', input: withTime('12:00:00') },
        ],
    ]);

    makeTests('flexible day period', 'B', [
        [
            { expected: 'in the morning', input: withTime('06:00:00') },
            { expected: 'noon', input: withTime('12:00:00') },
            { expected: 'in the afternoon', input: withTime('16:00:00') },
            { expected: 'at night', input: withTime('23:00:00') },
        ],
        [],
        [],
        [
            { expected: 'in the morning', input: withTime('06:00:00') },
            { expected: 'noon', input: withTime('12:00:00') },
            { expected: 'in the afternoon', input: withTime('16:00:00') },
            { expected: 'at night', input: withTime('23:00:00') },
        ],
    ]);

    describe('hour', () => {
        makeTests('1-12 format (1 PM)', 'h', [
            [{ expected: '1', input: withTime('13:00:00') }],
            [{ expected: '01', input: withTime('13:00:00') }],
        ]);

        makeTests('1-12 format (12 PM)', 'h', [
            [{ expected: '12', input: withTime('00:00:00') }],
            [{ expected: '12', input: withTime('00:00:00') }],
        ]);

        makeTests('0-23 format', 'H', [
            [
                { expected: '0', input: withTime('00:00:00') },
                { expected: '13', input: withTime('13:00:00') },
            ],
            [
                { expected: '00', input: withTime('00:00:00') },
                { expected: '13', input: withTime('13:00:00') },
            ],
        ]);

        makeTests('0-11 format', 'K', [
            [
                { expected: '0', input: withTime('00:00:00') },
                { expected: '1', input: withTime('13:00:00') },
            ],
            [
                { expected: '00', input: withTime('00:00:00') },
                { expected: '01', input: withTime('13:00:00') },
            ],
        ]);

        makeTests('1-24 format', 'k', [
            [
                { expected: '13', input: withTime('13:00:00') },
                { expected: '24', input: withTime('00:00:00') },
            ],
            [
                { expected: '13', input: withTime('13:00:00') },
                { expected: '24', input: withTime('00:00:00') },
            ],
        ]);
    });

    makeTests('minute', 'm', [
        [
            { expected: '0', input: withTime('00:00:00') },
            { expected: '59', input: withTime('00:59:00') },
        ],
        [
            { expected: '00', input: withTime('00:00:00') },
            { expected: '59', input: withTime('00:59:00') },
        ],
    ]);

    makeTests('seconds', 's', [
        [
            { expected: '0', input: withTime('00:00:00') },
            { expected: '59', input: withTime('00:00:59') },
        ],
        [
            { expected: '00', input: withTime('00:00:00') },
            { expected: '59', input: withTime('00:00:59') },
        ],
    ]);

    makeTests('fractional seconds', 'S', [
        [
            { expected: '0', input: withTime('00:00:00.000') },
            { expected: '0', input: withTime('00:00:00.001') },
            { expected: '0', input: withTime('00:00:00.010') },
            { expected: '1', input: withTime('00:00:00.100') },
        ],

        [
            { expected: '00', input: withTime('00:00:00.000') },
            { expected: '00', input: withTime('00:00:00.001') },
            { expected: '01', input: withTime('00:00:00.010') },
            { expected: '10', input: withTime('00:00:00.100') },
        ],

        [
            { expected: '000', input: withTime('00:00:00.000') },
            { expected: '001', input: withTime('00:00:00.001') },
            { expected: '010', input: withTime('00:00:00.010') },
            { expected: '100', input: withTime('00:00:00.100') },
        ],
    ]);
});
