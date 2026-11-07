import { plugin } from 'bun';

plugin({
  name: 'jest-syntax-rewrite-patch',
  setup(build) {
    build.onLoad({ filter: /\.test\.(ts|js)$/ }, async (args) => {
      let text = await Bun.file(args.path).text();

      // 1. Заменяем await jest.advanceTimersByTimeAsync(X)
      text = text.replace(/await\s+jest\.advanceTimersByTimeAsync\((.*?)\)/g, 'jest.advanceTimersByTime($1)');

      // 2. Заменяем jest.requireActual('module') на стандартный require('module')
      text = text.replace(/jest\.requireActual(<.*?>)?\((.*?)\)/g, 'require($2)');

      // 3. Заменяем jest.mocked(variable) на просто variable
      text = text.replace(/jest\.mocked\((.*?)\)/g, '$1');

      return {
        contents: text,
        loader: args.path.endsWith('.ts') ? 'ts' : 'js',
      };
    });
  },
});
