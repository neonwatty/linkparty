# fetch-content-metadata Edge Function

Fetches metadata for YouTube, Twitter/X, and Reddit URLs to display rich previews in the queue.

## Endpoint

```
POST /functions/v1/fetch-content-metadata
```

## Authentication

Requires Supabase anonymous key in the Authorization header:

```
Authorization: Bearer <SUPABASE_ANON_KEY>
```

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `Authorization` | Yes | `Bearer <SUPABASE_ANON_KEY>` |

### Body

```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to fetch metadata for |

### Supported URL Patterns

**YouTube:**
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`
- `youtube.com/shorts/VIDEO_ID`

**Twitter/X:**
- `twitter.com/username/status/TWEET_ID`
- `x.com/username/status/TWEET_ID`

**Reddit:**
- `reddit.com/r/subreddit/comments/POST_ID/...`
- `old.reddit.com/r/subreddit/comments/POST_ID/...`

## Response

### Success Response (200)

```json
{
  "success": true,
  "type": "youtube",
  "data": {
    "title": "Video Title",
    "channel": "Channel Name",
    "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
    "duration": "3:45"
  }
}
```

### Response Fields by Content Type

#### YouTube (`type: "youtube"`)

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Video title |
| `channel` | string | Channel name |
| `thumbnail` | string | Thumbnail URL |
| `duration` | string? | Video duration (e.g., "3:45") - requires `YOUTUBE_API_KEY` env var |

#### Twitter/X (`type: "tweet"`)

| Field | Type | Description |
|-------|------|-------------|
| `tweetAuthor` | string | Author display name |
| `tweetHandle` | string | Author handle (e.g., "@username") |
| `tweetContent` | string | Tweet text (max 500 chars) |
| `tweetTimestamp` | string? | Tweet timestamp (not always available) |

#### Reddit (`type: "reddit"`)

| Field | Type | Description |
|-------|------|-------------|
| `subreddit` | string | Subreddit (e.g., "r/programming") |
| `redditTitle` | string | Post title |
| `redditBody` | string? | Post body text (max 500 chars) |
| `upvotes` | number | Upvote count |
| `commentCount` | number | Comment count |

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Messages

| Error | Status | Description |
|-------|--------|-------------|
| `URL is required` | 400 | Request body missing `url` field |
| `Unsupported URL type` | 400 | URL is not YouTube, Twitter, or Reddit |
| `Invalid YouTube URL` | 400 | Could not extract video ID |
| `Video is private or unavailable` | 400 | YouTube video cannot be accessed |
| `Video not found` | 400 | YouTube video does not exist |
| `Tweet not found or deleted` | 400 | Tweet was deleted or doesn't exist |
| `Tweet is from a protected account` | 400 | Tweet author has protected tweets |
| `Reddit post not found` | 400 | Reddit post doesn't exist |
| `Reddit post is private or quarantined` | 400 | Cannot access Reddit post |
| `Method not allowed` | 405 | Request method is not POST |
| `Server error: ...` | 500 | Unexpected server error |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | No | YouTube Data API key for fetching video duration |

## Examples

### cURL

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-content-metadata' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### JavaScript/TypeScript

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/fetch-content-metadata`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }),
  }
)

const result = await response.json()
if (result.success) {
  console.log(result.type, result.data)
} else {
  console.error(result.error)
}
```

## Rate Limits

This function uses external APIs which have their own rate limits:

- **YouTube oEmbed**: No documented rate limit
- **YouTube Data API** (for duration): 10,000 quota units/day
- **Twitter oEmbed**: No documented rate limit
- **Reddit JSON API**: Follow Reddit's API rules (use User-Agent, don't abuse)

## CORS

The function includes CORS headers allowing requests from any origin:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
