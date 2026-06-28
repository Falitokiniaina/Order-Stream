---
name: image_url binary storage
description: articles.image_url stores base64 data URIs, not HTTP URLs
---

## Rule

`articles.image_url` stores complete base64 data URIs (`data:image/jpeg;base64,...`), not internet URLs.

**Why:** The app embeds images directly in the database so they work offline / without CDN dependency. The user confirmed this pattern when requesting that seed Unsplash photos be converted to binary.

**How to apply:**
- When seeding demo articles, use `fetchAsDataUrl(url)` helper in `scripts/src/seed.ts` to download and convert at seed time.
- When an admin uploads an image via the UI, the frontend converts it to a data URI before sending to the API.
- Never store raw `https://` URLs in `image_url` for production use; they are only used as a fallback if `fetchAsDataUrl` fails.
