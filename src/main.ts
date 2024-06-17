import * as core from '@actions/core'
const { Bot, InputFile } = require('grammy')
import * as fs from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token: string = core.getInput('token')
    const to: string = core.getInput('to')
    const message: string = core.getInput('message')
    const message_file: string = core.getInput('message_file')
    const ParseMode: string = core.getInput('parse_mode') // 'HTML', 'MarkdownV2'
    const document: string = core.getInput('document')

    const bot = new Bot(token)

    if (message_file !== '') {
      console.log('Generating message from defined file...')
      const text_from_file = fs.readFileSync(message_file, 'utf-8')
      console.log('Sending message from file...')

      await bot.api.sendMessage(to, text_from_file, { parse_mode: ParseMode })
    }

    if (message !== '') {
      console.log('Sending simple message...')
      await bot.api.sendMessage(to, message, { parse_mode: ParseMode })
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
