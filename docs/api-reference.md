# API Reference

Complete reference for Synpatico Core packages and integration options.

## Core Package (@synpatico/core)

The foundation package containing the protocol logic and client functionality.

### Functions

#### `createStructureDefinition(data: object): StructureDefinition`

Analyzes a JSON object and creates a structure definition for caching.

```javascript
import { createStructureDefinition } from '@synpatico/core';

const data = { users: [{ id: 1, name: "John" }] };
const structure = createStructureDefinition(data);
// Returns: { shape: {...}, id: "L0:123-L1:456" }
```

#### `encode(data: object, context: EncodeContext): StructurePacket`

Encodes data into an optimized values-only packet.

```javascript
import { encode } from '@synpatico/core';

const packet = encode(data, { 
  knownStructureId: "L0:123-L1:456" 
});
// Returns: { type: 'values-only', values: [...], metadata: {...} }
```

#### `decode(packet: StructurePacket, structureDef: StructureDefinition): unknown`

Decodes a values-only packet back to full JSON using structure definition.

```javascript
import { decode } from '@synpatico/core';

const reconstructed = decode(packet, structureDefinition);
// Returns: Original JSON object with full structure
```

#### `createSynpaticoClient(options?: SynpaticoClientOptions): SynpaticoClient`

Creates a client instance for making optimized requests.

```javascript
import { createSynpaticoClient } from '@synpatico/core';

const client = createSynpaticoClient({
  isTargetUrl: (url) => url.includes('/api/'),
  enableAnalytics: true
});

// Use like normal fetch
const response = await client.fetch('/api/users');
const data = await response.json();
```

### Types

#### `StructureDefinition`
```typescript
interface StructureDefinition {
  shape: Record<string, unknown>;  // Recursive structure map
  id: string;                      // Unique structure identifier
}
```

#### `StructurePacket`
```typescript
interface StructurePacket {
  type: 'values-only' | 'differential';
  structureId: string;
  values: unknown;                 // Flat array of values
  metadata?: {
    collisionCount: number;
    levels: number;
    timestamp?: number;
  };
}
```

#### `SynpaticoClientOptions`
```typescript
interface SynpaticoClientOptions {
  isTargetUrl?: (url: string) => boolean;  // Filter which URLs to optimize
  enableAnalytics?: boolean;               // Track usage metrics
  proxyOptions?: ProxyOptions;             // Data access tracking
}
```

#### `SynpaticoClient`
```typescript
interface SynpaticoClient {
  fetch: (url: string | URL, options?: RequestInit) => Promise<Response>;
  patchGlobal: () => void;         // Patch global fetch/XMLHttpRequest
  clearCache: () => void;          // Clear structure cache
}
```

## Genome Package (@synpatico/genome)

Structure analysis and ID generation functionality.

### Functions

#### `generateStructureId(obj: unknown, config?: StructureIdConfig): string`

Generates a deterministic structure ID for any object.

```javascript
import { generateStructureId } from '@synpatico/genome';

const id = generateStructureId({ users: [{ id: 1, name: "John" }] });
// Returns: "L0:384759-L1:192847-L2:847291"
```

#### `getStructureInfo(obj: unknown): StructureInfo`

Gets detailed information about an object's structure.

```javascript
import { getStructureInfo } from '@synpatico/genome';

const info = getStructureInfo(data);
// Returns: { id: "L0:123-L1:456", levels: 2, collisionCount: 0 }
```

#### `resetState(): void`

Clears all internal caches and counters. Useful for testing.

```javascript
import { resetState } from '@synpatico/genome';

resetState(); // Clean slate
```

### Configuration

#### `setStructureIdConfig(config: StructureIdConfig): void`

Configure global structure ID generation behavior.

```javascript
import { setStructureIdConfig } from '@synpatico/genome';

setStructureIdConfig({
  newIdOnCollision: true  // Generate unique IDs for same structure
});
```

## Server Integration

### Express Middleware

```javascript
import { synpaticoMiddleware } from './middleware.js';

app.use('/api/*', synpaticoMiddleware({
  maxCacheSize: 1000,      // Max structures to cache
  enableLogging: true,     // Console logging
  pathPattern: /^\/api\//, // Routes to optimize
}));
```

#### Options

```typescript
interface MiddlewareOptions {
  maxCacheSize?: number;     // Default: 1000
  enableLogging?: boolean;   // Default: true
  pathPattern?: RegExp;      // Default: /^\/api\//
}
```

#### Statistics Access

```javascript
app.get('/stats', (req, res) => {
  const stats = req.synpaticoStats();
  res.json(stats);
});
```

#### Response Headers

**Learning Mode:**
- `X-Synpatico-Agent: synpatico-express-v1.0.0`
- `X-Synpatico-Structure-ID: L0:123-L1:456`
- `X-Synpatico-Mode: learning`
- `Content-Type: application/json`

**Optimization Mode:**
- `X-Synpatico-Agent: synpatico-express-v1.0.0`  
- `X-Synpatico-ID: L0:123-L1:456`
- `X-Synpatico-Original-Size: 2156`
- `X-Synpatico-Optimized-Size: 680`
- `X-Synpatico-Savings: 68%`
- `Content-Type: application/synpatico+json`

## HTTP Protocol

### Request Headers

#### `X-Synpatico-Accept-ID: <structure-id>`

Sent by client to request optimized response for known structure.

```bash
curl -H "X-Synpatico-Accept-ID: L0:123-L1:456" \
     http://localhost:3000/api/users
```

### Content Types

#### `application/json`
Standard JSON response during learning phase.

#### `application/synpatico+json`  
Optimized values-only response during optimization phase.

## Error Handling

### Common Errors

#### Structure Mismatch
Server detects cached structure doesn't match current data:
```
X-Synpatico-Optimization: structure-mismatch
```
Automatic fallback to learning mode.

#### Cache Miss
Client requests unknown structure ID:
```
X-Synpatico-Optimization: cache-miss  
```
Automatic fallback to learning mode.

#### Processing Failure
Unexpected error during optimization:
```
X-Synpatico-Error: processing-failed
```
Returns original JSON response.

## Performance Monitoring

### Key Metrics

```typescript
interface SynpaticoStats {
  totalRequests: number;        // All requests processed
  optimizedRequests: number;    // Successfully optimized
  bytesSaved: number;          // Total bandwidth saved
  structuresLearned: number;   // Unique structures cached
  cacheSize: number;           // Current cache entries
  optimizationRate: number;    // Percentage optimized
  averageSavings: number;      // Average bytes saved per request
}
```

### Logging Examples

```
📦 GET /api/users - Learning mode: 21,156B (Structure ID: L0:123-L1:456)
🚀 GET /api/users - Optimized: 21,156B → 6,800B (68% saved)
⚠️  Structure mismatch for /api/products. Expected: L0:123, Got: L0:789
❓ Cache miss for structure ID: L0:999-L1:888
```

## Advanced Usage

### Manual Structure Management

```javascript
import { registerStructure, exportStructureState } from '@synpatico/genome';

// Pre-register known structures
registerStructure(userData, 0);

// Export state for persistence
const state = exportStructureState();
localStorage.setItem('synpatico-state', JSON.stringify(state));
```

### Custom Proxy Factory

```javascript
import { decodeWithProxy } from '@synpatico/core';

const data = decodeWithProxy(packet, structure, (obj) => {
  return new Proxy(obj, {
    get(target, prop) {
      console.log(`Accessed: ${String(prop)}`);
      return target[prop];
    }
  });
});
```

### Redis Caching (Production)

```javascript
import Redis from 'redis';

const redis = Redis.createClient();

// Enhanced middleware with Redis backing
app.use('/api/*', synpaticoMiddleware({
  async getStructure(id) {
    const cached = await redis.get(`structure:${id}`);
    return cached ? JSON.parse(cached) : null;
  },
  
  async setStructure(id, structure) {
    await redis.setex(`structure:${id}`, 3600, JSON.stringify(structure));
  }
}));
```

## Browser Support

- ✅ Chrome 70+
- ✅ Firefox 65+  
- ✅ Safari 12+
- ✅ Edge 79+
- ⚠️ IE 11 (with polyfills)

## Node.js Support

- ✅ Node.js 16+
- ✅ Bun 1.0+
- ✅ Deno 1.20+

For detailed examples and integration guides, see the [examples](../examples/) directory.