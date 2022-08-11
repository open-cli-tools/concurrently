declare module 'escape-it' {
    function escape(platform?: string): (...args: string[]) => string;
    export default escape;
}
