import formatDate from 'date-fns/format';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { bufferCount, take } from 'rxjs/operators';
import { CloseEvent, Command } from "../command";
import { Logger } from "../logger";
import { FlowController } from "./flow-controller";
import * as defaults from '../defaults';

export class LogTimings implements FlowController {
    private readonly logger: Logger;
    private readonly timestampFormat: string;

    constructor({ logger, timestampFormat = defaults.timestampFormat }: {
        logger?: Logger,
        timestampFormat?: string,
    }) {
        this.logger = logger;
        this.timestampFormat = timestampFormat;
    }

    printExitInfoTimingTable(exitInfos: CloseEvent[]) {
        const exitInfoTable = _(exitInfos)
            .sortBy(({ timings }) => timings.durationSeconds)
            .reverse()
            .map(({ command, timings, killed, exitCode }) => {
                const readableDurationMs = (timings.endDate.getTime() - timings.startDate.getTime()).toLocaleString();
                return {
                    name: command.name,
                    duration: `${readableDurationMs}ms`,
                    'exit code': exitCode,
                    killed,
                    command: command.command,
                };
            })
            .value();

        this.logger.logGlobalEvent('Timings:');
        this.logger.logTable(exitInfoTable);
        return exitInfos;
    };

    handle(commands: Command[]) {
        if (!this.logger) {
            return { commands };
        }

        // individual process timings
        commands.forEach(command => {
            command.timer.subscribe(({ startDate, endDate }) => {
                if (!endDate) {
                    const formattedStartDate = formatDate(startDate, this.timestampFormat);
                    this.logger.logCommandEvent(`${command.command} started at ${formattedStartDate}`, command);
                } else {
                    const durationMs = endDate.getTime() - startDate.getTime();
                    const formattedEndDate = formatDate(endDate, this.timestampFormat);
                    this.logger.logCommandEvent(`${command.command} stopped at ${formattedEndDate} after ${durationMs.toLocaleString()}ms`, command);
                }
            });
        });

        // overall summary timings
        const closeStreams = commands.map(command => command.close);
        const allProcessesClosed = Rx.merge(...closeStreams).pipe(
            bufferCount(closeStreams.length),
            take(1),
        );
        allProcessesClosed.subscribe((exitInfos) => this.printExitInfoTimingTable(exitInfos));
        return { commands };
    }
};
