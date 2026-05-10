import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import n from 'eslint-plugin-n';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const jestTestTs = [
  '**/__tests__/**/*.test.ts',
  '**/__tests__/**/*.test.mts',
  '**/__tests__/**/*.test.cts',
  '**/*.test.ts',
  '**/*.test.mts',
  '**/*.test.cts',
  '**/__tests__/**/*.spec.ts',
  '**/__tests__/**/*.spec.mts',
  '**/__tests__/**/*.spec.cts',
  '**/*.spec.ts',
  '**/*.spec.mts',
  '**/*.spec.cts',
];

const commonRules = {
  'prefer-template': 'warn',
  'no-console': 'warn',
  quotes: ['error', 'single'],
  'comma-dangle': ['error', 'always-multiline'],
  'import/extensions': 'off',
  'import/no-cycle': 'off',
  'quote-props': 'off',
  'import/prefer-default-export': 'off',
  'no-await-in-loop': 'off',
  'no-restricted-syntax': 'off',
  'max-classes-per-file': 'off',
  'no-underscore-dangle': 'off',
  'no-param-reassign': 'off',
  'no-unused-expressions': 'off',
  'no-unused-vars': 'warn',
  'no-case-declarations': 'off',
  'no-shadow': 'off',
  'brace-style': ['error', '1tbs', { allowSingleLine: true }],
  'lines-between-class-members': 'off',
  'max-len': ['warn', 200],
  'class-methods-use-this': 'off',
  'no-nested-ternary': 'off',
  'no-use-before-define': 'off',
  'key-spacing': ['error', {
    afterColon: true,
    beforeColon: true,
    align: {
      beforeColon: true,
      afterColon: true,
      on: 'colon',
    },
  }],
  'import/no-extraneous-dependencies': 'off',
  'object-curly-newline': ['error', { multiline: true, consistent: true }],
};

const tsOnlyRules = {
  '@typescript-eslint/member-delimiter-style': 'warn',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/no-empty-object-type': [
    'error',
    { allowInterfaces: 'always' },
  ],
  'n/no-missing-import': 'off',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'build/**',
      'coverage/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    ...eslint.configs.recommended,
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    ...n.configs['flat/recommended-script'],
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [...tseslint.configs.recommended],
    plugins: { import: importPlugin },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...commonRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      ...tsOnlyRules,
    },
    settings: {
      'import/extensions': ['.ts'],
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import/resolver': {
        node: {
          extensions: ['.ts', '.d.ts', '.js'],
        },
      },
    },
  },
  {
    files: jestTestTs,
    ...jestPlugin.configs['flat/recommended'],
  },
  eslintConfigPrettier,
);
