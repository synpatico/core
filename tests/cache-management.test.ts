import { describe, it, expect, beforeEach } from 'vitest'
import { resetState } from '@synpatico/genome'
import {
	createStructureDefinition,
	encode,
	decode,
	resetProtocolState,
	configureProtocolCaching,
	getProtocolCacheStats,
} from '../src'

describe('Cache Management System', () => {
	beforeEach(() => {
		resetState()
		resetProtocolState()
		configureProtocolCaching({
			maxShapeCacheSize: 1000,
			maxKeyOrderCacheSize: 500,
		})
	})

	describe('LRU Cache Functionality', () => {
		it('should respect cache size limits', () => {
			configureProtocolCaching({
				maxShapeCacheSize: 3,
				maxKeyOrderCacheSize: 2,
			})

			const structures = [
				{ type: 'user', id: 1, name: 'Alice' },
				{ type: 'user', id: 2, name: 'Bob' },
				{ type: 'user', id: 3, name: 'Charlie' },
				{ type: 'product', id: 1, title: 'Widget' },
				{ type: 'product', id: 2, title: 'Gadget' },
			]

			structures.forEach((data) => {
				createStructureDefinition(data)
			})

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBeLessThanOrEqual(3)
			expect(stats.shapeCache.maxSize).toBe(3)
		})

		it('should evict least recently used entries', () => {
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
			const start1 = performance.now()
			createStructureDefinition(data1)
			const time1 = performance.now() - start1

			const start3 = performance.now()
			createStructureDefinition(data3)
			const time3 = performance.now() - start3

			// Both should be very fast (cached)
			expect(time1).toBeLessThan(5)
			expect(time3).toBeLessThan(5)

			const stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(2)
		})
	})

	describe('Cache Configuration', () => {
		it('should allow runtime cache reconfiguration', () => {
			configureProtocolCaching({
				maxShapeCacheSize: 10,
			})

			let stats = getProtocolCacheStats()
			expect(stats.config.maxShapeCacheSize).toBe(10)

			configureProtocolCaching({
				maxShapeCacheSize: 20,
			})

			stats = getProtocolCacheStats()
			expect(stats.config.maxShapeCacheSize).toBe(20)
		})

		it('should be able to add entries after increasing size limit', () => {
			configureProtocolCaching({ maxShapeCacheSize: 2 })

			createStructureDefinition({ a: 1 })
			createStructureDefinition({ b: 2 })

			let stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBe(2)

			// Increase limit (note: this resets the cache in current implementation)
			configureProtocolCaching({ maxShapeCacheSize: 5 })

			// Add new entries
			createStructureDefinition({ c: 3 })
			createStructureDefinition({ d: 4 })
			createStructureDefinition({ e: 5 })
			createStructureDefinition({ f: 6 })

			stats = getProtocolCacheStats()
			expect(stats.shapeCache.size).toBeLessThanOrEqual(5)
		})
	})

	describe('Cache Statistics', () => {
		it('should provide accurate cache statistics', () => {
			configureProtocolCaching({
				maxShapeCacheSize: 5,
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
	})

	describe('Memory Safety', () => {
		it('should prevent unbounded cache growth', () => {
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

		it('should maintain functionality even with very small cache', () => {
			configureProtocolCaching({
				maxShapeCacheSize: 1,
			})

			const testData = [
				{ user: { id: 1, name: 'Alice' } },
				{ product: { id: 1, title: 'Widget' } },
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

	describe('Production Scenarios', () => {
		it('should handle high-frequency access patterns', () => {
			configureProtocolCaching({
				maxShapeCacheSize: 100,
			})

			const commonStructure = { id: 1, name: 'common', type: 'frequent' }

			// Simulate high-frequency access
			for (let i = 0; i < 1000; i++) {
				createStructureDefinition(commonStructure)
			}

			// Should still be cached and accessible
			const start = performance.now()
			createStructureDefinition(commonStructure)
			const time = performance.now() - start

			expect(time).toBeLessThan(1) // Should be very fast due to caching
		})

		it('should handle mixed data patterns effectively', () => {
			configureProtocolCaching({
				maxShapeCacheSize: 50,
			})

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
