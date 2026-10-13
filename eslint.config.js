import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", "playwright-report", "test-results", ".claude/worktrees"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^React$" }],
    },
  },
  {
    files: ["src/components/ui/**/*.{js,jsx}"],
    rules: {
      "no-unused-vars": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/providers/**/*.{js,jsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Node'da çalışan dosyalar: yapılandırma, betikler, testler.
    files: ["*.config.js", "scripts/**/*.{js,mjs}", "tests/**/*.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
