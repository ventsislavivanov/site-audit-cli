# siteaudit

A command-line tool that crawls a website and reports common problems: broken links, missing titles and meta descriptions, missing Open Graph tags, images without `alt` text and very large images. It exits with a non-zero code when it finds errors, so it can be used in CI.

Sample output, from a small local test site:

```
http://127.0.0.1:8099/
  error    image-alt     Image without alt: http://127.0.0.1:8099/x.png
  error    broken-links  Broken link: http://127.0.0.1:8099/gone (404)
  warning  meta-tags     Missing meta description
  warning  open-graph    Missing og:title
  warning  open-graph    Missing og:description
  warning  open-graph    Missing og:image

Crawled 2 pages: 2 errors, 4 warnings.
```

## Run it with Docker

Nothing needs to be installed except Docker. First time only:

```
docker compose build
docker compose run --rm app npm ci
```

Then run an audit:

```
docker compose run --rm app npx tsx src/cli.ts https://example.com --depth 2 --max-pages 50
```

Save a JSON report (`-T` turns off the terminal so the output is not mangled):

```
docker compose run --rm -T app npx tsx src/cli.ts https://example.com --json > report.json
```

To audit a site running on your own machine, use `host.docker.internal` instead of `localhost`, for example `http://host.docker.internal:3000`.

To use the compiled version:

```
docker compose run --rm app npm run build
docker compose run --rm app node dist/cli.js https://example.com
```

Exit codes: `0` no errors found (warnings are allowed), `1` errors found, `2` bad usage or a crash.

## Options

| Option            | Default | Description                                       |
| ----------------- | ------- | ------------------------------------------------- |
| `<url>`           |         | Start URL, for example `https://example.com`      |
| `--depth <n>`     | `2`     | How many links deep to follow from the start page |
| `--max-pages <n>` | `50`    | Stop after crawling this many pages               |
| `--json`          | off     | Print the report as JSON instead of a table       |
| `--timeout <ms>`  | `10000` | Timeout for each request in milliseconds          |
| `-V, --version`   |         | Print the version                                 |
| `-h, --help`      |         | Show help                                         |

## Checks

| Check          | Reports                                                   | Severity |
| -------------- | --------------------------------------------------------- | -------- |
| `meta-tags`    | missing `<title>`                                         | error    |
| `meta-tags`    | missing meta description                                  | warning  |
| `open-graph`   | missing `og:title`, `og:description` or `og:image`        | warning  |
| `image-alt`    | `<img>` without an `alt` attribute (`alt=""` is accepted) | error    |
| `broken-links` | links that returned 4xx or 5xx, or did not answer         | error    |
| `image-size`   | images larger than 300 KB (checked with a HEAD request)   | warning  |

The broken link check covers every `http(s)` link on the crawled pages, including links to other sites and links the crawler did not follow. Pages the crawler visits are already checked by the crawl. All other links get a HEAD request (GET if the server answers 405 or 501), three at a time, and each URL is checked once even if many pages link to it. `mailto:`, `tel:` and `javascript:` links are skipped.

## Development

Everything runs through Docker:

```
docker compose run --rm app npm test
docker compose run --rm app npm run lint
docker compose run --rm app npm run typecheck
docker compose run --rm app npm run format
```

Tests do not use the internet. They start a local HTTP server and serve small HTML pages from it.

## Limitations

- No JavaScript rendering. Only the HTML the server sends is checked, so content added by scripts is not seen.
- Only links on the same origin as the start URL are crawled. Links to other sites, and links beyond `--depth` or `--max-pages`, are not crawled but are still checked for being broken (see below).
- Those extra link checks use a HEAD request, so the status is what the server answers to HEAD. A site that blocks bots, rate-limits you or answers HEAD differently from GET can be reported as broken when it is not (for example a 403 or 429). Check such links by hand.
- A link that does not answer within `--timeout` is reported as broken.
- A site with many links makes many extra requests, three at a time, so a large crawl takes longer.
- `robots.txt` is not read.

## License

MIT
