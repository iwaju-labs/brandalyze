# ML Data Collection Workflow

## Phase 1: Account Verification (~$4)

### 1. Run Apify
- Go to: https://console.apify.com/actors/61RPP7dywgiy0JPD0/input
- Paste contents of `phase1_apify_input.json`
- Run actor
- Download results as JSON → save as `phase1_results.json`

### 2. Filter accounts
```bash
cd apps/backend/ml_data
python verify_accounts.py
```

**Outputs:**
- `verified_accounts.txt` - Valid usernames only
- `account_verification_results.csv` - Full stats

**Filters:**
- Min 10k followers
- Min 100 tweets
- Account exists and active

---

## Phase 2: Tweet Collection (~$20-100)

### 1. Generate input config
```bash
python generate_phase2_input.py
```

This creates `phase2_apify_input.json` with:
- Only verified accounts
- 500 tweets per account (adjust in script)
- Excludes replies
- Sorted by engagement ("Top")

### 2. Run Apify
- Go to: https://console.apify.com/actors/61RPP7dywgiy0JPD0/input
- Paste contents of `phase2_apify_input.json`
- Run actor
- Download results as JSON → save as `phase2_results.json`

---

## Cost Estimates

**Phase 1:**
- 274 accounts × $0.016 = ~$4.38

**Phase 2 (assuming 50 verified accounts):**
- Query cost: 50 × $0.016 = $0.80
- Tweet cost: 50 × (500-40) × $0.0008 = $18.40
- **Total: ~$19.20**

**Phase 2 (assuming 100 verified accounts):**
- Query cost: 100 × $0.016 = $1.60
- Tweet cost: 100 × (500-40) × $0.0008 = $36.80
- **Total: ~$38.40**

---

## Next Steps After Data Collection

1. Label tweets by format (informative, shitpost, entertaining, etc.)
2. Label hooks, closers
3. Train classification models
4. Integrate into Brandalyze audit system
