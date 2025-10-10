// TODO: Delete this file once Typescript has added these.
declare namespace Intl {
    // https://github.com/tc39/ecma402/pull/351
    interface DateTimeFormatPartTypesRegistry {
        yearName?: string;
        relatedYear?: string;
    }

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getWeekInfo
     */
    interface WeekInfo {
        firstDay: number;
        weekend: readonly number[];
        minimalDays: number;
    }

    interface Locale {
        readonly weekInfo: WeekInfo;
        getWeekInfo?: () => WeekInfo;
    }
}
