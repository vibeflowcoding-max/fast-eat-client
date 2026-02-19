<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1NGB2Jfd47cqXVQHqls4XejaCuH9nn1gu

## Documentation

- Full docs index: [docs/README.md](./docs/README.md)

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure environment variables in [.env.local](.env.local):
   - Copy [.env.example](.env.example) to `.env.local`
   - Update the values as needed for your environment
   - For full local functionality, set Supabase vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

3. Run the app:
   `npm run dev`
