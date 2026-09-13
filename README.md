# SupportHub24

SupportHub24 হলো একটি AI-powered customer support ও code workspace। Lovable-এর মতো interface-এ chat, live preview, image ও logo generation — সব একসাথে, আর GitHub connect করে customer রা নিজেদের repository থেকে সরাসরি chat করে code generate করতে পারে।

**Live app**: https://lovablegit.lovable.app

## Features

- **Chat workspace** — Lovable-এর মতো chat interface, প্রতিটি project আলাদা workspace-এ।
- **Live preview** — GitHub connect করার পর project-এর preview দেখা যায়। এটা host হয় না, শুধু preview।
- **GitHub connect** — customer রা নিজের GitHub account connect করে repository থেকে chat ও code generate করতে পারে।
- **Image ও logo generation** — chat থেকেই image, logo এবং অন্যান্য asset generate করা যায় (Gemini, ChatGPT API)।
- **Admin panel** — admin API key connect করে দেন, customer রা সেটা ব্যবহার করেন।
- **Credits** — chat ও image generation-এর জন্য credit wallet, top-up এবং ledger।

## Brand

SupportHub24-এর logo mark একটি chat bubble-এর ভেতরে hub node — customer support আর hub, দুটো ধারণাই একসাথে। Mark ও wordmark দুটোই theme token ব্যবহার করে, তাই light ও dark দুই theme-এ contrast ঠিক থাকে।

- `public/generated/project-logo-1789312916931.png` — primary logo (header, README, favicon-এর base)
- `public/favicon.svg` — browser favicon
- `src/components/SupportHubLogo.tsx` — header-এ ব্যবহৃত theme-aware logo

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/83daa525-a609-4ae7-aefa-c2eb199fe867).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Scripts

```sh
npm run dev        # start the dev server
npm run build      # production build
npm run preview    # preview the production build
npm run lint       # eslint
npm run format     # prettier --write .
