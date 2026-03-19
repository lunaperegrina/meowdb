# meow-db

Minimal PostgreSQL CLI for listing tables and inspecting rows.

## 1) Quick Overview

Official root command: `meowdb`

Current v1 surface:

- `meowdb db add <name> <url>`
- `meowdb db list`
- `meowdb db use <name>`
- `meowdb db info`
- `meowdb db remove <name>`
- `meowdb tables [schema]`
- `meowdb rows <table> [--schema <schema>] [--limit <n>]`

Out of v1 scope for now: `schemas`

## 2) Install

```bash
npm install --global meow-db
```

## 3) Quick Start (happy path)

```bash
# 1) Add db
meowdb db add local postgresql://user:pass@localhost:5432/app

# 2) Select active db
meowdb db use local

# 3) List tables
meowdb tables

# 4) Inspect rows from a table
meowdb rows users --limit 20
```

## 4) Command Structure

```text
meowdb
  db
    add <name> <url>
    list
    use <name>
    info
    remove <name>
  tables [schema]
  rows <table> [--schema <schema>] [--limit <n>]
```

### Global flags (standard)

- `-h, --help`: show help for any command level.
- `--version`: show CLI version.
- `--json`: structured output for scripts.
- `-q, --quiet`: reduce output noise.

Recommended contextual help:

```bash
meowdb --help
meowdb db --help
meowdb rows --help
```

## 5) Per-command Examples

### Connection

```bash
meowdb db add prod postgresql://user:pass@db.example.com:5432/app
meowdb db list
meowdb db use prod
meowdb db info
meowdb db remove prod
```

### Tables

```bash
meowdb tables
meowdb tables analytics
```

### Rows

```bash
meowdb rows users
meowdb rows users --schema analytics
meowdb rows users --limit 100
meowdb rows users --json
```

## 6) Output and Error Conventions

### Output

- Default: human-readable.
- `--json`: stable format for automation.
- `--quiet`: only essential information.

### Errors

- Messages must be short and actionable.
- No stack traces in normal flow.
- Always suggest a next step when possible.

Actionable error example:

```text
Error: db "prod" not found.
Hint: run `meowdb db list` to see available names.
```

## Reference

- CLI design guidelines: https://clig.dev/

## Next Steps

- Implement the v1 command behavior exactly as documented above.
