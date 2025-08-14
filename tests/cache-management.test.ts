import { describe, it, expect, beforeEach } from "vitest"
import { resetState } from "@synpatico/genome"
import {
	createStructureDefinition,
	encode,
	decode,
	resetProtocolState,
	configureProtocolCaching,
	getProtocolCacheStats,
	evictOldCacheEntries,
} from "../src"

describe("Cache Management System", () => {
	beforeEach(() => {
		resetState()
		resetProtocolState()
		// Reset to default configuration
		configureProtocolCaching({
			maxShapeCacheSize: 1000,
			maxKeyOrderCacheSize: 500,
			autoEvictionThreshold: 80,
		})
	})

	describe("LRU Cache Functionality", () => {
		it("should respect cache size limits", () => {
			// Configure small cache for testing
			configureProtocolCaching({
				maxShapeCacheSize: 3,
				maxKeyOrderCacheSize: 2,
			})

			// Create more structures than cache can hold
			const structures = [
				{ type: "user", id: 1, name: "Alice" },
				{ type: "user", id: 2, name: "Bob" },
				{ type: "user", id: 3, name: "Charlie" },
				{ type: "product", id: 1, title: "Widget" },
				{ type: "product", id: 2, title: "Gadget" },
			]

			structures.forEach((data) => {
				createStructureDefinition(data)
			})

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBeLessThanOrEqual(3)
			expect(stats.shapeCache.maxSize).toBe(3)
		})

		it("should evict least recently used entries", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 2,
			})

			// Create first structure
			const data1 = { a: 1, b: 2 }
			createStructureDefinition(data1)

			// Create second structure
			const data2 = { c: 3, d: 4 }
			createStructureDefinition(data2)

			// Access first structure again (making it recently used)
			createStructureDefinition(data1)

			// Create third structure (should evict data2, not data1)
			const data3 = { e: 5, f: 6 }
			createStructureDefinition(data3)

			// Verify data1 and data3 are still accessible (fast lookup from cache)
			const start1 = Date.now()
			createStructureDefinition(data1)
			const time1 = Date.now() - start1

			const start3 = Date.now()
			createStructureDefinition(data3)
			const time3 = Date.now() - start3

			// Both should be very fast (cached)
			expect(time1).toBeLessThan(5)
			expect(time3).toBeLessThan(5)

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(2)
		})
	})

	describe("Cache Configuration", () => {
		it("should allow runtime cache reconfiguration", () => {
			// Initial configuration
			configureProtocolCaching({
				maxShapeCacheSize: 10,
				autoEvictionThreshold: 80,
			})

			let stats = getProtocolCacheStats()
			expect(stats.config.maxShapeCacheSize).toBe(10)
			expect(stats.config.autoEvictionThreshold).toBe(80)

			// Reconfigure
			configureProtocolCaching({
				maxShapeCacheSize: 20,
				autoEvictionThreshold: 60,
			})

			stats = getProtocolCacheStats()
			expect(stats.config.maxShapeCacheSize).toBe(20)
			expect(stats.config.autoEvictionThreshold).toBe(60)
		})

		it("should preserve cache entries when increasing size limit", () => {
			configureProtocolCaching({ maxShapeCacheSize: 2 })

			// Fill cache
			createStructureDefinition({ a: 1 })
			createStructureDefinition({ b: 2 })

			let stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(2)

			// Increase limit
			configureProtocolCaching({ maxShapeCacheSize: 5 })

			// Entries should still be there
			stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(2)

			// Should be able to add more entries now
			createStructureDefinition({ c: 3 })
			createStructureDefinition({ d: 4 })

			stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(4)
		})
	})

	describe("Automatic Eviction", () => {
		it("should perform automatic eviction when threshold is reached", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 10,
				autoEvictionThreshold: 70, // Will trigger at 7 entries
			})

			// Fill cache to 8 entries (80% of 10)
			for (let i = 0; i < 8; i++) {
				createStructureDefinition({ [`key${i}`]: i })
			}

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(8)
			expect(stats.shapeCache.utilization).toBe(80)

			// Trigger eviction
			const result = evictOldCacheEntries()
			expect(result.evicted).toBeGreaterThan(0)

			const statsAfter = getProtocolCacheStats()
			expect(statsAfter.shapeCache.size).toBeLessThan(8)
		})
	})

	describe("Cache Statistics", () => {
		it("should provide accurate cache statistics", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 5,
				enableCacheStats: true,
			})

			// Initially empty
			let stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(0)
			expect(stats.shapeCache.utilization).toBe(0)

			// Add some entries
			createStructureDefinition({ a: 1 })
			createStructureDefinition({ b: 2 })

			stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(2)
			expect(stats.shapeCache.utilization).toBe(40) // 2/5 * 100
			expect(stats.shapeCache.maxSize).toBe(5)
		})

		it("should track access patterns", () => {
			const data = { test: "data" }

			// First access creates cache entry
			createStructureDefinition(data)
			const stats1 = getProtocolCacheStats()
			const initialAccess = stats1.shapeCache.accessCounter

			// Second access should increment counter
			createStructureDefinition(data)
			const stats2 = getProtocolCacheStats()

			expect(stats2.shapeCache.accessCounter).toBeGreaterThan(initialAccess)
		})
	})

	describe("Memory Safety", () => {
		it("should prevent unbounded cache growth", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 5,
			})

			// Try to create many different structures
			for (let i = 0; i < 20; i++) {
				createStructureDefinition({ [`unique_key_${i}`]: `value_${i}` })
			}

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBeLessThanOrEqual(5)
		})

		it("should maintain functionality even with very small cache", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 1,
			})

			const testData = [
				{ user: { id: 1, name: "Alice" } },
				{ product: { id: 1, title: "Widget" } },
				{ order: { id: 1, total: 99.99 } },
			]

			// All should encode/decode correctly despite tiny cache
			testData.forEach((data) => {
				const struct = createStructureDefinition(data)
				const packet = encode(data, struct.id)
				const result = decode(packet, struct)
				expect(result).toEqual(data)
			})

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBeLessThanOrEqual(1)
		})
	})

	describe("Production Scenarios", () => {
		it("should handle high-frequency access patterns", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 100,
				autoEvictionThreshold: 90,
			})

			const commonStructure = { id: 1, name: "common", type: "frequent" }

			// Simulate high-frequency access
			for (let i = 0; i < 1000; i++) {
				createStructureDefinition(commonStructure)
			}

			// Should still be cached and accessible
			const start = Date.now()
			createStructureDefinition(commonStructure)
			const time = Date.now() - start

			expect(time).toBeLessThan(1) // Should be very fast due to caching

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.accessCounter).toBeGreaterThan(1000)
		})

		it("should handle mixed data patterns effectively", () => {
			configureProtocolCaching({
				maxShapeCacheSize: 50,
				autoEvictionThreshold: 75,
			})

			// Simulate realistic API with different endpoints
			const userRequests = Array.from({ length: 20 }, (_, i) => ({
				id: i,
				name: `User${i}`,
				email: `user${i}@example.com`,
			}))

			const productRequests = Array.from({ length: 15 }, (_, i) => ({
				id: i,
				title: `Product${i}`,
				price: i * 10,
			}))

			const orderRequests = Array.from({ length: 10 }, (_, i) => ({
				id: i,
				userId: i % 5,
				productIds: [i, i + 1],
			}))

			// Process all requests
			;[...userRequests, ...productRequests, ...orderRequests].forEach((data) => {
				const struct = createStructureDefinition(data)
				const packet = encode(data, struct.id)
				const result = decode(packet, struct)
				expect(result).toEqual(data)
			})

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBeLessThanOrEqual(50)
			expect(stats.shapeCache.utilization).toBeLessThanOrEqual(100)
		})
	})
})
