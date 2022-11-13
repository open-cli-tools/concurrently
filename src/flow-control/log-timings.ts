import formatDate from 'date-fns/format';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { bufferCount, take } from 'rxjs/operators';

import { CloseEvent, Command } from '../command';
import * as defaults from '../defaults';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';

interface TimingInfo {
    name: string;
    duration: string;
    'exit code': string | number;
    killed: boolean;
    command: string;
}

/**
 * Logs timing information about commands as they start/stop and then a summary when all commands finish.
 */
export class LogTimings implements FlowController {
    static mapCloseEventToTimingInfo({
        command,
        timings,
        killed,
        exitCode,
    }: CloseEvent): TimingInfo {
        const readableDurationMs = (
            timings.endDate.getTime() - timings.startDate.getTime()
        ).toLocaleString();
        return {
            name: command.name,
            duration: readableDurationMs,
            'exit code': exitCode,
            killed,
            command: command.command,
        };
    }

    private readonly logger?: Logger;
    private readonly timestampFormat: string;

    constructor({
        logger,
        timestampFormat = defaults.timestampFormat,
    }: {
        logger?: Logger;
        timestampFormat?: string;
    }) {
        this.logger = logger;
        this.timestampFormat = timestampFormat;
    }

    private printExitInfoTimingTable(exitInfos: CloseEvent[]) {
        const exitInfoTable = _(exitInfos)
            .sortBy(({ timings }) => timings.durationSeconds)
            .reverse()
            .map(LogTimings.mapCloseEventToTimingInfo)
            .value();

        this.logger.logGlobalEvent('Timings:');
        this.logger.logTable(exitInfoTable);
        return exitInfos;
    }

    handle(commands: Command[]) {
        if (!this.logger) {
            return { commands };
        }

        // individual process timings
        commands.forEach((command) => {
            command.timer.subscribe(({ startDate, endDate }) => {
                if (!endDate) {
                    const formattedStartDate = formatDate(startDate, this.timestampFormat);
                    this.logger.logCommandEvent(
                        `${command.command} started at ${formattedStartDate}`,
                        command
                    );
                } else {
                    const durationMs = endDate.getTime() - startDate.getTime();
                    const formattedEndDate = formatDate(endDate, this.timestampFormat);
                    this.logger.logCommandEvent(
                        `${
                            command.command
                        } stopped at ${formattedEndDate} after ${durationMs.toLocaleString()}ms`,
                        command
                    );
                }
            });
        });

        // overall summary timings
        const closeStreams = commands.map((command) => command.close);
        const allProcessesClosed = Rx.merge(...closeStreams).pipe(
            bufferCount(closeStreams.length),
            take(1)
        );
        allProcessesClosed.subscribe((exitInfos) => this.printExitInfoTimingTable(exitInfos));
        return { commands };
    }
}
