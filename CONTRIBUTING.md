# Contributing

Pull requests and contributions are warmly welcome.
Please follow existing code style and commit message conventions. Also remember to keep documentation
updated.

**Pull requests:** You don't need to bump version numbers or modify anything related to releasing. That stuff is fully automated, just write the functionality.

# Maintaining

## Code Format & Linting

Code format and lint checks are performed locally when committing to ensure the changes align with the configured rules of this repository. This happens with the help of the tools [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) and [lint-staged](https://github.com/okonet/lint-staged) which are automatically installed and configured on `pnpm install` (no further steps required).

In case of problems, a corresponding message is displayed in your terminal.
Please fix them and then run the commit command again.

## Test

Tests can be executed with the following command:

```bash
pnpm test
```
