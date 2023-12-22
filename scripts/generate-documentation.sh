#!/bin/bash
#Generate documentation for the project based on Typescript types
pnpm exec typedoc

# Typedoc generates a README.md file in the docs folder, which is not needed
rm -rf docs/README.md
