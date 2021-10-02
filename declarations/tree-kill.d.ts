declare module 'tree-kill' {
    function treeKill(pid: number, signal?: NodeJS.Signals): void;
    export = treeKill;
}
