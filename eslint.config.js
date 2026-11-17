import config from 'eslint-config-velis';

config.forEach((conf) => {
  if (conf.languageOptions?.parserOptions) {
    conf.languageOptions.parserOptions.project = './tsconfig.eslint.json';
  }
});

export default [{ ignores: ['.claude/', 'dist/', 'demo/dist/', 'coverage/'] }, ...config];
