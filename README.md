# codex-profiler

Gestore CLI per profili Codex da terminale. Permette di creare profili **enterprise** (OpenAI Platform) e **personal** (ChatGPT Plus) e di richiamare il profilo attivo con un unico comando `codex-profiler run`.

## Caratteristiche
- Linguaggio: TypeScript con output compilato in `dist/`.
- Configurazione persistente in `~/.codex-profiler/config.json`.
- Prompt interattivo per scegliere il tipo di profilo e, se necessario, l'API key.
- Per profili `platform`, esporta `CODEX_API_KEY` e avvia `codex`.
- Per profili `web`, apre `https://chat.openai.com` usando `xdg-open` (Linux) o `open` (macOS).
- CLI pubblicabile su npm e installabile globalmente (`codex-profiler` nel `PATH`).

## Installazione
```bash
pnpm install
pnpm run build       # produce dist/index.js
pnpm install -g .
# oppure
npm install -g codex-profiler
```

## Utilizzo rapido
```bash
codex-profiler add enterprise   # imposta nome profilo e completa i prompt (tipo + API key)
codex-profiler add personal
codex-profiler list             # mostra elenco profili e profilo attivo
codex-profiler use enterprise   # imposta il profilo attivo
codex-profiler run ai-start.sh  # inoltra il comando ad `codex` oppure apre ChatGPT
```

### Dettaglio comandi
- `add <nome>`: crea/aggiorna un profilo. Chiede il tipo (`platform` o `web`) e l'API key solo per i profili platform. Il primo profilo creato diventa automaticamente attivo.
- `use <nome>`: imposta il profilo attivo.
- `list`: riepiloga i profili salvati mostrando quale è attivo.
- `run [argomenti...]`:  
  - se il profilo attivo è `platform`, esporta `CODEX_API_KEY` e lancia `codex [argomenti...]`;  
  - se il profilo attivo è `web`, apre la web app ChatGPT Plus nel browser di sistema.

## File di configurazione
Il file `~/.codex-profiler/config.json` mantiene struttura:
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
pnpm run build               # compila TypeScript in dist/
pnpm install -g .            # test locale globale
pnpm publish --access public # o npm publish
```

Il pacchetto risultante è immediatamente utilizzabile con `npm install -g codex-profiler`.
