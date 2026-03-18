# image-host

Minimal temporary image hosting service. ShareX/Shottr compatible.

Files auto-expire after 1 hour (configurable).

## Setup

```bash
cd image-host
npm install
cp .env.example .env
# Edit .env with your API_KEY and BASE_URL
```

## Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

## API

### Upload

```bash
curl -X POST http://localhost:3001/files \
  -H "key: YOUR_API_KEY" \
  -F "file=@screenshot.png"
```

Response:
```json
{
  "imageUrl": "http://localhost:3001/i/abc-123.png",
  "deletionUrl": "http://localhost:3001/delete/abc-123.png?token=xxx"
}
```

### View image

```
GET /i/{filename}
```

### Delete image

```bash
# With API key
curl -X DELETE http://localhost:3001/delete/{filename} -H "key: YOUR_API_KEY"

# With token (works as GET for ShareX)
curl http://localhost:3001/delete/{filename}?token=xxx
```

## ShareX

Import `sharex.sxcu` — update the URL and API key first.

## Shottr / Folder Watcher

Use a folder watcher to POST new screenshots:

```bash
# Watch a folder and upload new files
fswatch ~/Screenshots | while read f; do
  curl -s -X POST http://localhost:3001/files \
    -H "key: YOUR_API_KEY" \
    -F "file=@$f" | jq -r '.imageUrl' | pbcopy
  echo "Uploaded: $f"
done
```

## Storage

Set `STORAGE=local` (default) or `STORAGE=s3` for S3/Cloudflare R2.

For S3/R2, set: `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | required | Auth key for uploads |
| `PORT` | 3001 | Server port |
| `BASE_URL` | http://localhost:3001 | Public URL for response URLs |
| `MAX_FILE_SIZE` | 10485760 | Max upload bytes (10MB) |
| `STORAGE` | local | `local` or `s3` |
| `FILE_TTL_MINUTES` | 60 | Auto-delete after N minutes |
