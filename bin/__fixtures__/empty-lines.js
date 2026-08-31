process.stdout.write('first\n');
setImmediate(() => process.stdout.write('\n \nlast\n'));
