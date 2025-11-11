# codex-profiler

A small CLI utility to juggle multiple Codex profiles. Enterprise profiles target the OpenAI Platform (`codex` CLI with
`CODEX_API_KEY`), while personal profiles open ChatGPT Plus in the browser.

## Features
- Written in TypeScript; compiled output lives in `dist/`.
- Persistent configuration at `~/.codex-profiler/config.json`.
- Interactive prompts for profile kind plus API key capture when needed.
- `codex-profiler run` automatically checks for a `.codex` file in the current directory and switches to the declared
  profile before executing a command.
- Platform profiles export `CODEX_API_KEY` and shell out to `codex`.
- Web profiles open `https://chat.openai.com` via `xdg-open` (Linux) or `open` (macOS).

## Installation
```bash
pnpm install
pnpm run build          # emits dist/index.js
pnpm install -g .
# or consume from npm
npm install -g codex-profiler
```

## Quick Start
```bash
codex-profiler add enterprise   # enter the profile type + API key via prompts
codex-profiler add personal
codex-profiler list             # shows stored profiles and the active one
codex-profiler use enterprise   # sets the active profile
codex-profiler run ai-start.sh  # forwards to codex or opens ChatGPT depending on the profile
```

### `.codex` auto profile detection
Inside any project directory you can drop a `.codex` file:

```json
{
  "profile": "enterprise"
}
```

When you run `codex-profiler run ...`, the CLI:
1. Reads `.codex` (if present) and looks for the `profile` field.
2. Switches the active profile automatically, persisting the change to `config.json`.
3. Logs `Detected .codex → switching to profile enterprise`.
4. Executes the requested command using the new context.

If the referenced profile does not exist, the command exits with an error so you can create it first.

## Configuration file
Located at `~/.codex-profiler/config.json`:

```json
{
  "active": "enterprise",
  "profiles": {
    "enterprise": { "type": "platform", "apiKey": "sk-..." },
    "personal": { "type": "web" }
  }
}
```

## Build & publish
```bash
pnpm run build               # compile TypeScript
pnpm install -g .            # smoke-test the global install
pnpm publish --access public # or npm publish
```

After publishing, users can install it globally with `npm install -g codex-profiler` and immediately run the four
supported commands: `add`, `use`, `list`, and `run`.
