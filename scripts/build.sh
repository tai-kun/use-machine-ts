#!/usr/bin/env bash

set -e

function cleanup() {
    if [ -f src/baseline.ts ]; then
        rm src/baseline.ts
    fi

    if [ -f tsconfig.build.json ]; then
        rm tsconfig.build.json
    fi
}

trap cleanup EXIT

# reset

if [ -d dist ]; then
    rm -rf dist
fi

# build scripts

echo 'export { useMachine } from "./useMachine"' >src/baseline.ts
node ./scripts/build.mjs

# build types

cp config/build/tsconfig.build.json tsconfig.build.json
npx tsc -p tsconfig.build.json
