/**
 * Functional LRU Cache Implementation
 * Pure functional approach with immutable operations
 */

/**
 * Immutable state representation of an LRU cache.
 * All operations return new state objects rather than modifying existing ones.
 */
export interface LRUCacheState<K, V> {
	readonly cache: Map<K, V>
	readonly accessOrder: Map<K, number>
	readonly accessCounter: number
	readonly maxSize: number
}

/**
 * Statistics about the current state of an LRU cache.
 */
export interface LRUCacheStats {
	readonly size: number
	readonly maxSize: number
	readonly accessCounter: number
	readonly utilization: number
}

/**
 * Creates a new empty LRU cache state with the specified maximum size.
 * 
 * @param maxSize - Maximum number of entries the cache can hold (default: 1000)
 * @returns A new empty LRU cache state
 */
export function createLRUCache<K, V>(maxSize: number = 1000): LRUCacheState<K, V> {
	return {
		cache: new Map<K, V>(),
		accessOrder: new Map<K, number>(),
		accessCounter: 0,
		maxSize,
	}
}

/**
 * Gets a value from the cache and updates its access time.
 * Returns both the value (if found) and the new cache state.
 * 
 * @param state - Current cache state
 * @param key - Key to look up
 * @returns Object containing the value and new cache state
 */
export function lruGet<K, V>(
	state: LRUCacheState<K, V>,
	key: K,
): {
	value: V | undefined
	newState: LRUCacheState<K, V>
} {
	const value = state.cache.get(key)

	if (value === undefined) {
		return { value: undefined, newState: state }
	}

	// Update access time
	const newAccessOrder = new Map(state.accessOrder)
	newAccessOrder.set(key, state.accessCounter + 1)

	return {
		value,
		newState: {
			...state,
			accessOrder: newAccessOrder,
			accessCounter: state.accessCounter + 1,
		},
	}
}

/**
 * Sets a value in the cache with automatic LRU eviction if at capacity.
 * If the key already exists, updates the value and access time.
 * If at capacity, evicts the least recently used entry first.
 * 
 * @param state - Current cache state
 * @param key - Key to set
 * @param value - Value to store
 * @returns New cache state with the value set
 */
export function lruSet<K, V>(state: LRUCacheState<K, V>, key: K, value: V): LRUCacheState<K, V> {
	const newCache = new Map(state.cache)
	const newAccessOrder = new Map(state.accessOrder)
	const newAccessCounter = state.accessCounter + 1

	// If key already exists, just update it
	if (state.cache.has(key)) {
		newCache.set(key, value)
		newAccessOrder.set(key, newAccessCounter)

		return {
			...state,
			cache: newCache,
			accessOrder: newAccessOrder,
			accessCounter: newAccessCounter,
		}
	}

	// If at capacity, evict least recently used
	if (state.cache.size >= state.maxSize) {
		const evictionResult = evictLRU(state)
		return lruSet(evictionResult, key, value)
	}

	// Add new entry
	newCache.set(key, value)
	newAccessOrder.set(key, newAccessCounter)

	return {
		...state,
		cache: newCache,
		accessOrder: newAccessOrder,
		accessCounter: newAccessCounter,
	}
}

/**
 * Clears all entries from the cache, resetting it to empty state.
 * 
 * @param state - Current cache state
 * @returns New empty cache state with the same configuration
 */
export function lruClear<K, V>(state: LRUCacheState<K, V>): LRUCacheState<K, V> {
	return {
		...state,
		cache: new Map<K, V>(),
		accessOrder: new Map<K, number>(),
		accessCounter: 0,
	}
}

/**
 * Checks if a key exists in the cache without updating access time.
 * 
 * @param state - Current cache state
 * @param key - Key to check
 * @returns True if the key exists in the cache
 */
export function lruHas<K, V>(state: LRUCacheState<K, V>, key: K): boolean {
	return state.cache.has(key)
}

/**
 * Gets current cache statistics for monitoring and debugging.
 * 
 * @param state - Current cache state
 * @returns Statistics object with size, utilization, and access information
 */
export function lruGetStats<K, V>(state: LRUCacheState<K, V>): LRUCacheStats {
	return {
		size: state.cache.size,
		maxSize: state.maxSize,
		accessCounter: state.accessCounter,
		utilization: Math.round((state.cache.size / state.maxSize) * 100),
	}
}

/**
 * Evicts the least recently used entry from the cache.
 * 
 * @param state - Current cache state
 * @returns New cache state with the oldest entry removed
 */
function evictLRU<K, V>(state: LRUCacheState<K, V>): LRUCacheState<K, V> {
	let oldestKey: K | undefined
	let oldestAccess = Infinity

	for (const [key, accessTime] of state.accessOrder.entries()) {
		if (accessTime < oldestAccess) {
			oldestAccess = accessTime
			oldestKey = key
		}
	}

	if (oldestKey === undefined) {
		return state
	}

	const newCache = new Map(state.cache)
	const newAccessOrder = new Map(state.accessOrder)

	newCache.delete(oldestKey)
	newAccessOrder.delete(oldestKey)

	return {
		...state,
		cache: newCache,
		accessOrder: newAccessOrder,
	}
}

/**
 * Gets all cache entries as an array, sorted by access time (most recent first).
 * Useful for cache migration and debugging purposes.
 * 
 * @param state - Current cache state
 * @returns Array of entries with key, value, and access time information
 */
export function lruGetEntries<K, V>(
	state: LRUCacheState<K, V>,
): Array<{
	key: K
	value: V
	access: number
}> {
	const entries: Array<{ key: K; value: V; access: number }> = []

	for (const [key, value] of state.cache.entries()) {
		const access = state.accessOrder.get(key) || 0
		entries.push({ key, value, access })
	}

	return entries.sort((a, b) => b.access - a.access) // Most recent first
}

/**
 * Creates a new cache with entries from another cache, useful for resizing operations.
 * Takes only the most recent entries up to the new size limit.
 * 
 * @param entries - Array of entries from the source cache
 * @param maxSize - Maximum size for the new cache
 * @returns New cache state containing the migrated entries
 */
export function lruMigrate<K, V>(
	entries: Array<{ key: K; value: V; access: number }>,
	maxSize: number,
): LRUCacheState<K, V> {
	let newState = createLRUCache<K, V>(maxSize)

	// Take only the most recent entries up to the new limit
	const entriesToMigrate = entries.slice(0, maxSize)

	for (const { key, value } of entriesToMigrate) {
		newState = lruSet(newState, key, value)
	}

	return newState
}
