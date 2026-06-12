import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Test and config files are not part of the build tsconfig's `include`,
    // so type-aware linting uses the default project service for them.
    files: ['**/*.test.ts', '*.config.{js,ts}', 'eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  eslintConfigPrettier,
);
