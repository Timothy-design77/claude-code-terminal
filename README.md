# Claude Terminal

A clean terminal interface to connect to Claude via n8n webhook.

## Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/claude-terminal)

### Option 2: Manual Deploy

1. Push this code to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" → Import your repo
4. Click "Deploy" (no config needed)

## n8n Workflow Setup

Create a webhook workflow in n8n:

1. **Webhook Node** (trigger)
   - HTTP Method: POST
   - Path: `/claude`
   
2. **HTTP Request Node** (call Anthropic API)
   - Method: POST
   - URL: `https://api.anthropic.com/v1/messages`
   - Headers:
     - `x-api-key`: Your Anthropic API key
     - `anthropic-version`: `2023-06-01`
     - `content-type`: `application/json`
   - Body:
   ```json
   {
     "model": "claude-sonnet-4-20250514",
     "max_tokens": 4096,
     "messages": {{ $json.history.concat([{ role: "user", content: $json.message }]) }}
   }
   ```

3. **Respond to Webhook Node**
   - Response Body:
   ```json
   {
     "response": "{{ $json.content[0].text }}"
   }
   ```

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration

In the web UI, expand the config panel and enter:
- **Webhook URL**: Your n8n webhook URL (e.g., `https://your-n8n.app/webhook/claude`)
- **API Key** (optional): If you've added auth to your webhook
