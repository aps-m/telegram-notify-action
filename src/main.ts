import * as core from '@actions/core'
import * as fs from 'fs'
import type { ParseMode } from '@grammyjs/types'
import { Bot, InputFile } from 'grammy'

const supportedParseModes = ['HTML', 'Markdown', 'MarkdownV2'] as const

function getParseMode(value: string): ParseMode {
  if ((supportedParseModes as readonly string[]).includes(value)) {
    return value as ParseMode
  }

  throw new Error(
    `Unsupported parse_mode: ${value}. Expected one of ${supportedParseModes.join(', ')}`
  )
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token: string = core.getInput('token')
    const to: string = core.getInput('to')
    const message: string = core.getInput('message')
    const messageFile: string = core.getInput('message_file')
    const parseMode = getParseMode(core.getInput('parse_mode'))
    const document: string = core.getInput('document')

    const bot = new Bot(token)

    if (messageFile !== '') {
      console.log('Generating message from defined file...')
      const textFromFile = fs.readFileSync(messageFile, 'utf-8')
      console.log('Sending message from file...')

      await bot.api.sendMessage(to, textFromFile, { parse_mode: parseMode })
    }

    if (message !== '') {
      console.log('Sending simple message...')
      await bot.api.sendMessage(to, message, { parse_mode: parseMode })
    }

    if (document !== '') {
      console.log(`Start sending file ${document}`)
      await bot.api.sendDocument(to, new InputFile(document))
    }

    // Set outputs for other workflow steps to use
    //core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
