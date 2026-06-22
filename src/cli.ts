import { createRequire } from 'node:module';
import { Command, CommanderError, InvalidArgumentError } from 'commander';
import { runAudit } from './audit.js';
import { formatJson } from './report/json.js';
import { exitCodeFor } from './report/summary.js';
import { formatTable } from './report/table.js';

// package.json is one level above both src/ and dist/
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

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
    .description('Crawl a website and report broken links, missing meta tags and image problems.')
    .version(version, '-V, --version')
    .argument('<url>', 'start URL to crawl, for example https://example.com')
    .option('--depth <n>', 'how many links deep to follow from the start page', parseNumber, 2)
    .option('--max-pages <n>', 'stop after crawling this many pages', parseNumber, 50)
    .option('--json', 'print the report as JSON instead of a table', false)
    .option('--timeout <ms>', 'timeout for each request in milliseconds', parseNumber, 10000)
    .addHelpText(
      'after',
      `
Examples:
  siteaudit https://example.com
  siteaudit https://example.com --depth 3 --max-pages 100
  siteaudit https://example.com --json > report.json

Exit codes:
  0  no errors found (warnings are allowed)
  1  errors found
  2  bad usage or a crash`,
    )
    .exitOverride();

  program.parse(argv, { from: 'user' });
  const opts = program.opts<Omit<Options, 'url'>>();
  return { url: program.args[0], ...opts };
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await runAudit(options.url, {
      depth: options.depth,
      maxPages: options.maxPages,
      timeout: options.timeout,
    });
    const output = options.json ? formatJson(report) : formatTable(report);
    process.stdout.write(output + '\n');
    process.exitCode = exitCodeFor(report.issues);
  } catch (err) {
    if (err instanceof CommanderError) {
      // commander has already printed the message; help and version are not errors
      process.exit(err.exitCode === 0 ? 0 : 2);
    }
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: ${message}\n`);
    process.exitCode = 2;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
