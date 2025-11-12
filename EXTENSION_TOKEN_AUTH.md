# Extension Token-Based Auth Implementation

## What Changed

### Extension Files:
1. **auth-callback.html** - Updated to receive token from URL and validate with background
2. **background.js** - Added `storeExtensionToken()` and `validateExtensionToken()` functions
3. **popup.js** - Simplified auth flow to use `getAuthState` and open extension-auth page with extension ID

### Frontend:
1. **extension-auth/page.tsx** - Updated to:
   - Get extension_id from URL params
   - Call `/extension/auth/generate-token/` endpoint
   - Redirect to `chrome-extension://{id}/auth-callback.html?token={token}`

### Backend:
1. **extensions/views.py** - Added `generate_extension_token()` function
2. **extensions/urls.py** - Added route: `auth/generate-token/`

## How It Works

```
User clicks "Sign in" in extension
    ↓
Extension opens: localhost:3000/extension-auth?extension_id=abc123
    ↓
User signs in with Clerk (if needed)
    ↓
Frontend calls: POST /api/extension/auth/generate-token/
    ↓
Backend checks subscription → generates 90-day token → stores in DB
    ↓
Frontend redirects to: chrome-extension://abc123/auth-callback.html?token=xyz789
    ↓
Extension validates token with backend → stores if valid
    ↓
Extension works everywhere (no need for Brandalyze tabs!)
```

## Testing Steps

1. **Clear extension storage**:
   - Open extension popup
   - Right-click → Inspect
   - Console: `chrome.storage.local.clear()`

2. **Test new auth flow**:
   - Click "Sign in" button in popup
   - Should open: `localhost:3000/extension-auth?extension_id=...`
   - Sign in with Pro/Enterprise account
   - Should redirect to `chrome-extension://...?token=...`
   - Extension validates and stores token
   - Check console for "Extension token stored and validated successfully"

3. **Test persistence**:
   - Close popup
   - Reopen popup → should show authenticated state
   - Navigate to Twitter → analyze button should appear
   - Reload extension → should stay authenticated

4. **Check storage**:
   ```javascript
   chrome.storage.local.get(null, console.log)
   // Should see: extensionToken, userInfo, currentApiUrl, lastSynced
   ```

## Backend Requirements

Already implemented! ✅
- `/api/extension/auth/generate-token/` - Creates 90-day token
- `/api/extension/auth/verify-token/` - Validates token via ExtensionTokenAuthentication
- `ExtensionToken` model exists in database

## Advantages Over Old Flow

| Old (Clerk Bridge) | New (Token-Based) |
|--------------------|-------------------|
| ❌ Only works when on Brandalyze website | ✅ Works everywhere |
| ❌ Requires content script bridge | ✅ No content script needed |
| ❌ Token expires in 24 hours | ✅ 90-day expiration |
| ❌ Complex sync logic | ✅ Simple validate + store |
| ❌ "checking..." stuck state | ✅ Clear auth status |

## Files to Copy to Build

```bash
cd d:/projects/brandalyze/apps/extension
cp background/background.js build/background/background.js
cp popup/popup.js build/popup/popup.js  
cp auth-callback.html build/auth-callback.html
```

Already done! Ready to test.
