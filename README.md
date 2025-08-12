# @synpatico/core

Core protocol engine for Synpatico, providing adaptive encoding/decoding with intelligent caching and performance optimization.

## Overview

`@synpatico/core` is the main protocol implementation that handles:
- **Adaptive Encoding**: Converts JSON data to optimized value-only packets
- **Intelligent Decoding**: Reconstructs full objects using multiple optimization strategies
- **Structure Caching**: LRU cache management with configurable limits
- **Performance Optimization**: Automatic decoder selection based on data characteristics

## Installation

```bash
npm install @synpatico/core @synpatico/genome
# or
pnpm add @synpatico/core @synpatico/genome
# or  
yarn add @synpatico/core @synpatico/genome
```

## Quick Start

### Basic Encoding & Decoding

```javascript
import { 
  createStructureDefinition, 
  encode, 
  decode 
} from '@synpatico/core';

const data = {
  users: [
    { id: 1, name: "John", email: "john@example.com" },
    { id: 2, name: "Jane", email: "jane@example.com" }
  ]
};

// Create structure definition (first time)
const structureDef = createStructureDefinition(data);

// Encode to optimized packet
const packet = encode(data, structureDef.id);
console.log(packet);
// {
//   type: "values-only",
//   structureId: "L0:123-L1:456",
//   values: [1, "John", "john@example.com", 2, "Jane", "jane@example.com"]
// }

// Decode back to full object
const reconstructed = decode(packet, structureDef);
console.log(reconstructed); // Original object restored
```

### Production Cache Configuration

```javascript
import { configureProtocolCaching } from '@synpatico/core';

// Configure caching for production
configureProtocolCaching({
  maxShapeCacheSize: 1000,        // Structure definitions
  maxKeyOrderCacheSize: 500,      // Property ordering cache
  evictionPolicy: 'lru'           // Least Recently Used
});
```

## API Reference

### Core Functions

#### `createStructureDefinition(data: object): StructureDefinition`

Creates a reusable structure definition from sample data.

```javascript
const structureDef = createStructureDefinition({
  id: 1, 
  name: "example",
  tags: ["a", "b"]
});
```

#### `encode(data: object, structureId: string): StructurePacket`

Encodes data using a known structure ID.

```javascript
const packet = encode(userData, structureDef.id);
```

#### `decode(packet: StructurePacket, structureDef: StructureDefinition): unknown`

Reconstructs the original object from an encoded packet.

```javascript
const original = decode(packet, structureDef);
```

### Advanced Functions

#### `createStructureDefinitionWithPaths(data: object)`

Creates structure definition with pre-computed value extraction paths for maximum performance.

```javascript
const { structureDef, paths } = createStructureDefinitionWithPaths(data);
const packet = encodeWithDirectPaths(data, structureDef.id, paths);
```

#### Specialized Decoders

```javascript
import { 
  decodeFast,      // Optimized single-pass decoder
  decodeGenome,    // Uses genome bitmap ordering  
  decodeCompiled   // Dynamic code generation
} from '@synpatico/core';

// Manual decoder selection (usually automatic)
const result = decodeFast(packet, structureDef);
```

### Cache Management

```javascript
import { 
  configureProtocolCaching,
  getProtocolCacheStats,
  evictOldCacheEntries,
  resetProtocolState
} from '@synpatico/core';

// Configure caching
configureProtocolCaching({
  maxShapeCacheSize: 2000,
  maxKeyOrderCacheSize: 1000
});

// Monitor cache performance
const stats = getProtocolCacheStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);

// Manual cache management
evictOldCacheEntries(); // Remove old entries
resetProtocolState();   // Clear all caches
```

## Automatic Optimization

The decoder automatically selects the optimal strategy based on your data:

- **Simple objects** (≤20 values): Standard recursive decoder
- **Complex nested data**: Ultra-fast single-pass decoder  
- **Large homogeneous arrays**: Specialized array decoder
- **Genome-optimized**: Uses deterministic property ordering when available

## Type Safety

Full TypeScript support with strict type checking:

```typescript
import type { StructureDefinition, StructurePacket } from '@synpatico/core';

interface UserData {
  id: number;
  name: string;
  email: string;
}

const structureDef: StructureDefinition = createStructureDefinition(userData);
const packet: StructurePacket = encode(userData, structureDef.id);
const result: UserData = decode(packet, structureDef) as UserData;
```

## Special Type Handling

Automatic serialization/deserialization for complex types:

```javascript
const complexData = {
  created: new Date(),
  preferences: new Map([['theme', 'dark']]),
  tags: new Set(['admin', 'verified']),
  metadata: { error: new Error('Custom error') }
};

// Types are preserved through encode/decode cycle
const packet = encode(complexData, structureId);
const restored = decode(packet, structureDef);

console.log(restored.created instanceof Date);        // true
console.log(restored.preferences instanceof Map);     // true  
console.log(restored.tags instanceof Set);           // true
console.log(restored.metadata.error instanceof Error); // true
```

## Performance

Typical performance characteristics:

| Metric | Standard JSON | @synpatico/core | Improvement |
|--------|---------------|-----------------|-------------|
| Payload Size | 2,156B | 680B | **68% smaller** |
| Parse Time | 0.8ms | 0.3ms | **63% faster** |
| Memory Usage | 100% | 45% | **55% less** |

## Error Handling

```javascript
try {
  const packet = encode(data, structureId);
  const result = decode(packet, structureDef);
} catch (error) {
  if (error.message.includes('Structure mismatch')) {
    // Handle structure evolution
    const newStructureDef = createStructureDefinition(data);
  }
}
```

## Related Packages

- **[@synpatico/genome](../genome)**: Deterministic structure ID generation

## License

MIT © Michael Sweeney