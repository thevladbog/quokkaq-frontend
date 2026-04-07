# QuokkaQ Frontend — контекст для агента

## Продукт

**QuokkaQ** — система управления очередями: подразделения (units), талоны, услуги, окна, смены, бронирование/предзапись, приглашения, киоск, табло, панели сотрудника и супервизора, админка.

## Стек

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui (Radix)
- TanStack Query, next-intl (локали)
- zod, framer-motion, react-dnd, react-rnd, react-qr-code

## Структура

- Маршруты под `app/[locale]/`: `login`, `register`, `forgot-password`, `reset-password`, `admin/*`, `staff`, `supervisor`, `kiosk`, `screen`, `ticket`, `setup` — у зон отдельные `layout.tsx`.
- Общие утилиты и компоненты — по соглашениям уже принятым в репозитории.

## Бэкенд (соседний репозиторий)

- REST: переменная `NEXT_PUBLIC_API_URL` (локально обычно `http://localhost:3001`).
- WebSocket: `NEXT_PUBLIC_WS_URL`; в проде — `wss://...` к API-хосту.
- Реализация клиента: `lib/socket.ts` — **нативный `WebSocket`**. Логи подключения — через `lib/logger.ts` (в production без лишнего `console.log`).
- Исходники API: `../quokkaq-go-backend` (относительно этого фронта в общей папке `quokkaq`).

## Локальная разработка

- `npm install` / `npm run dev` — порт **3000**.
- Полный стек БД/Redis/MinIO/API: `docker compose` в `quokkaq-go-backend`.

## Деплой

- Docker (standalone Next), CI по ветке `prod-release` → Yandex Cloud; детали в `README.md`.
