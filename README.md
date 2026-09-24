# telegram-notify-action

Действие для отправки текстовых сообщений и файлов в Telegram.

## Применение

Автоматизация отправки уведомлений.

## Параметры

### Вход

| Параметр     | Описание                                                 | Тип    | Обязательный | Значение по умолчанию |
| ------------ | -------------------------------------------------------- | ------ | ------------ | --------------------- |
| token        | токен для Bot Api                                        | Строка | Да           | -                     |
| to           | Chat id назначения в telegram                            | Строка | Да           | -                     |
| parse_mode   | HTML, Markdown, MarkdownV2, CommonMark (автоконвертация) | Строка | Нет          | HTML                  |
| message      | Текст сообщения                                          | Строка | Нет          | -                     |
| message_file | Путь к файлу с текстом сообщения                         | Строка | Нет          | -                     |
| document     | Путь к отправляемому файлу                               | Строка | Нет          | -                     |

## Примеры

### Отправка сообщения

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v4
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    message: 'Hello from action!'
    parse_mode: 'HTML'
```

### Отправка сообщения с содержимым из файла

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v4
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    message_file: 'MessageFile.html'
```

### Отправка файла

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v4
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    document: 'FileExample.ext'
```

### Отправка сообщения и файла

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v4
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    message: 'Hello from action!'
    document: 'FileExample.ext'
```

### Отправка обычного Markdown

При `parse_mode: CommonMark` содержимое `message` и `message_file` автоматически
преобразуется из CommonMark с поддержкой зачёркивания в Telegram MarkdownV2.
Заголовки `#`, `##`, `###` становятся жирными. Поддерживаются `**жирный**`,
`*курсив*`, `~~зачёркнутый~~`, списки, ссылки, цитаты и код. Спецсимволы
экранируются автоматически, интервалы между блоками сохраняются из исходного
текста.

```yml
- name: Send changelog
  uses: aps-m/telegram-notify-action@v4
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    parse_mode: CommonMark
    message_file: CHANGELOG.md
```

Вариант с текстом:

```yml
parse_mode: CommonMark
message: |
  # Версия 1.9.2

  ### Добавлено
  - Поддержка exFAT.
```

`HTML` (по умолчанию), `Markdown` и `MarkdownV2` отправляются без преобразования
и соответствуют одноимённым режимам Telegram API. Только `CommonMark` включает
форматтер: `*текст*` означает курсив, `**текст**` — жирный, `~~текст~~` —
зачёркнутый.

Изображения превращаются в ссылки. HTML внутри Markdown отображается текстом;
таблицы не получают специального оформления. Вложенные цитаты сводятся к одному
уровню. Код выводится отдельно от жирного/курсива, внутри ссылки — обычным
текстом. Длинные сообщения автоматически на части не разбиваются.
