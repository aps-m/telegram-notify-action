import MarkdownIt from 'markdown-it'
type Token = ReturnType<typeof parser.parse>[number]

const parser = new MarkdownIt('commonmark', { html: false }).enable(
  'strikethrough'
)

interface Block {
  token: Token
  children: Block[]
}

function escape(text: string, characters = '\\_*[]()~`>#+-=|{}.!'): string {
  return Array.from(text, c => (characters.includes(c) ? `\\${c}` : c)).join('')
}

function inline(tokens: Token[], heading = false): string {
  let output = ''
  let active = ''
  const styles = heading ? ['*'] : []
  const links: { url: string; style: string }[] = []
  const desired = (): string => [...new Set(styles)].join('')
  const setStyle = (style: string): void => {
    let common = 0
    while (common < active.length && active[common] === style[common]) common++
    output +=
      active.slice(common).split('').reverse().join('') + style.slice(common)
    active = style
  }
  for (const token of tokens) {
    switch (token.type) {
      case 'strong_open':
        styles.push('*')
        break
      case 'em_open':
        styles.push('_')
        break
      case 's_open':
        styles.push('~')
        break
      case 'strong_close':
      case 'em_close':
      case 's_close':
        styles.pop()
        break
      case 'code_inline':
        setStyle(links.length ? desired() : '')
        output += links.length
          ? escape(token.content)
          : `\`${escape(token.content, '\\`')}\``
        break
      case 'link_open':
        setStyle(desired())
        links.push({
          url: String(token.attrGet('href') ?? ''),
          style: desired()
        })
        output += '['
        break
      case 'link_close': {
        const link = links.pop()
        if (!link) throw new Error('Unbalanced Markdown link')
        setStyle(link.style)
        output += `](${escape(link.url, '\\)')})`
        break
      }
      case 'image':
        setStyle(desired())
        output += `[${escape(token.content)}](${escape(String(token.attrGet('src') ?? ''), '\\)')})`
        break
      case 'softbreak':
      case 'hardbreak':
        output += '\n'
        break
      case 'text':
      case 'html_inline':
        if (token.content) {
          setStyle(desired())
          output += escape(token.content)
        }
        break
      default:
        throw new Error(`Unsupported Markdown inline: ${token.type}`)
    }
  }
  setStyle('')
  return output
}

/** Convert CommonMark to Telegram MarkdownV2, retaining source block spacing. */
export function formatMarkdown(markdown: string): string {
  const source = markdown.replace(/\r\n?/g, '\n').split('\n')
  const roots: Block[] = []
  const stack: Block[][] = [roots]
  for (const token of parser.parse(markdown, {})) {
    if (token.nesting === -1) {
      stack.pop()
      continue
    }
    const block = { token, children: [] as Block[] }
    stack[stack.length - 1].push(block)
    if (token.nesting === 1) stack.push(block.children)
  }

  const gap = (previous: Block, next: Block): string => {
    const end = previous.token.map?.[1] ?? 0
    const start = next.token.map?.[0] ?? end
    // Container maps may include blank lines; those still belong to the gap.
    let contentEnd = end
    while (contentEnd > 0 && /^\s*$/.test(source[contentEnd - 1])) contentEnd--
    return '\n'.repeat(Math.max(1, start - contentEnd + 1))
  }

  const renderBlocks = (blocks: Block[]): string => {
    let output = ''
    let previous: Block | undefined
    for (const block of blocks) {
      const text = render(block)
      if (!text) continue
      if (previous) output += gap(previous, block)
      output += text
      previous = block
    }
    return output
  }

  const render = (block: Block): string => {
    const { token, children } = block
    switch (token.type) {
      case 'paragraph_open':
      case 'heading_open':
        return inline(
          children[0]?.token.children ?? [],
          token.type === 'heading_open'
        )
      case 'bullet_list_open':
      case 'ordered_list_open': {
        let output = ''
        let previous: Block | undefined
        for (const item of children) {
          if (previous) output += gap(previous, item)
          const line = source[item.token.map?.[0] ?? 0]
          const marker = line.match(/^(\s*(?:>\s*)*)(?:[-+*]|\d+[.)])(\s+)/)
          const prefix =
            token.type === 'ordered_list_open'
              ? `${escape(item.token.info || '1')}\\. `
              : '• '
          const width = marker ? marker[0].length - marker[1].length : 2
          const text = renderBlocks(item.children)
          output +=
            prefix +
            text
              .split('\n')
              .map((part, i) => (i && part ? ' '.repeat(width) + part : part))
              .join('\n')
          previous = item
        }
        return output
      }
      case 'blockquote_open':
        return renderBlocks(children)
          .split('\n')
          .map(line => `>${line.replace(/^>+/, '')}`)
          .join('\n')
      case 'fence':
      case 'code_block': {
        const language = /^[\w+-]*$/.test(token.info) ? token.info : ''
        return `\`\`\`${language}\n${escape(
          token.content.replace(/\n$/, ''),
          '\\`'
        )}\n\`\`\``
      }
      case 'hr':
        return '———'
      default:
        throw new Error(`Unsupported Markdown block: ${token.type}`)
    }
  }

  return renderBlocks(roots)
}
