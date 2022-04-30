import * as core from '@actions/core'
import {startRelease} from './github'

async function run(): Promise<void> {
  try {
    startRelease().subscribe()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
