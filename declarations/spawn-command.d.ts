declare module 'spawn-command' {
    import { ChildProcess, SpawnOptions } from "child_process";

    function spawnCommand(command: string, options: SpawnOptions): ChildProcess;
    export = spawnCommand;
}
