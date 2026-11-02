# CustodyX.ai

Run `npm install`, copy `.env.example` to `.env.local`, and set the existing Apps Script deployment URL and Gemini API key. Start with `npm run dev`.

## Co-parent connection

Home, the navigation menu, Messages, and Profile all lead to the connection screen. Copy an invite link and send it directly to the other parent. The link contains your sign-in username; the recipient signs in or creates a separate account, completes their profile if needed, and explicitly connects. Opening the link alone does not call the linking API.

Existing accounts can also connect by username. The screen distinguishes confirmed connections, pending requests for an unregistered username, and errors. The original Apps Script `linkByUsername` and `sync` endpoints are used; this frontend update does not require new backend routes. No invitation email or text is automatically sent.

The existing backend shares new messages and shared calendar events between linked accounts. Personal incident logs and documents remain separate. Connection status can be checked explicitly after the other parent connects. The pending username is kept while navigating this session; after signing in again, use Check connection to retrieve the server's confirmed link.

Profile edits stay in memory when visiting the connection screen and are cleared on sign-out. They are saved only with Save Profile.

## Verification

- `npm run typecheck`
- `npx playwright install chromium` (first test run only)
- `npm test`
- `npm run build`

Browser tests use isolated mocked API responses and a test-only Gemini placeholder. They cover invite sign-in and signup, explicit connection, pending/error states, profile edits, clipboard sharing, calendar navigation, offline controls, and a 320px phone viewport. They do not contact the deployed backend or make AI requests.
