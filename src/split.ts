import type { MessageEntity } from '@grammyjs/types'

export interface MessagePart {
  text: string
  entities: MessageEntity[]
}

/** Read only the MarkdownV2 subset emitted by our CommonMark renderer. */
export function decodeFormattedMarkdown(source: string): MessagePart {
  let text = ''
  const entities: MessageEntity[] = []
  const styles = new Map<string, number>()
  const types = { '*': 'bold', _: 'italic', '~': 'strikethrough' } as const
  const append = (part: MessagePart): void => {
    const offset = text.length
    text += part.text
    entities.push(
      ...part.entities.map(entity => ({
        ...entity,
        offset: entity.offset + offset
      }))
    )
  }
  const endOf = (start: number, delimiter: string): number => {
    for (let j = start; j < source.length; j++) {
      if (source[j] === '\\') {
        j++
        continue
      }
      if (source.startsWith(delimiter, j)) return j
    }
    throw new Error('Unbalanced generated Markdown')
  }
  const unescape = (value: string): string => value.replace(/\\(.)/gs, '$1')

  for (let i = 0; i < source.length; ) {
    const c = source[i]
    if (c === '\\') {
      text += source[i + 1]
      i += 2
    } else if (c === '`') {
      const fenced = source.startsWith('```', i)
      const marker = fenced ? '```' : '`'
      const end = endOf(i + marker.length, marker)
      let body = source.slice(i + marker.length, end)
      let language = ''
      if (fenced) {
        const newline = body.indexOf('\n')
        language = body.slice(0, newline)
        body = body.slice(newline + 1).replace(/\n$/, '')
      }
      body = unescape(body)
      const offset = text.length
      text += body
      if (body.length)
        entities.push(
          fenced
            ? { type: 'pre', offset, length: body.length, language }
            : { type: 'code', offset, length: body.length }
        )
      i = end + marker.length
    } else if (c === '[') {
      const labelEnd = endOf(i + 1, '](')
      const urlEnd = endOf(labelEnd + 2, ')')
      const offset = text.length
      append(decodeFormattedMarkdown(source.slice(i + 1, labelEnd)))
      if (text.length > offset)
        entities.push({
          type: 'text_link',
          offset,
          length: text.length - offset,
          url: unescape(source.slice(labelEnd + 2, urlEnd))
        })
      i = urlEnd + 1
    } else if (c === '>' && (i === 0 || source[i - 1] === '\n')) {
      let end = i
      const lines: string[] = []
      do {
        const newline = source.indexOf('\n', end)
        const lineEnd = newline < 0 ? source.length : newline
        lines.push(source.slice(end + 1, lineEnd))
        end = lineEnd
        if (!source.startsWith('\n>', end)) break
        end++
      } while (end < source.length)
      const offset = text.length
      append(decodeFormattedMarkdown(lines.join('\n')))
      if (text.length > offset)
        entities.push({
          type: 'blockquote',
          offset,
          length: text.length - offset
        })
      i = end
    } else if (c in types) {
      const start = styles.get(c)
      if (start === undefined) styles.set(c, text.length)
      else {
        if (text.length > start)
          entities.push({
            type: types[c as keyof typeof types],
            offset: start,
            length: text.length - start
          })
        styles.delete(c)
      }
      i++
    } else {
      text += c
      i++
    }
  }
  if (styles.size) throw new Error('Unbalanced generated Markdown style')
  return { text, entities }
}

/** Split rendered text, clipping entity ranges without breaking surrogate pairs. */
export function splitMessage(
  message: MessagePart,
  limit = 4096
): MessagePart[] {
  if (!Number.isInteger(limit) || limit < 2)
    throw new Error('Invalid message limit')
  const parts: MessagePart[] = []
  for (let start = 0; start < message.text.length; ) {
    let end = Math.min(start + limit, message.text.length)
    if (end < message.text.length) {
      if (/[\uD800-\uDBFF]/.test(message.text[end - 1])) end--
      const newline = message.text.lastIndexOf('\n', end - 1)
      const space = message.text.lastIndexOf(' ', end - 1)
      const boundary = newline >= start ? newline : space
      if (boundary >= start && message.text.slice(start, boundary + 1).trim())
        end = boundary + 1
    }
    parts.push({
      text: message.text.slice(start, end),
      entities: message.entities.flatMap(entity => {
        const from = Math.max(start, entity.offset)
        const to = Math.min(end, entity.offset + entity.length)
        return from < to
          ? [{ ...entity, offset: from - start, length: to - from }]
          : []
      })
    })
    start = end
  }
  return parts
}
