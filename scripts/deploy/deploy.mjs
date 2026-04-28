#!/usr/bin/env node
/**
 * Deploy script: builds production bundle and pushes to gh-pages branch.
 * Usage: npm run deploy
 */
import { execSync } from 'child_process'

execSync('npm run build', { stdio: 'inherit' })
execSync('npx gh-pages -d dist', { stdio: 'inherit' })
