#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";

type ProfileType = "platform" | "web";

interface Profile {
    type: ProfileType;
    apiKey?: string;
}

interface Config {
    active?: string;
    profiles: Record<string, Profile>;
}

const CONFIG_DIR = path.join(os.homedir(), ".codex-profiler");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const CHATGPT_URL = "https://chat.openai.com";

function ensureConfigDir(): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function sanitizeProfiles(raw: Record<string, unknown>): Record<string, Profile> {
    const sanitized: Record<string, Profile> = {};
    for (const [name, profile] of Object.entries(raw)) {
        if (!profile || typeof profile !== "object") continue;
        const type = (profile as Profile).type;
        if (type !== "platform" && type !== "web") continue;
        const apiKey = typeof (profile as Profile).apiKey === "string" ? (profile as Profile).apiKey : undefined;
        sanitized[name] = { type, ...(apiKey ? { apiKey } : {}) };
    }
    return sanitized;
}

function loadConfig(): Config {
    if (!fs.existsSync(CONFIG_PATH)) {
        return { profiles: {} };
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        if (!parsed || typeof parsed !== "object") {
            return { profiles: {} };
        }
        const profiles = sanitizeProfiles((parsed as Config).profiles ?? {});
        const active = typeof (parsed as Config).active === "string" ? (parsed as Config).active : undefined;
        return { active, profiles };
    } catch (error) {
        console.warn("Unable to parse codex-profiler config. A new blank file will be created.");
        return { profiles: {} };
    }
}

function saveConfig(config: Config): void {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        }),
    );
}

async function promptProfileType(): Promise<ProfileType> {
    while (true) {
        const value = (await prompt("Profile type (platform/web): ")).toLowerCase();
        if (value === "platform" || value === "web") {
            return value;
        }
        console.log("Please enter either 'platform' or 'web'.");
    }
}

async function promptApiKey(): Promise<string> {
    while (true) {
        const apiKey = await prompt("OpenAI API key: ");
        if (apiKey) {
            return apiKey;
        }
        console.log("The API key cannot be empty.");
    }
}

function printUsage(): void {
    console.log(`Usage:
  codex-profiler add <profile-name>
  codex-profiler use <profile-name>
  codex-profiler list
  codex-profiler run [codex-args...]

Profiles are stored in ${CONFIG_PATH}.`);
}

async function handleAdd(nameArg: string | undefined, config: Config): Promise<void> {
    const name = nameArg?.trim();
    if (!name) {
        console.error("Please provide a profile name. Example: codex-profiler add enterprise");
        process.exitCode = 1;
        return;
    }

    const type = await promptProfileType();
    const profile: Profile = { type };
    if (type === "platform") {
        profile.apiKey = await promptApiKey();
    }

    config.profiles[name] = profile;
    if (!config.active) {
        config.active = name;
    }
    saveConfig(config);
    const activationMessage = config.active === name ? " (active)" : "";
    console.log(`Profile '${name}' saved${activationMessage}.`);
}

function handleUse(nameArg: string | undefined, config: Config): void {
    const name = nameArg?.trim();
    if (!name) {
        console.error("Please provide a profile name. Example: codex-profiler use enterprise");
        process.exitCode = 1;
        return;
    }
    if (!config.profiles[name]) {
        console.error(`Profile '${name}' does not exist. Create it with 'codex-profiler add ${name}'.`);
        process.exitCode = 1;
        return;
    }
    config.active = name;
    saveConfig(config);
    console.log(`Active profile set to '${name}'.`);
}

function handleList(config: Config): void {
    const names = Object.keys(config.profiles);
    if (names.length === 0) {
        console.log("No profiles configured. Run 'codex-profiler add <name>' first.");
        return;
    }
    console.log("Profiles");
    for (const name of names.sort()) {
        const indicator = config.active === name ? "→" : " ";
        console.log(`${indicator} ${name} (${config.profiles[name].type})`);
    }
}

function resolveActiveProfile(config: Config): { name: string; profile: Profile } | null {
    if (!config.active) {
        console.error("No active profile. Use 'codex-profiler use <name>' first.");
        process.exitCode = 1;
        return null;
    }
    const profile = config.profiles[config.active];
    if (!profile) {
        console.error("The active profile is missing. Add it again with 'codex-profiler add <name>'.");
        process.exitCode = 1;
        return null;
    }
    return { name: config.active, profile };
}

function shellQuote(value: string): string {
    if (value === "") {
        return "''";
    }
    return `'${value.replace(/'/g, "'\\''")}'`;
}

function runCodex(args: string[], profile: Profile): void {
    if (!profile.apiKey) {
        console.error("The active platform profile does not have an API key. Recreate it with 'codex-profiler add <name>'.");
        process.exitCode = 1;
        return;
    }

    const command = ["codex", ...args].map(shellQuote).join(" ");
    execSync(command, {
        stdio: "inherit",
        env: {
            ...process.env,
            CODEX_API_KEY: profile.apiKey,
        },
    });
}

function openChatGPT(): void {
    console.log("Opening ChatGPT Plus in your browser...");
    const attempts = process.platform === "darwin" ? ["open", "xdg-open"] : ["xdg-open", "open"];
    for (const cmd of attempts) {
        try {
            execSync(`${cmd} ${shellQuote(CHATGPT_URL)}`, { stdio: "ignore" });
            return;
        } catch {
            // Try the next available command
        }
    }
    console.error(`Unable to open a browser automatically. Please visit ${CHATGPT_URL}.`);
}

function handleRun(args: string[], config: Config): void {
    const resolved = resolveActiveProfile(config);
    if (!resolved) {
        return;
    }
    const { profile } = resolved;
    if (profile.type === "platform") {
        runCodex(args, profile);
    } else {
        openChatGPT();
    }
}

async function main(): Promise<void> {
    ensureConfigDir();
    const config = loadConfig();
    const [, , rawCommand, ...rest] = process.argv;
    const command = (rawCommand || "").toLowerCase();

    switch (command) {
        case "add":
            await handleAdd(rest[0], config);
            break;
        case "use":
            handleUse(rest[0], config);
            break;
        case "list":
            handleList(config);
            break;
        case "run":
            handleRun(rest, config);
            break;
        case "":
            printUsage();
            break;
        default:
            console.error(`Unknown command '${command}'.`);
            printUsage();
            process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error("codex-profiler failed:", error);
    process.exit(1);
});
