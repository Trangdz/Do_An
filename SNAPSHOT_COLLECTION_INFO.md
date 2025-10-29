# 📊 Interest Snapshots Collection Info

## Collection Name
**`interest_snapshots`**

## Database
- Default: `lendhub`
- Configurable via: `MONGODB_DB` environment variable

---

## Schema

```javascript
{
  _id: ObjectId,
  user: String,              // User address (lowercase)
  asset: String,             // Asset symbol (uppercase)
  scaledBalance: Number,     // User balance at deposit time
  liquidityIndex: Number,    // Global index at last update
  liquidityRate: Number,     // APR as decimal (0.05 = 5%)
  lastUpdateTimestamp: Number, // Unix timestamp in seconds
  updatedAt: Date           // MongoDB timestamp
}
```

---

## Indexes

### 1. Unique Composite Index
```javascript
{ user: 1, asset: 1 }  // Unique constraint
```
- Ensures one snapshot per user per asset
- Enables fast lookups

### 2. User Index
```javascript
{ user: 1 }
```
- Fast queries by user

---

## Setup

### Create Collection & Indexes
```bash
node setup-snapshot-collection.cjs
```

### Check Snapshots
```bash
# All snapshots
node check-snapshots.cjs

# Specific user
node check-snapshots.cjs 0x1234...

# Specific user + asset
node check-snapshots.cjs 0x1234... USDC
```

---

## MongoDB Commands

### View Collection
```javascript
use lendhub
db.interest_snapshots.find().pretty()
```

### Count Documents
```javascript
db.interest_snapshots.countDocuments()
```

### Find by User
```javascript
db.interest_snapshots.find({ 
  user: "0x1234..." 
})
```

### Find by User + Asset
```javascript
db.interest_snapshots.findOne({
  user: "0x1234...",
  asset: "USDC"
})
```

### Delete Old Snapshots
```javascript
// Delete snapshots older than 30 days
const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
db.interest_snapshots.deleteMany({
  lastUpdateTimestamp: { $lt: thirtyDaysAgo }
})
```

---

## API Endpoints

### Save Snapshot
```bash
POST /api/snapshot/save
Content-Type: application/json

{
  "user": "0x1234...",
  "asset": "USDC",
  "scaledBalance": 100.0,
  "liquidityIndex": 1.001230,
  "liquidityRate": 0.05,
  "lastUpdateTimestamp": 1730100000
}
```

### Get Snapshot
```bash
GET /api/snapshot/get?user=0x1234...&asset=USDC
```

---

## Example Document

```json
{
  "_id": ObjectId("..."),
  "user": "0x2a8e735cc4ea2f6e6d7d6e4ae0f1d6b8639aa10e",
  "asset": "USDC",
  "scaledBalance": 100.5,
  "liquidityIndex": 1.001523,
  "liquidityRate": 0.045,
  "lastUpdateTimestamp": 1704067200,
  "updatedAt": ISODate("2024-01-01T12:00:00Z")
}
```


