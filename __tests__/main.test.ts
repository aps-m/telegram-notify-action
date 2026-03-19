/**
 * Unit tests for the action's main functionality, src/main.ts
 */

import * as core from '@actions/core'
import * as fs from 'fs'
import * as main from '../src/main'

const sendMessageMock = jest.fn()
const sendDocumentMock = jest.fn()
const inputFileMock = jest.fn()

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}))

jest.mock('grammy', () => ({
  Bot: jest.fn().mockImplementation(() => ({
    api: {
      sendMessage: sendMessageMock,
      sendDocument: sendDocumentMock
    }
  })),
  InputFile: jest.fn().mockImplementation((path: string) => {
    inputFileMock(path)
    return { path }
  })
}))

let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
const readFileSyncMock = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  it('sends message text and document', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'token':
          return 'bot-token'
        case 'to':
          return '123'
        case 'parse_mode':
          return 'HTML'
        case 'message':
          return 'Hello from action'
        case 'document':
          return 'report.txt'
        default:
          return ''
      }
    })

    await main.run()

    expect(sendMessageMock).toHaveBeenCalledWith('123', 'Hello from action', {
      parse_mode: 'HTML'
    })
    expect(inputFileMock).toHaveBeenCalledWith('report.txt')
    expect(sendDocumentMock).toHaveBeenCalledWith('123', { path: 'report.txt' })
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('reads message text from file and sends it', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'token':
          return 'bot-token'
        case 'to':
          return '123'
        case 'parse_mode':
          return 'MarkdownV2'
        case 'message_file':
          return 'message.txt'
        default:
          return ''
      }
    })
    readFileSyncMock.mockReturnValue('Message from file')

    await main.run()

    expect(readFileSyncMock).toHaveBeenCalledWith('message.txt', 'utf-8')
    expect(sendMessageMock).toHaveBeenCalledWith('123', 'Message from file', {
      parse_mode: 'MarkdownV2'
    })
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('sets a failed status for unsupported parse mode', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'token':
          return 'bot-token'
        case 'to':
          return '123'
        case 'parse_mode':
          return 'PlainText'
        default:
          return ''
      }
    })

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith(
      'Unsupported parse_mode: PlainText. Expected one of HTML, Markdown, MarkdownV2'
    )
    expect(sendMessageMock).not.toHaveBeenCalled()
  })
})
