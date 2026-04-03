# otel-hono

Hono + OpenTelemetry のデモアプリ。Traces / Metrics / Logs の 3 signals を Jaeger に送信する。

## セットアップ

```bash
bun install
```

## 起動

```bash
# Jaeger を起動
docker compose up -d

# アプリを起動
bun run dev
```

- アプリ: http://localhost:3000
- Jaeger UI: http://localhost:16686

## エンドポイント

| パス | 説明 |
|---|---|
| `GET /hello` | 即座にレスポンスを返す |
| `GET /slow` | 1〜2秒のランダム遅延後にレスポンスを返す |
| `GET /error` | 意図的に例外を投げる（エラー計装の確認用） |

## テレメトリ構成

- **Traces**: `BatchSpanProcessor` → OTLP HTTP → Jaeger
- **Metrics**: `PeriodicExportingMetricReader`（10秒間隔）→ OTLP HTTP
- **Logs**: `BatchLogRecordProcessor` → OTLP HTTP

開発用にコンソール出力も併用している。
