import { formatMarkdown } from '../src/markdown'

describe('Markdown formatter', () => {
  it.each([
    ['# ПО дисплея 1.9.2', '*ПО дисплея 1\\.9\\.2*'],
    ['## [1.9.2] - 2026-08-10', '*\\[1\\.9\\.2\\] \\- 2026\\-08\\-10*'],
    [
      '# Title\n\n## Version\n\n### Added\n- Item\n\n### Fixed\n- Other',
      '*Title*\n\n*Version*\n\n*Added*\n• Item\n\n*Fixed*\n• Other'
    ],
    ['# Title\n\n\nText', '*Title*\n\n\nText'],
    ['Title\n=====', '*Title*'],
    ['**bold** and *italic* and ~~old~~', '*bold* and _italic_ and ~old~'],
    ['***both***', '_*both*_'],
    ['# **bold** heading', '*bold heading*'],
    ['a_b_c (x)! + 1 = 2.', 'a\\_b\\_c \\(x\\)\\! \\+ 1 \\= 2\\.'],
    ['\\*literal\\*', '\\*literal\\*'],
    ['unfinished *', 'unfinished \\*'],
    ['`a_b.c`', '`a_b.c`'],
    ['# before `code` after', '*before *`code`* after*'],
    ['```cs\nvar x = `a`;\n```', '```cs\nvar x = \\`a\\`;\n```'],
    ['- first.\n- second!', '• first\\.\n• second\\!'],
    ['- first\n\n- second', '• first\n\n• second'],
    ['3. three\n4. four', '3\\. three\n4\\. four'],
    ['- outer\n  - inner', '• outer\n  • inner'],
    [
      '[site](https://example.com/a_(b))',
      '[site](https://example.com/a_(b\\))'
    ],
    [
      '[**bold** link](https://example.com)',
      '[*bold* link](https://example.com)'
    ],
    [
      '[site][ref]\n\n[ref]: https://example.com',
      '[site](https://example.com)'
    ],
    ['<https://example.com>', '[https://example\\.com](https://example.com)'],
    ['![alt](https://example.com/a.png)', '[alt](https://example.com/a.png)'],
    ['> quoted.\n> next', '>quoted\\.\n>next'],
    ['&amp; <b>x</b>', '& <b\\>x</b\\>'],
    ['a\r\nb', 'a\nb'],
    ['', '']
  ])('converts %s', (source, expected) => {
    expect(formatMarkdown(source)).toBe(expected)
  })
})
