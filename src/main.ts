import * as core from '@actions/core'
import * as fs from 'fs'
import type { ParseMode } from '@grammyjs/types'
import { Bot, HttpError, InputFile } from 'grammy'
import { formatMarkdown } from './markdown'
import { decodeFormattedMarkdown, splitMessage } from './split'
import { formatErrorDiagnostics, redactToken } from './diagnostics'

const supportedParseModes = [
  'HTML',
  'Markdown',
  'MarkdownV2',
  'CommonMark'
] as const

function getParseMode(value: string): ParseMode | 'CommonMark' {
  if ((supportedParseModes as readonly string[]).includes(value)) {
    return value as ParseMode | 'CommonMark'
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
  let token = ''
  try {
    token = core.getInput('token')
    if (token !== '') core.setSecret(token)
    const to: string = core.getInput('to')
    const message: string = core.getInput('message', { trimWhitespace: false })
    const messageFile: string = core.getInput('message_file')
    const parseMode = getParseMode(core.getInput('parse_mode'))
    const telegramParseMode =
      parseMode === 'CommonMark' ? 'MarkdownV2' : parseMode
    const document: string = core.getInput('document')

    const bot = new Bot(token)
    const messageIds: number[] = []
    const sendText = async (text: string): Promise<void> => {
      if (text.trim() === '') return

      const formatted = parseMode === 'CommonMark' ? formatMarkdown(text) : text
      const decoded =
        parseMode === 'CommonMark'
          ? decodeFormattedMarkdown(formatted)
          : undefined
      const parts =
        decoded && decoded.text.length > 4096
          ? splitMessage(decoded)
          : undefined
      const count = parts?.length ?? 1
      for (let i = 0; i < count; i++) {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 1100))
        core.info(`Sending message part ${i + 1}/${count}`)
        const part = parts?.[i]
        const sent = part
          ? await bot.api.sendMessage(to, part.text, {
              entities: part.entities
            })
          : await bot.api.sendMessage(to, formatted, {
              parse_mode: telegramParseMode
            })
        if (sent?.message_id !== undefined) messageIds.push(sent.message_id)
        core.setOutput('message_ids', JSON.stringify(messageIds))
        core.setOutput('message_count', messageIds.length)
      }
    }

    if (messageFile !== '') {
      console.log('Generating message from defined file...')
      const textFromFile = fs.readFileSync(messageFile, 'utf-8')
      console.log('Sending message from file...')

      await sendText(textFromFile)
    }

    if (message !== '') {
      console.log('Sending simple message...')
      await sendText(message)
    }

    if (document !== '') {
      core.info(redactToken(`Start sending file ${document}`, token))
      const startedAt = Date.now()
      try {
        const sent = await bot.api.sendDocument(to, new InputFile(document))
        core.info(
          `sendDocument succeeded after ${Date.now() - startedAt} ms (message_id: ${sent?.message_id ?? 'unknown'})`
        )
      } catch (error) {
        core.info(`sendDocument failed after ${Date.now() - startedAt} ms`)
        if (error instanceof HttpError) {
          core.warning(
            'Document delivery is unconfirmed: Telegram may already have received the file. Retrying may send a duplicate.'
          )
        }
        throw error
      }
    }

    // Set outputs for other workflow steps to use
    //core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    core.info(`Error diagnostics: ${formatErrorDiagnostics(error, token)}`)
    core.setFailed(
      redactToken(
        error instanceof Error
          ? error.message
          : 'Unexpected failure (see diagnostics)',
        token
      )
    )
  }
}
