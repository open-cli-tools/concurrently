"use strict";

process.stdin.on('data', (chunk) => {
  let line = chunk.toString().trim();
  console.log(line);

  if (line === 'stop') {
    process.exit(0);
  }
});

console.log("READING");
