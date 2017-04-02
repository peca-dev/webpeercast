declare const process: any;
declare const require: any;

export function safe<T>(func: (e: T) => Promise<void>) {
  return (event: T) => func(event).catch((e: any) => printError(e));
}

export function printError(e: any) {
  if (e.toString == null || e.stack == null) {
    console.error('Unsupported error object:');
    console.error(e);
    return;
  }
  console.error(
    (isFirefox() ? e.toString() + '\n' : '')
    + (<string>e.stack)
      .split('\n')
      .map(x => !isFirefox() ? x : x.replace(/(.*?)@(.*)/, '    at $1 ($2)'))
      .map((x) => {
        if (isFirefox()) {
          return x;
        }
        if (x.includes('webpack:/')) {
          return x.replace(/\/.*webpack:\//, '');
        }
        const m = x.match(/at(.*?)([ (])(\/[^:]+?):(.+):(.+)/);
        if (m == null) {
          return x;
        }
        return x.replace(
          /at(.*?)([ (])(\/[^:]+?):(.+):(.+)/,
          `at$1$2${toRelativePath(m[3])}:$4:$5`,
        );
      })
      .map(color)
      .join('\n'),
  );
}

function toRelativePath(filePath: string) {
  return require('path').relative(process.cwd(), filePath);
}

function isFirefox() {
  if (typeof navigator !== 'object') {
    return false;
  }
  return navigator.userAgent.toLowerCase().includes('firefox');
}

function color(x: string) {
  if (!isFirefox()) {
    if (
      [
        'internal/',
        'node_modules/',
        '(native)',
      ]
        .some(y => x.includes(y))
    ) {
      return `\u001b[90m${x}\u001b[39m`;
    }
    return x;
  }
  if (
    [
      '__emitToSubscription',
      'callFn',
      'defineIteratorMethods/</prototype[method]',
      'invoke',
      'step',
      'timeslice',
      'tryCatch',
    ]
      .map(y => `    at ${y} `)
      .some(y => x.startsWith(y))
    ||
    [
      '_asyncToGenerator(/<)*',
      '_callee.*\\$',
      'fetch(/<)*',
      'next(/<)*',
    ]
      .map(y => `^    at ${y} `)
      .some(y => new RegExp(y).test(x))
  ) {
    return `\u001b[90m${x}\u001b[39m`;
  }
  return x;
}
