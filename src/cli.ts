import { Command, CommanderError, InvalidArgumentError } from 'commander';

export interface Options {
  url: string;
  depth: number;
  maxPages: number;
  json: boolean;
  timeout: number;
}

function parseNumber(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new InvalidArgumentError('must be a whole number, 0 or more');
  }
  return n;
}

export function parseArgs(argv: string[]): Options {
  const program = new Command();
  program
    .name('siteaudit')
    .argument('<url>', 'start URL to crawl')
    .option('--depth <n>', 'how many links deep to follow', parseNumber, 2)
    .option('--max-pages <n>', 'stop after this many pages', parseNumber, 50)
    .option('--json', 'print the report as JSON', false)
    .option('--timeout <ms>', 'request timeout in milliseconds', parseNumber, 10000)
    .exitOverride();

  program.parse(argv, { from: 'user' });
  const opts = program.opts<Omit<Options, 'url'>>();
  return { url: program.args[0], ...opts };
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    console.log(options);
  } catch (err) {
    if (err instanceof CommanderError) {
      // commander has already printed the message; help and version are not errors
      process.exit(err.exitCode === 0 ? 0 : 2);
    }
    throw err;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
