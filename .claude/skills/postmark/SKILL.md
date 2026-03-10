---
name: postmark
description: Send transactional email and manage Postmark account via REST API
---

## Summary

- Send emails, manage templates, domains, servers, suppressions, webhooks, and stats via Postmark REST API
- API token stored in dp-brain secrets: `pm/prod/POSTMARK_API_TOKEN`
- Base URL: `https://api.postmarkapp.com`
- Always include `X-Postmark-Server-Token` header with the API token

## Setup

```bash
# Get token from secrets
export POSTMARK_TOKEN=$(cd /c/Adrian/Code/dp && DECRYPT_KEY=$DECRYPT_KEY npx tsx dp-tools/src/secrets/cli.ts get pm prod POSTMARK_API_TOKEN)
```

Or ask user for DECRYPT_KEY, then fetch token inline in curl commands.

## Authentication

All requests require:
```
X-Postmark-Server-Token: <token>
Accept: application/json
Content-Type: application/json
```

---

## Operations

### Send Email

```bash
curl -s -X POST https://api.postmarkapp.com/email \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "sender@example.com",
    "To": "recipient@example.com",
    "Subject": "Hello",
    "TextBody": "Plain text body",
    "HtmlBody": "<p>HTML body</p>",
    "MessageStream": "outbound"
  }'
```

### Send Email with Template

```bash
curl -s -X POST https://api.postmarkapp.com/email/withTemplate \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "sender@example.com",
    "To": "recipient@example.com",
    "TemplateAlias": "template-alias",
    "TemplateModel": { "name": "John" },
    "MessageStream": "outbound"
  }'
```

### Send Batch Emails

```bash
curl -s -X POST https://api.postmarkapp.com/email/batch \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '[
    { "From": "a@example.com", "To": "b@example.com", "Subject": "Hi", "TextBody": "Hello" },
    { "From": "a@example.com", "To": "c@example.com", "Subject": "Hi", "TextBody": "Hello" }
  ]'
```

---

## Templates

### List Templates

```bash
curl -s "https://api.postmarkapp.com/templates?Count=50&Offset=0" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Template

```bash
curl -s "https://api.postmarkapp.com/templates/<id_or_alias>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Create Template

```bash
curl -s -X POST https://api.postmarkapp.com/templates \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "My Template",
    "Alias": "my-template",
    "Subject": "Hello {{name}}",
    "HtmlBody": "<p>Hello {{name}}</p>",
    "TextBody": "Hello {{name}}"
  }'
```

### Update Template

```bash
curl -s -X PUT "https://api.postmarkapp.com/templates/<id_or_alias>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "Subject": "Updated {{name}}", "HtmlBody": "<p>Updated {{name}}</p>" }'
```

### Delete Template

```bash
curl -s -X DELETE "https://api.postmarkapp.com/templates/<id_or_alias>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Validate Template

```bash
curl -s -X POST https://api.postmarkapp.com/templates/validate \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "Subject": "Hello {{name}}",
    "HtmlBody": "<p>Hello {{name}}</p>",
    "TextBody": "Hello {{name}}",
    "TestRenderModel": { "name": "John" }
  }'
```

---

## Message Streams

### List Streams

```bash
curl -s "https://api.postmarkapp.com/message-streams" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Stream

```bash
curl -s "https://api.postmarkapp.com/message-streams/<stream_id>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Create Stream

```bash
curl -s -X POST https://api.postmarkapp.com/message-streams \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "my-stream",
    "Name": "My Stream",
    "MessageStreamType": "Transactional"
  }'
```

---

## Outbound Messages

### List Sent Messages

```bash
curl -s "https://api.postmarkapp.com/messages/outbound?Count=50&Offset=0&MessageStream=outbound" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Message Details

```bash
curl -s "https://api.postmarkapp.com/messages/outbound/<messageID>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Message Dump (raw)

```bash
curl -s "https://api.postmarkapp.com/messages/outbound/<messageID>/dump" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Search Outbound Messages

```bash
curl -s "https://api.postmarkapp.com/messages/outbound?Count=50&Offset=0&recipient=someone@example.com&tag=welcome" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

---

## Inbound Messages

### List Inbound Messages

```bash
curl -s "https://api.postmarkapp.com/messages/inbound?Count=50&Offset=0" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Inbound Message Details

```bash
curl -s "https://api.postmarkapp.com/messages/inbound/<messageID>/details" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

---

## Bounces

### List Bounces

```bash
curl -s "https://api.postmarkapp.com/bounces?Count=50&Offset=0&MessageStream=outbound" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Bounce

```bash
curl -s "https://api.postmarkapp.com/bounces/<bounceID>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Bounce Dump

```bash
curl -s "https://api.postmarkapp.com/bounces/<bounceID>/dump" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Activate Bounce (retry delivery)

```bash
curl -s -X PUT "https://api.postmarkapp.com/bounces/<bounceID>/activate" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Bounce Tags

```bash
curl -s "https://api.postmarkapp.com/bounces/tags" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Delivery Stats Summary

```bash
curl -s "https://api.postmarkapp.com/deliverystats?messagestream=outbound" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

---

## Suppressions

### List Suppressions

```bash
curl -s "https://api.postmarkapp.com/message-streams/<stream_id>/suppressions" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Add Suppressions

```bash
curl -s -X POST "https://api.postmarkapp.com/message-streams/<stream_id>/suppressions" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "Suppressions": [{ "EmailAddress": "user@example.com" }] }'
```

### Delete Suppressions

```bash
curl -s -X DELETE "https://api.postmarkapp.com/message-streams/<stream_id>/suppressions" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "Suppressions": [{ "EmailAddress": "user@example.com" }] }'
```

---

## Stats

### Outbound Stats Overview

```bash
curl -s "https://api.postmarkapp.com/stats/outbound?messagestream=outbound&fromdate=2024-01-01&todate=2024-12-31&tag=&fromdate=2024-01-01" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Sent Counts

```bash
curl -s "https://api.postmarkapp.com/stats/outbound/sends?messagestream=outbound&fromdate=2024-01-01&todate=2024-12-31" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Bounce Counts

```bash
curl -s "https://api.postmarkapp.com/stats/outbound/bounces?messagestream=outbound&fromdate=2024-01-01&todate=2024-12-31" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Spam Complaints

```bash
curl -s "https://api.postmarkapp.com/stats/outbound/spam?messagestream=outbound&fromdate=2024-01-01&todate=2024-12-31" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Opens

```bash
curl -s "https://api.postmarkapp.com/stats/outbound/opens?messagestream=outbound&fromdate=2024-01-01&todate=2024-12-31" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Clicks

```bash
curl -s "https://api.postmarkapp.com/stats/outbound/clicks?messagestream=outbound&fromdate=2024-01-01&todate=2024-12-31" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

---

## Server Settings

### Get Server

```bash
curl -s "https://api.postmarkapp.com/server" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Update Server

```bash
curl -s -X PUT https://api.postmarkapp.com/server \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "Name": "My Server", "Color": "blue" }'
```

---

## Domains (Account-level)

For account-level operations, use `X-Postmark-Account-Token` instead of server token.

### List Domains

```bash
curl -s "https://api.postmarkapp.com/domains?Count=50&Offset=0" \
  -H "X-Postmark-Account-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Get Domain Details

```bash
curl -s "https://api.postmarkapp.com/domains/<domainID>" \
  -H "X-Postmark-Account-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Create Domain

```bash
curl -s -X POST https://api.postmarkapp.com/domains \
  -H "X-Postmark-Account-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "Name": "example.com" }'
```

### Verify DKIM / Return-Path

```bash
curl -s -X PUT "https://api.postmarkapp.com/domains/<domainID>/verifyDkim" \
  -H "X-Postmark-Account-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"

curl -s -X PUT "https://api.postmarkapp.com/domains/<domainID>/verifyReturnPath" \
  -H "X-Postmark-Account-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Delete Domain

```bash
curl -s -X DELETE "https://api.postmarkapp.com/domains/<domainID>" \
  -H "X-Postmark-Account-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

---

## Webhooks

### List Webhooks

```bash
curl -s "https://api.postmarkapp.com/webhooks?MessageStream=outbound" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

### Create Webhook

```bash
curl -s -X POST https://api.postmarkapp.com/webhooks \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "Url": "https://example.com/webhook",
    "MessageStream": "outbound",
    "HttpHeaders": [{ "Name": "X-Custom", "Value": "value" }],
    "Triggers": {
      "Delivery": { "Enabled": true },
      "Bounce": { "Enabled": true, "IncludeContent": true },
      "SpamComplaint": { "Enabled": true, "IncludeContent": false },
      "Open": { "Enabled": true, "PostFirstOpenOnly": false },
      "Click": { "Enabled": true },
      "SubscriptionChange": { "Enabled": true }
    }
  }'
```

### Update Webhook

```bash
curl -s -X PUT "https://api.postmarkapp.com/webhooks/<webhookID>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{ "Url": "https://example.com/new-webhook" }'
```

### Delete Webhook

```bash
curl -s -X DELETE "https://api.postmarkapp.com/webhooks/<webhookID>" \
  -H "X-Postmark-Server-Token: $POSTMARK_TOKEN" \
  -H "Accept: application/json"
```

---

## Secrets

- System alias: `pm`
- Env: `prod`
- Key: `POSTMARK_API_TOKEN`

```bash
# Fetch token
cd /c/Adrian/Code/dp && DECRYPT_KEY=$DECRYPT_KEY npx tsx dp-tools/src/secrets/cli.ts get pm prod POSTMARK_API_TOKEN
```

Update the secret SKILL.md systems table to include:
| pm | postmark | prod |
