import jsPlugin from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsdocPlugin from "eslint-plugin-jsdoc";
import globals from "globals";
import tsPlugin from "typescript-eslint";

export default [
  {
    ignores: ["src/*/resources/**/*", "node_modules/**/*", "target/**/*"],
  },
  jsdocPlugin.configs["flat/recommended"],
  jsPlugin.configs.recommended,
  ...tsPlugin.configs.recommended,
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.typescript,
  {
    plugins: {
      eslintConfigPrettier,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/explicit-member-accessibility": ["error"],
      "@typescript-eslint/array-type": ["error", { default: "generic" }],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "import/no-duplicates": ["error", { "prefer-inline": true }],
      "import/no-unresolved": "off",
      "import/namespace": "off",
      "import/named": "off",
      "import/default": "off",
      "jsdoc/tag-lines": [
        "error",
        "any",
        {
          startLines: 1,
          endLines: 0,
        },
      ],
      "jsdoc/require-description-complete-sentence": [
        "error",
        {
          tags: ["param", "returns"],
        },
      ],
      "jsdoc/require-returns-check": "off",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/require-property-type": "off",
      "jsdoc/require-throws-type": "off",
      "jsdoc/no-undefined-types": "off",
      // TypeScript is the source of truth for types, so JSDoc `{type}` annotations are not used here.
      "jsdoc/check-types": "off",
      "jsdoc/valid-types": "off",
      "jsdoc/reject-any-type": "off",
      "jsdoc/reject-function-type": "off",
      "jsdoc/ts-no-empty-object-type": "off",
      // No `@access` tags and no generators in the codebase, so these never match. Disabled.
      "jsdoc/check-access": "off",
      "jsdoc/require-yields": "off",
      "jsdoc/require-yields-check": "off",
      "jsdoc/require-yields-type": "off",
      "jsdoc/require-next-type": "off",
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          next: "return",
          prev: "*",
        },
        {
          blankLine: "always",
          next: ["const", "let", "var"],
          prev: "expression",
        },
        {
          blankLine: "always",
          next: "*",
          prev: ["const", "let", "var"],
        },
        {
          blankLine: "always",
          next: "*",
          prev: ["for", "if", "while", "do", "with"],
        },
        {
          blankLine: "always",
          next: ["function", "class"],
          prev: ["function", "class"],
        },
        {
          blankLine: "any",
          next: ["const", "let", "var"],
          prev: ["const", "let", "var"],
        },
      ],
      "import/order": [
        "error",
        {
          alphabetize: {
            caseInsensitive: true,
            order: "asc",
          },
          groups: ["builtin", "external", "parent", "sibling", "index"],
          "newlines-between": "always",
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
    },
  },
  {
    files: ["cli/**/*.ts", "src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSUnionType > TSNullKeyword",
          message: "Use the Nullable<T> (or Maybe<T>) alias instead of an inline `| null` union.",
        },
        {
          selector: "TSUnionType > TSUndefinedKeyword",
          message: "Use the Optional<T> (or Maybe<T>) alias instead of an inline `| undefined` union.",
        },
      ],
    },
  },
  {
    // The alias definitions are the one place inline `| null` / `| undefined` is intended.
    files: ["cli/types.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // `public`/`private` accessibility modifiers are TypeScript-only syntax, invalid in plain JS files:
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    rules: {
      "@typescript-eslint/explicit-member-accessibility": "off",
    },
  },
];
