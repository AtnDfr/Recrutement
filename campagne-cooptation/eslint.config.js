const spfxProfile = require('@microsoft/eslint-config-spfx/lib/flat-profiles/react');

module.exports = [
  ...spfxProfile,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json'
      }
    },
    rules: {
      // null est voulu : il représente une valeur absente dans SharePoint (email, grade…).
      '@rushstack/no-new-null': 'off'
    }
  }
];
