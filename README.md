# bandiya

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/a5ab6f48-d46c-4401-b8b9-4d7bf08d32b6.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/a5ab6f48-d46c-4401-b8b9-4d7bf08d32b6)
[![Node.js CI](https://github.com/ragaeeb/bandiya/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/bandiya/actions/workflows/build.yml)
![GitHub License](https://img.shields.io/github/license/ragaeeb/bandiya)
![GitHub Release](https://img.shields.io/github/v/release/ragaeeb/bandiya)
![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
[![codecov](https://codecov.io/gh/ragaeeb/bandiya/graph/badge.svg?token=5XMFU6VOKI)](https://codecov.io/gh/ragaeeb/bandiya)

A powerful CLI tool for interacting with the Telegram platform. `bandiya` allows you to perform various actions such as downloading messages, fetching subscriber lists, and managing channels where you have administrative privileges.

## Features

-   **Download Messages** (`downloadMessages`) – Securely download channel posts, capture useful metadata (views, edits, forwards), and persist them as a sorted JSON archive.
-   **Download Subscribers** (`downloadSubscribers`) – Combine pattern-based lookups with fallback searches to build the most complete subscriber list possible, saving progress incrementally.
-   **Admin Channel Management** (`getAdminChannels`) – Audit where you have administrative rights and inspect channel statistics in a single command.
-   **Search Utilities** (`generateSearchPatterns`) – Produce comprehensive English and Arabic search prefixes that power subscriber discovery.
-   **Prompt Helpers** (`mapKeyToPrompt`) – Consistent, validated CLI prompts that keep onboarding friction-free.
-   **Secure Authentication** – API credentials and session tokens are stored locally using encrypted configuration, keeping your details private.

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ragaeeb/bandiya.git
    cd bandiya
    ```

2.  **Install dependencies**:
    ```bash
    bun install
    ```

## Usage

You can run `bandiya` using `npx`, `bunx`, or by installing it globally.

### Using `npx`

```bash
npx bandiya
```

### Using `bunx`

```bash
bunx bandiya
```

### Global Installation

```bash
npm install -g bandiya
bandiya
```

### Authentication

The first time you run `bandiya`, you will be prompted to enter your Telegram `apiId` and `apiHash`. You can obtain these from [my.telegram.org](https://my.telegram.org). After entering your credentials, you will be asked for your phone number, a code sent to your Telegram account, and your password (if you have one set up).

Your session ID will be saved locally, so you won't have to log in every time.

### Available Actions

Once authenticated, you will be presented with a menu of available actions:

-   **Download Messages/Posts**: Prompts for a channel handle and downloads all messages, saving them to a JSON file.
-   **Get Admin Channels**: Displays a table of all channels where you have administrative rights.
-   **Download Channel Subscribers**: Prompts for a channel handle and downloads a list of all subscribers, saving them to a JSON file.
-   **Log Out**: Logs you out of the current session and deletes the session ID.

## Development

-   `bun run build` – Run the `tsdown` CLI via `tsdown.config.ts` to emit the bundled CLI and its declaration files.
-   `bun test` – Execute the unit test suite covering prompt helpers, channel discovery, subscriber mapping, and search pattern generation.
-   `bun run src/index.ts` – Run the CLI in development mode without bundling.

## Project Structure

-   `src/actions/` – Core Telegram workflows (`downloadMessages`, `downloadSubscribers`, `getAdminChannels`).
-   `src/utils/` – Supporting utilities such as search pattern generation, prompt factories, and logging.
-   `scripts/tsdown.ts` – Thin Bun wrapper that shells out to the official `tsdown` CLI so CI/CD can simply run `bun run build`.
-   `tsdown.config.ts` – Centralized `tsdown` configuration (entry points, sourcemaps, declaration output, bundler targets).

---

*This project is built with TypeScript and uses the Bun runtime.*

