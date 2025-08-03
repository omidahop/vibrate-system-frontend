module.exports = {
  env: {
    browser: true,
    es2021: true,
    serviceworker: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  globals: {
    Chart: 'readonly',
    supabase: 'readonly',
  }
}