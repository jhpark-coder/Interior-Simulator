import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",
      "react/react-in-jsx-scope": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.config.ts", "vite.config.ts", "vitest.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/features/simulator/scene3d/**/*.{ts,tsx}"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
];
