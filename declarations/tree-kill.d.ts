declare module 'tree-kill' {
    function treeKill(pid: number, signal?: string): void;
    export = treeKill;
}
