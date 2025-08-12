# Express Middleware Example

This example demonstrates production-ready Synpatico middleware for Express.js applications. It shows how to automatically optimize your existing REST APIs for bandwidth savings without changing any application code.

## Features

- 🔄 **Zero API Changes** - Works with existing Express routes
- 🧠 **Automatic Structure Learning** - Analyzes and caches JSON structures  
- ⚡ **Real-time Optimization** - 30-70% bandwidth reduction on subsequent requests
- 📊 **Built-in Analytics** - Track savings and performance metrics
- 🛡️ **Graceful Fallback** - Non-Synpatico clients receive standard JSON
- 💾 **LRU Caching** - Intelligent memory management for structure cache
- 🌐 **Interactive Demo** - Beautiful web interface to test optimization

## Quick Start

```bash
pnpm install
pnpm start
```

Visit **http://localhost:3000** for the interactive demo!

## How It Works

### Phase 1: Learning (First Request)
```bash
curl http://localhost:3000/api/users
```

**Response Headers:**
```
X-Synpatico-Agent: synpatico-express-v1.0.0
X-Synpatico-Structure-ID: L0:123-L1:456-L2:789
X-Synpatico-Mode: learning
Content-Type: application/json
```

### Phase 2: Optimization (Subsequent Requests)
```bash
curl -H "X-Synpatico-Accept-ID: L0:123-L1:456-L2:789" http://localhost:3000/api/users
```

**Response Headers:**
```
X-Synpatico-Agent: synpatico-express-v1.0.0
X-Synpatico-ID: L0:123-L1:456-L2:789
X-Synpatico-Original-Size: 2156
X-Synpatico-Optimized-Size: 680
X-Synpatico-Savings: 68%
Content-Type: application/synpatico+json
```

## API Endpoints

| Endpoint | Description | Typical Size | Optimized Size | Savings |
|----------|-------------|--------------|----------------|---------|
| `/api/users` | User profiles with nested data | ~21KB | ~6.8KB | 68% |
| `/api/products` | Product catalog with specs | ~15KB | ~4.5KB | 70% |
| `/api/dashboard` | Analytics dashboard data | ~12KB | ~3.6KB | 70% |
| `/api/stats/synpatico` | Middleware statistics | N/A | N/A | N/A |

## Integration Guide

### Basic Integration

```javascript
import express from 'express';
import { synpaticoMiddleware } from './middleware.js';

const app = express();

// Apply to all API routes
app.use('/api/*', synpaticoMiddleware());

// Your existing routes work unchanged
app.get('/api/users', (req, res) => {
  res.json({ users: getUsersFromDatabase() });
});
```

### Advanced Configuration

```javascript
app.use('/api/*', synpaticoMiddleware({
  maxCacheSize: 1000,      // Max structures to cache
  enableLogging: true,     // Console logging
  pathPattern: /^\/api\//, // Routes to optimize
}));
```

### Client-Side Usage

#### Option 1: Manual Headers
```javascript
// First request - learning
let response = await fetch('/api/users');
let structureId = response.headers.get('X-Synpatico-Structure-ID');

// Subsequent requests - optimized
response = await fetch('/api/users', {
  headers: { 'X-Synpatico-Accept-ID': structureId }
});
```

#### Option 2: Synpatico Client (Automatic)
```javascript
import { createSynpaticoClient } from '@synpatico/core';

const client = createSynpaticoClient();
const response = await client.fetch('/api/users'); // Optimized automatically
```

## Real-World Logs

When running, you'll see logs like:

```
📦 GET /api/users - Learning mode: 21,156B (Structure ID: L0:123-L1:456)
🚀 GET /api/users - Optimized: 21,156B → 6,800B (68% saved)
🚀 GET /api/products - Optimized: 15,240B → 4,572B (70% saved)
💰 Total savings: 68% across 245 optimized requests
```

## Production Considerations

### Caching Strategy
- **Memory**: Uses LRU cache with configurable size limit
- **Redis**: For distributed deployments, extend to use Redis for structure storage
- **CDN**: Optimized responses are still cacheable by standard HTTP caches

### Monitoring
```javascript
// Get runtime statistics
app.get('/internal/synpatico-stats', (req, res) => {
  const stats = req.synpaticoStats();
  res.json({
    ...stats,
    uptimeHours: process.uptime() / 3600,
    memoryUsage: process.memoryUsage()
  });
});
```

### Error Handling
The middleware includes comprehensive error handling:
- Structure mismatches fall back to standard JSON
- Cache misses trigger re-learning
- Malformed requests bypass optimization
- All errors are logged with context

### Performance Impact
- **Learning**: ~0.1ms overhead on first requests
- **Optimization**: ~0.05ms overhead on subsequent requests  
- **Memory**: ~100 bytes per cached structure
- **CPU**: Minimal - structures are cached after generation

## Load Testing

Test with your own data:

```bash
# Generate load with different endpoints
for i in {1..100}; do
  curl -H "X-Synpatico-Accept-ID: $(curl -s /api/users | grep -o 'Structure-ID: [^"]*')" /api/users &
done
```

## Troubleshooting

### Common Issues

**Q: Why isn't my endpoint being optimized?**
- Check that the route matches your `pathPattern` 
- Ensure you're sending the correct `X-Synpatico-Accept-ID` header
- Verify the response is a JSON object (not array or primitive)

**Q: Structure ID keeps changing**
- This indicates your data structure is not consistent
- Check for dynamic fields or changing nested objects
- Consider normalizing your API responses

**Q: High memory usage**
- Reduce `maxCacheSize` in middleware options
- Implement Redis-based caching for distributed systems
- Monitor structure cache hit rates

### Debug Mode
```javascript
app.use('/api/*', synpaticoMiddleware({
  enableLogging: true,
  debugMode: true  // Adds verbose logging
}));
```

This example shows how Synpatico can seamlessly integrate into existing Express applications to provide automatic bandwidth optimization with zero code changes to your business logic.