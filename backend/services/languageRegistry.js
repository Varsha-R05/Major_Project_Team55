import { spawnSync } from "child_process";

const commandForPlatform = (windowsCommand, unixCommand) =>
  process.platform === "win32" ? windowsCommand : unixCommand;

export const LANGUAGE_REGISTRY = Object.freeze({
  python: Object.freeze({
    id: "python",
    name: "Python",
    extension: ".py",
    runtime: commandForPlatform("python", "python3"),
    runtimeArgs: [],
  }),
  javascript: Object.freeze({
    id: "javascript",
    name: "JavaScript",
    extension: ".js",
    runtime: "node",
    runtimeArgs: [],
  }),
  java: Object.freeze({
    id: "java",
    name: "Java",
    extension: ".java",
    compiler: "javac",
    compilerArgs: [],
    runtime: "java",
    runtimeArgs: [],
    entryPoint: "Main",
  }),
  c: Object.freeze({
    id: "c",
    name: "C",
    extension: ".c",
    compiler: commandForPlatform("gcc", "gcc"),
    compilerArgs: [],
    runtime: null,
    runtimeArgs: [],
  }),
  cpp: Object.freeze({
    id: "cpp",
    name: "C++",
    extension: ".cpp",
    compiler: commandForPlatform("g++", "g++"),
    compilerArgs: [],
    runtime: null,
    runtimeArgs: [],
  }),
});

const aliases = Object.freeze({
  py: "python",
  "71": "python",
  js: "javascript",
  node: "javascript",
  "63": "javascript",
  "62": "java",
  cxx: "cpp",
  "50": "c",
  "54": "cpp",
});

export const normalizeLanguageId = (languageId) => {
  const normalized = String(languageId || "").trim().toLowerCase();
  return aliases[normalized] || normalized;
};

const isCommandAvailable = (command) => {
  if (!command) return false;

  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], {
    stdio: "ignore",
    windowsHide: true,
  });

  return result.status === 0;
};

export const getLanguage = (languageId) => {
  const normalizedId = normalizeLanguageId(languageId);
  const language = LANGUAGE_REGISTRY[normalizedId];

  if (!language) return null;

  const requiredCommands = [language.compiler, language.runtime].filter(Boolean);
  const available = requiredCommands.every(isCommandAvailable);

  return {
    ...language,
    available,
  };
};

const publicLanguage = ({ compiler, compilerArgs, runtime, runtimeArgs, ...language }) => language;

export const getAllLanguages = () =>
  Object.keys(LANGUAGE_REGISTRY)
    .map(getLanguage)
    .map(publicLanguage);

export const getAvailableLanguages = () =>
  getAllLanguages().filter((language) => language.available);
