<your-account-id>

  You are logged in with an OAuth Token, associated with the email <your-email>.
┌───────────────────────────────────┬──────────────────────────────────┐
│ Account Name                      │ Account ID                       │
├───────────────────────────────────┼──────────────────────────────────┤
│ <Your Name>'s Account │ <your-account-id> │
└───────────────────────────────────┴──────────────────────────────────┘
🔓 Token Permissions:
Scope (Access)
- account (read)
- user (read)
- workers (write)
- workers_kv (write)
- workers_routes (write)
- workers_scripts (write)
- workers_tail (read)
- d1 (write)
- pages (write)
- zone (read)
- ssl_certs (write)
- ai (write)
- queues (write)
- pipelines (write)
- offline_access 


✅ Successfully created DB 'cf-next-llm-db' in region APAC
Created your new D1 database.

{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cf-next-llm-db",
      "database_id": "<your-database-id>"
    }
  ]
}

Migrations to be applied:
┌────────────────────────────────────┐
│ name                               │
├────────────────────────────────────┤
│ 0000_military_mulholland_black.sql │
└────────────────────────────────────┘
✔ About to apply 1 migration(s)
Your database may not be available to serve requests during the migration, continue? … yes
🌀 Executing on remote database cf-next-llm-db (<your-database-id>):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 10 commands in 1.56ms
┌────────────────────────────────────┬────────┐
│ name                               │ status │
├────────────────────────────────────┼────────┤
│ 0000_military_mulholland_black.sql │ ✅     │



🌀 Executing on remote database cf-next-llm-db (<your-database-id>):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 1 command in 0.14ms
┌─────────────────────┐
│ name                │
├─────────────────────┤
│ _cf_KV              │
├─────────────────────┤
│ d1_migrations       │
├─────────────────────┤
│ sqlite_sequence     │
├─────────────────────┤
│ accounts            │
├─────────────────────┤
│ authenticators      │
├─────────────────────┤
│ sessions            │
├─────────────────────┤
│ users               │
├─────────────────────┤
│ verification_tokens │
├─────────────────────┤
│ counters            │
├─────────────────────┤
│ usage_logs          │


pnpm wrangler r2 bucket create cf-next-llm-logs

 ⛅️ wrangler 4.54.0
───────────────────
Creating bucket 'cf-next-llm-logs'...
✅ Created bucket 'cf-next-llm-logs' with default storage class of Standard.
To access your new R2 Bucket in your Worker, add the following snippet to your configuration file:
{
  "r2_buckets": [
    {
      "bucket_name": "cf-next-llm-logs",
      "binding": "cf_next_llm_logs"
    }
  ]
}
✔ Would you like Wrangler to add it on your behalf? … yes
✔ What binding name would you like to use? … cf_next_llm_logs
✔ For local dev, do you want to connect to the remote resource instead of a local resource? … yes

 ⛅️ wrangler 4.54.0
───────────────────
✔ Enter a secret value: … ********************************************
🌀 Creating the secret for the Worker "cf-next-llm-app" 
✔ There doesn't seem to be a Worker called "cf-next-llm-app". Do you want to create a new Worker with that name and add secrets to it? … yes
🌀 Creating new Worker "cf-next-llm-app"...
✨ Success! Uploaded secret AUTH_SECRET

 pnpm wrangler secret put OPENAI_API_KEY

 ⛅️ wrangler 4.54.0
───────────────────
✔ Enter a secret value: … ********************************************************************************************************************************************************************
🌀 Creating the secret for the Worker "cf-next-llm-app" 
✨ Success! Uploaded secret OPENAI_API_KEY

 pnpm wrangler secret put GEMINI_API_KEY

 ⛅️ wrangler 4.54.0
───────────────────
✔ Enter a secret value: … ***************************************
🌀 Creating the secret for the Worker "cf-next-llm-app" 
✨ Success! Uploaded secret GEMINI_API_KEY
.venvamite@amitewin:~/code/ts/Cloudflare-Nextjs-LLm-boilerplate ‹main› 
$ pnpm wrangler secret put GOOGLE_CLIENT_ID

 ⛅️ wrangler 4.54.0
───────────────────
✔ Enter a secret value: … ************************************************************************
🌀 Creating the secret for the Worker "cf-next-llm-app" 
✨ Success! Uploaded secret GOOGLE_CLIENT_ID
.venvamite@amitewin:~/code/ts/Cloudflare-Nextjs-LLm-boilerplate ‹main› 
$ pnpm wrangler secret put GOOGLE_CLIENT_SECRET

 ⛅️ wrangler 4.54.0
───────────────────
✔ Enter a secret value: … ***********************************
🌀 Creating the secret for the Worker "cf-next-llm-app" 
✨ Success! Uploaded secret GOOGLE_CLIENT_SECRET
.venvamite@amitewin:~/code/ts/Cloudflare-Nextjs-LLm-boilerplate ‹main›
pnpm wrangler secret list
[
  {
    "name": "AUTH_SECRET",
    "type": "secret_text"
  },
  {
    "name": "GEMINI_API_KEY",
    "type": "secret_text"
  },
  {
    "name": "GOOGLE_CLIENT_ID",
    "type": "secret_text"
  },
  {
    "name": "GOOGLE_CLIENT_SECRET",
    "type": "secret_text"
  },
  {
    "name": "OPENAI_API_KEY",
    "type": "secret_text"
  }
]