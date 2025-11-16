#!/usr/bin/env bun
import { $ } from 'bun';

const build = $`bunx tsdown --config tsdown.config.ts`;

build.stdout?.pipe(process.stdout);
build.stderr?.pipe(process.stderr);

await build;

console.log('Build completed successfully using tsdown.');
