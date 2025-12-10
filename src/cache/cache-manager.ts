import { createLRUCache, type LRUCache } from './lru-cache'

export interface ProtocolCacheConfig {
	/** Maximum number of shape definitions to cache (default: 1000) */
	maxShapeCacheSize?: number
	/** Maximum number of key order entries to cache (default: 500) */
	maxKeyOrderCacheSize?: number
}

export interface CacheStats {
	shapeCache: {
		size: number
		maxSize: number
		utilization: number
	}
	keyOrderCache: {
		size: number
		maxSize: number
		utilization: number
	}
	config: Required<ProtocolCacheConfig>
}

const DEFAULT_CACHE_CONFIG: Required<ProtocolCacheConfig> = {
	maxShapeCacheSize: 1000,
	maxKeyOrderCacheSize: 500,
}

let cacheConfig = { ...DEFAULT_CACHE_CONFIG }
let shapeCache: LRUCache<string, Record<string, unknown>> = createLRUCache(
	cacheConfig.maxShapeCacheSize,
)
let keyOrderCache: LRUCache<string, number> = createLRUCache(cacheConfig.maxKeyOrderCacheSize)

export function configureProtocolCaching(config: ProtocolCacheConfig): void {
	cacheConfig = { ...cacheConfig, ...config }

	shapeCache = createLRUCache(cacheConfig.maxShapeCacheSize)
	keyOrderCache = createLRUCache(cacheConfig.maxKeyOrderCacheSize)
}

export function getProtocolCacheStats(): CacheStats {
	return {
		shapeCache: {
			size: shapeCache.size,
			maxSize: cacheConfig.maxShapeCacheSize,
			utilization: Math.round((shapeCache.size / cacheConfig.maxShapeCacheSize) * 100),
		},
		keyOrderCache: {
			size: keyOrderCache.size,
			maxSize: cacheConfig.maxKeyOrderCacheSize,
			utilization: Math.round((keyOrderCache.size / cacheConfig.maxKeyOrderCacheSize) * 100),
		},
		config: cacheConfig,
	}
}

export function resetProtocolState(): void {
	shapeCache.clear()
	keyOrderCache.clear()
}

export function getShapeFromCache(signature: string): Record<string, unknown> | undefined {
	return shapeCache.get(signature)
}

export function setShapeInCache(signature: string, shape: Record<string, unknown>): void {
	shapeCache.set(signature, shape)
}

export function hasShapeInCache(signature: string): boolean {
	return shapeCache.has(signature)
}

export function getKeyOrder(key: string): number | undefined {
	return keyOrderCache.get(key)
}

export function setKeyOrder(key: string, order: number): void {
	keyOrderCache.set(key, order)
}

export function hasKeyOrder(key: string): boolean {
	return keyOrderCache.has(key)
}

export function getKeyOrderCacheSize(): number {
	return keyOrderCache.size
}

export function getMaxKeyOrderCacheSize(): number {
	return cacheConfig.maxKeyOrderCacheSize
}
