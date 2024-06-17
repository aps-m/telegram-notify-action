# telegram-notify-action

Действие для отправки текстовых сообщений и файлов в Telegram.

## Применение

Автоматизация отправки уведомлений.

## Параметры

### Вход

| Параметр     | Описание                                            | Тип    | Обязательный | Значение по умолчанию |
| ------------ | --------------------------------------------------- | ------ | ------------ | --------------------- |
| token        | токен для Bot Api                                   | Строка | Да           | -                     |
| to           | Chat id назначения в telegram                       | Строка | Да           | -                     |
| parse_mode   | Режим парсинга сообщения ('HTML' либо 'MarkdownV2') | Строка | Нет          | HTML                  |
| message      | Текст сообщения                                     | Строка | Нет          | -                     |
| message_file | Путь к файлу с текстом сообщения                    | Строка | Нет          | -                     |
| document     | Путь к отправляемому файлу                          | Строка | Нет          | -                     |

## Примеры

### Отправка сообщения

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v1
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    message: 'Hello from action!'
    parse_mode: 'HTML'
```

### Отправка сообщения с содержимым из файла

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v1
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    message_file: 'MessageFile.html'
```

### Отправка файла

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v1
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    document: 'FileExample.ext'
```

### Отправка сообщения и файла

```yml
- name: Send message
  uses: aps-m/telegram-notify-action@v1
  with:
    token: ${{ secrets.TELEGRAM_TOKEN }}
    to: ${{ secrets.TELEGRAM_CHATID_TO }}
    message: 'Hello from action!'
    document: 'FileExample.ext'
```
