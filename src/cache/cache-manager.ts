/**
 * Protocol Cache Management
 * Functional cache management for production environments
 */

import {
	createLRUCache,
	type LRUCacheStats,
	lruClear,
	lruGet,
	lruGetEntries,
	lruGetStats,
	lruHas,
	lruMigrate,
	lruSet,
} from "./lru-cache.js"

/**
 * Configuration options for protocol caching behavior.
 */
export interface ProtocolCacheConfig {
	/** Maximum number of shape definitions to cache (default: 1000) */
	maxShapeCacheSize?: number
	/** Maximum number of key order entries to cache (default: 500) */
	maxKeyOrderCacheSize?: number
	/** Percentage at which to trigger preemptive eviction (default: 80) */
	autoEvictionThreshold?: number
	/** Enable detailed cache statistics collection (default: false) */
	enableCacheStats?: boolean
}

/**
 * Complete cache statistics for monitoring and debugging.
 */
export interface CacheStats {
	/** Statistics for the shape definition cache */
	shapeCache: LRUCacheStats
	/** Statistics for the genome key order cache */
	keyOrderCache: {
		size: number
		maxSize: number
		utilization: number
	}
	/** Current cache configuration */
	config: Required<ProtocolCacheConfig>
}

// Default configuration - production-safe defaults
const DEFAULT_CACHE_CONFIG: Required<ProtocolCacheConfig> = {
	maxShapeCacheSize: 1000, // Limit shape cache to 1000 entries
	maxKeyOrderCacheSize: 500, // Limit key order cache to 500 entries
	autoEvictionThreshold: 80, // Start eviction at 80% capacity
	enableCacheStats: false, // Disabled by default for performance
}

// Global cache state
let cacheConfig = { ...DEFAULT_CACHE_CONFIG }
let shapeCacheState = createLRUCache<string, Record<string, unknown>>(cacheConfig.maxShapeCacheSize)
let mapKeyOrderCache: Map<string, number> | null = null
let mapKeyOrderCacheSize = 0

/**
 * Configures protocol caching behavior for production environments.
 * Should be called once at application startup to set cache limits and behavior.
 * Migrates existing cache entries to respect new size limits.
 *
 * @param config - Cache configuration options to apply
 */
export function configureProtocolCaching(config: ProtocolCacheConfig): void {
	// Update configuration
	cacheConfig = { ...cacheConfig, ...config }

	// Migrate shape cache with new size limit
	const oldEntries = lruGetEntries(shapeCacheState)
	shapeCacheState = lruMigrate(oldEntries, cacheConfig.maxShapeCacheSize)

	// Reset genome key cache to respect new limits
	if (mapKeyOrderCache && mapKeyOrderCache.size > cacheConfig.maxKeyOrderCacheSize) {
		mapKeyOrderCache = null
		mapKeyOrderCacheSize = 0
	}
}

/**
 * Gets current cache statistics for monitoring and debugging.
 * Provides detailed information about cache utilization and configuration.
 *
 * @returns Complete cache statistics including both shape and key order caches
 */
export function getProtocolCacheStats(): CacheStats {
	return {
		shapeCache: lruGetStats(shapeCacheState),
		keyOrderCache: {
			size: mapKeyOrderCacheSize,
			maxSize: cacheConfig.maxKeyOrderCacheSize,
			utilization: Math.round((mapKeyOrderCacheSize / cacheConfig.maxKeyOrderCacheSize) * 100),
		},
		config: cacheConfig,
	}
}

/**
 * Forces eviction of old cache entries when approaching configured limits.
 * Performs preemptive cleanup to maintain performance and memory usage.
 *
 * @returns Object containing the number of entries evicted
 */
export function evictOldCacheEntries(): { evicted: number } {
	let evicted = 0

	// Check if shape cache needs preemptive eviction
	const shapeCacheStats = lruGetStats(shapeCacheState)
	if (shapeCacheStats.utilization >= cacheConfig.autoEvictionThreshold) {
		const targetSize = Math.floor(cacheConfig.maxShapeCacheSize * 0.7) // Evict to 70% capacity
		const entries = lruGetEntries(shapeCacheState)
		const toEvict = shapeCacheStats.size - targetSize

		if (toEvict > 0) {
			// Keep only the most recent entries
			const keepEntries = entries.slice(0, targetSize)
			shapeCacheState = lruMigrate(keepEntries, cacheConfig.maxShapeCacheSize)
			evicted += toEvict
		}
	}

	// Reset genome cache if approaching limits
	if (
		mapKeyOrderCacheSize >=
		cacheConfig.maxKeyOrderCacheSize * (cacheConfig.autoEvictionThreshold / 100)
	) {
		const oldSize = mapKeyOrderCacheSize
		mapKeyOrderCache = null
		mapKeyOrderCacheSize = 0
		evicted += oldSize
	}

	return { evicted }
}

/**
 * Resets all module-level caches and state to initial conditions.
 * Should be called between tests to ensure clean state, or when implementing
 * cache invalidation in production.
 */
export function resetProtocolState(): void {
	shapeCacheState = lruClear(shapeCacheState)
	mapKeyOrderCache = null
	mapKeyOrderCacheSize = 0
}

/**
 * Gets a shape definition from the cache by signature.
 * Updates the access time for LRU eviction.
 *
 * @param signature - Unique signature identifying the shape
 * @returns The cached shape definition, or undefined if not found
 */
export function getShapeFromCache(signature: string): Record<string, unknown> | undefined {
	const result = lruGet(shapeCacheState, signature)
	shapeCacheState = result.newState
	return result.value
}

/**
 * Stores a shape definition in the cache with automatic LRU eviction.
 *
 * @param signature - Unique signature identifying the shape
 * @param shape - Shape definition to cache
 */
export function setShapeInCache(signature: string, shape: Record<string, unknown>): void {
	shapeCacheState = lruSet(shapeCacheState, signature, shape)
}

/**
 * Checks if a shape definition exists in the cache without updating access time.
 *
 * @param signature - Unique signature identifying the shape
 * @returns True if the shape is cached
 */
export function hasShapeInCache(signature: string): boolean {
	return lruHas(shapeCacheState, signature)
}

/**
 * Gets the current genome key order cache.
 * Returns null if the cache hasn't been initialized or has been reset.
 *
 * @returns The key order cache Map, or null if not available
 */
export function getMapKeyOrderCache(): Map<string, number> | null {
	return mapKeyOrderCache
}

/**
 * Sets the genome key order cache with the provided Map and size.
 *
 * @param cache - The key order Map to set
 * @param size - The size of the cache for tracking purposes
 */
export function setMapKeyOrderCache(cache: Map<string, number>, size: number): void {
	mapKeyOrderCache = cache
	mapKeyOrderCacheSize = size
}

/**
 * Gets the current size of the genome key order cache.
 *
 * @returns The number of entries in the key order cache
 */
export function getMapKeyOrderCacheSize(): number {
	return mapKeyOrderCacheSize
}

/**
 * Gets the maximum allowed size for the genome key order cache.
 *
 * @returns The configured maximum cache size
 */
export function getMaxKeyOrderCacheSize(): number {
	return cacheConfig.maxKeyOrderCacheSize
}
