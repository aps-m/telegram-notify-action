/**
 * Unit tests for the action's main functionality, src/main.ts
 */

import * as core from '@actions/core'
import * as fs from 'fs'
import * as main from '../src/main'
import * as markdown from '../src/markdown'

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
      'Unsupported parse_mode: PlainText. Expected one of HTML, Markdown, MarkdownV2, CommonMark'
    )
    expect(sendMessageMock).not.toHaveBeenCalled()
  })
})

describe('Markdown conversion selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  it.each(['message', 'message_file'])(
    'converts CommonMark from %s',
    async input => {
      const text = '# Version 1.9.2\n\n### Added\n- Item.'
      getInputMock.mockImplementation(name => {
        if (name === 'token') return 'bot-token'
        if (name === 'to') return '123'
        if (name === 'parse_mode') return 'CommonMark'
        if (name === input) return input === 'message' ? text : 'message.md'
        return ''
      })
      readFileSyncMock.mockReturnValue(text)
      await main.run()
      expect(sendMessageMock).toHaveBeenCalledWith(
        '123',
        '*Version 1\\.9\\.2*\n\n*Added*\n• Item\\.',
        { parse_mode: 'MarkdownV2' }
      )
      expect(setFailedMock).not.toHaveBeenCalled()
    }
  )

  it.each(['HTML', 'Markdown', 'MarkdownV2'])(
    'keeps %s unchanged for both inputs',
    async mode => {
      getInputMock.mockImplementation(name => {
        if (name === 'token') return 'bot-token'
        if (name === 'to') return '123'
        if (name === 'parse_mode') return mode
        if (name === 'message') return '<b>Text</b> *1\\.9\\.2*'
        if (name === 'message_file') return 'message.txt'
        return ''
      })
      readFileSyncMock.mockReturnValue('<b>File</b> *1\\.9\\.2*')
      await main.run()
      expect(sendMessageMock).toHaveBeenNthCalledWith(
        1,
        '123',
        '<b>File</b> *1\\.9\\.2*',
        { parse_mode: mode }
      )
      expect(sendMessageMock).toHaveBeenNthCalledWith(
        2,
        '123',
        '<b>Text</b> *1\\.9\\.2*',
        { parse_mode: mode }
      )
      expect(setFailedMock).not.toHaveBeenCalled()
    }
  )
})

describe('Long CommonMark publication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    jest.spyOn(core, 'setOutput').mockImplementation()
    sendMessageMock.mockResolvedValue({ message_id: 100 })
  })

  it.each(['message', 'message_file'])(
    'sends all parts from %s in order',
    async input => {
      const source = `**${'a'.repeat(5000)}**`
      getInputMock.mockImplementation(name => {
        if (name === 'token') return 'bot-token'
        if (name === 'to') return '123'
        if (name === 'parse_mode') return 'CommonMark'
        if (name === input) return input === 'message' ? source : 'changelog.md'
        return ''
      })
      readFileSyncMock.mockReturnValue(source)
      await main.run()
      expect(sendMessageMock).toHaveBeenCalledTimes(2)
      expect(sendMessageMock).toHaveBeenNthCalledWith(
        1,
        '123',
        'a'.repeat(4096),
        {
          entities: [{ type: 'bold', offset: 0, length: 4096 }]
        }
      )
      expect(sendMessageMock).toHaveBeenNthCalledWith(
        2,
        '123',
        'a'.repeat(904),
        {
          entities: [{ type: 'bold', offset: 0, length: 904 }]
        }
      )
      expect(setFailedMock).not.toHaveBeenCalled()
      expect(core.setOutput).toHaveBeenCalledWith('message_count', 2)
    }
  )

  it('fails visibly after a partial send and records completed IDs', async () => {
    getInputMock.mockImplementation(name => {
      if (name === 'token') return 'bot-token'
      if (name === 'to') return '123'
      if (name === 'parse_mode') return 'CommonMark'
      if (name === 'message') return 'x'.repeat(9000)
      return ''
    })
    sendMessageMock
      .mockResolvedValueOnce({ message_id: 101 })
      .mockRejectedValueOnce(new Error('rate limited'))
    await main.run()
    expect(sendMessageMock).toHaveBeenCalledTimes(2)
    expect(core.setOutput).toHaveBeenCalledWith('message_ids', '[101]')
    expect(setFailedMock).toHaveBeenCalledWith('rate limited')
  })
})

describe('Whitespace-only text with documents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  const modes = ['HTML', 'Markdown', 'MarkdownV2', 'CommonMark']
  const inputs = ['message', 'message_file']
  const emptyTexts = ['', ' ', '   ', '\r\n\t\n']

  it.each(
    modes.flatMap(mode =>
      inputs.flatMap(input => emptyTexts.map(text => ({ mode, input, text })))
    )
  )(
    'skips $input containing $text in $mode and sends document',
    async ({ mode, input, text }) => {
      getInputMock.mockImplementation(name => {
        if (name === 'token') return 'bot-token'
        if (name === 'to') return '123'
        if (name === 'parse_mode') return mode
        if (name === 'document') return 'installer.exe'
        if (name === input) return input === 'message' ? text : 'message.md'
        return ''
      })
      readFileSyncMock.mockReturnValue(text)

      await main.run()

      expect(sendMessageMock).not.toHaveBeenCalled()
      expect(sendDocumentMock).toHaveBeenCalledTimes(1)
      expect(sendDocumentMock).toHaveBeenCalledWith('123', {
        path: 'installer.exe'
      })
      expect(setFailedMock).not.toHaveBeenCalled()
      expect(readFileSyncMock.mock.calls).toEqual(
        input === 'message_file' ? [['message.md', 'utf-8']] : []
      )
    }
  )

  it.each(modes.flatMap(mode => inputs.map(input => ({ mode, input }))))(
    'preserves non-empty $input whitespace in $mode',
    async ({ mode, input }) => {
      const text = ' \n  First line\n\n    Indented line\n '
      const expected =
        mode === 'CommonMark' ? markdown.formatMarkdown(text) : text
      const formatMock = jest.spyOn(markdown, 'formatMarkdown')
      getInputMock.mockImplementation(name => {
        if (name === 'token') return 'bot-token'
        if (name === 'to') return '123'
        if (name === 'parse_mode') return mode
        if (name === 'document') return 'installer.exe'
        if (name === input) return input === 'message' ? text : 'message.md'
        return ''
      })
      readFileSyncMock.mockReturnValue(text)

      await main.run()

      expect(core.getInput).toHaveBeenCalledWith('message', {
        trimWhitespace: false
      })
      expect(formatMock.mock.calls).toEqual(
        mode === 'CommonMark' ? [[text]] : []
      )
      expect(sendMessageMock).toHaveBeenCalledTimes(1)
      expect(sendMessageMock).toHaveBeenCalledWith('123', expected, {
        parse_mode: mode === 'CommonMark' ? 'MarkdownV2' : mode
      })
      expect(sendDocumentMock).toHaveBeenCalledWith('123', {
        path: 'installer.exe'
      })
      expect(setFailedMock).not.toHaveBeenCalled()
      formatMock.mockRestore()
    }
  )
})
