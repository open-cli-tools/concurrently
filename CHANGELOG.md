- these dont have effect on code (mocha failed on my windows machine)
  - tests fix: windows doesnt have command 'sleep' - created one at './test/support/sleep.js' 
  - refactor: test-functional.js: 'Skipping SIGINT/SIGTERM propagation tests ...' is writen to console only once

- extracted most of code to lib.js (main.js contains ony cli arguments parsing)
- moved 'exit' function in 'lib.js' to 'config' - otherwise it would kill process, who uses api
- added api.js with single exported function - 'run(commands, options)'
- added typings.d.ts for typescript support
