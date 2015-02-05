# Contributing

Pull requests and contributions are warmly welcome.
Please follow existing code style and commit message conventions. Also remember to keep documentation
updated.

**Pull requests:** You don't need to bump version numbers or modify anything related to releasing. That stuff is fully automated, just write the functionality.


# Maintaining

## Test

Tests can be run with command

```bash
    npm run test
```

You need to have *mocha* installed globally with `npm install -g mocha`.


## Release

* Commit all changes
* Run `npm run release`, which will create new tag and publish code to GitHub
* Edit GitHub release notes


