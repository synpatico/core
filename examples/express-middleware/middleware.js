import { createStructureDefinition, encode } from "@synpatico/core"

/**
 * Synpatico Express Middleware
 *
 * This production-ready middleware automatically optimizes JSON responses:
 * - Intercepts /api/* routes
 * - Analyzes JSON structure and generates structure IDs
 * - Caches structures in memory with LRU eviction
 * - Optimizes responses when client sends X-Synpatico-Accept-ID header
 * - Falls back to standard JSON for first requests or tools (curl, postman)
 * - Adds helpful headers showing optimization stats
 */

export function synpaticoMiddleware(options = {}) {
	const {
		maxCacheSize = 1000,
		enableLogging = true,
		pathPattern = /^\/api\//,
		skipValidation = false, // Skip validation for maximum performance
	} = options

	// In-memory structure cache with LRU eviction
	const structureCache = new Map()
	const cacheAccess = new Map() // Track access time for LRU

	// Data cache to avoid re-parsing identical responses
	const dataCache = new Map() // Maps data hash -> {originalData, encodedPacket}

	// Simple hash function for data identity checking
	function hashData(data) {
		// Use JSON.stringify as a simple content hash
		// In production, consider using a faster hash function
		const str = JSON.stringify(data)
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		return hash.toString()
	}

	// Statistics tracking - overall and per endpoint
	const stats = {
		totalRequests: 0,
		optimizedRequests: 0,
		bytesSaved: 0,
		structuresLearned: 0,
		fastEncodingRequests: 0,
		dataCacheHits: 0,
		dataCacheSize: 0,
		endpoints: {}, // Track stats per endpoint
	}

	function getEndpointStats(path) {
		if (!stats.endpoints[path]) {
			stats.endpoints[path] = {
				totalRequests: 0,
				optimizedRequests: 0,
				bytesSaved: 0,
				structuresLearned: 0,
				averageSavings: 0,
				lastStructureId: null,
			}
		}
		return stats.endpoints[path]
	}

	function evictOldestEntry() {
		let oldestKey = null
		let oldestTime = Date.now()

		for (const [key, time] of cacheAccess.entries()) {
			if (time < oldestTime) {
				oldestTime = time
				oldestKey = key
			}
		}

		if (oldestKey) {
			structureCache.delete(oldestKey)
			cacheAccess.delete(oldestKey)
		}
	}

	function addToCache(structureId, definition, path) {
		if (structureCache.size >= maxCacheSize) {
			evictOldestEntry()
		}

		structureCache.set(structureId, definition)
		cacheAccess.set(structureId, Date.now())
		stats.structuresLearned++

		// Update endpoint stats
		const endpointStats = getEndpointStats(path)
		endpointStats.structuresLearned++
		endpointStats.lastStructureId = structureId
	}

	function getFromCache(structureId) {
		if (structureCache.has(structureId)) {
			cacheAccess.set(structureId, Date.now()) // Update access time
			return structureCache.get(structureId)
		}
		return null
	}

	return function synpaticoHandler(req, res, next) {
		// Add stats endpoint access to all requests
		req.synpaticoStats = () => ({
			...stats,
			cacheSize: structureCache.size,
			cacheSizeLimit: maxCacheSize,
			dataCacheSize: dataCache.size,
			totalBytesSaved: stats.bytesSaved,
			averageSavings:
				stats.optimizedRequests > 0 ? Math.round(stats.bytesSaved / stats.optimizedRequests) : 0,
			optimizationRate:
				stats.totalRequests > 0
					? Math.round((stats.optimizedRequests / stats.totalRequests) * 100)
					: 0,
			fastEncodingRate:
				stats.optimizedRequests > 0
					? Math.round((stats.fastEncodingRequests / stats.optimizedRequests) * 100)
					: 0,
			dataCacheHitRate:
				stats.optimizedRequests > 0
					? Math.round((stats.dataCacheHits / stats.optimizedRequests) * 100)
					: 0,
			skipValidationEnabled: skipValidation,
		})

		// Only handle API routes that match the pattern for optimization
		if (!pathPattern.test(req.path)) {
			return next()
		}

		stats.totalRequests++
		const endpointStats = getEndpointStats(req.path)
		endpointStats.totalRequests++

		const requestStartTime = Date.now()
		const acceptedStructureId = req.headers["x-synpatico-accept-id"]

		// Always add the Synpatico agent header to identify this as a Synpatico-enabled server
		res.setHeader("X-Synpatico-Agent", "synpatico-express-v1.0.0")

		// Override res.json to intercept JSON responses
		const originalJson = res.json.bind(res)

		res.json = (data) => {
			const responseTime = Date.now() - requestStartTime

			// Only optimize object responses (not arrays, primitives, etc.)
			if (typeof data !== "object" || data === null || Array.isArray(data)) {
				res.setHeader("X-Synpatico-Optimization", "skipped-invalid-type")
				return originalJson(data)
			}

			try {
				// Check data cache first to avoid redundant work
				const dataHash = hashData(data)
				let cachedDataResult = dataCache.get(dataHash)

				const originalJsonString = cachedDataResult?.originalJsonString || JSON.stringify(data)
				const originalSize = Buffer.byteLength(originalJsonString, "utf8")

				// Check if client is requesting an optimized response
				if (acceptedStructureId) {
					const cachedStructure = getFromCache(acceptedStructureId)

					if (cachedStructure) {
						let packet
						let encodingMethod

						// Check if we have a cached encoded packet for this exact data
						if (cachedDataResult?.encodedPackets?.has(acceptedStructureId)) {
							packet = cachedDataResult.encodedPackets.get(acceptedStructureId)
							encodingMethod = "cached"
							stats.dataCacheHits++
							if (enableLogging) {
								console.log(
									`🚀 Using cached encoded packet for ${req.path} (${dataHash.slice(0, 8)}...)`,
								)
							}
						} else if (skipValidation) {
							// Ultra-fast encoding - skip all validation
							packet = encode(data, acceptedStructureId)
							encodingMethod = "fast-no-validation"
							stats.fastEncodingRequests++
						} else {
							// Validate structure matches before optimizing
							const currentStructure = createStructureDefinition(data)

							if (currentStructure.id !== acceptedStructureId) {
								// Structure mismatch - fall back to learning mode
								if (enableLogging) {
									console.log(
										`⚠️  Structure mismatch for ${req.path}. Expected: ${acceptedStructureId}, Got: ${currentStructure.id}`,
									)
								}
								res.setHeader("X-Synpatico-Optimization", "structure-mismatch")

								// Fall through to learning mode below
							} else {
								// Structure matches - use adaptive encoding
								packet = encode(data, acceptedStructureId)
								encodingMethod = "adaptive"

								// Cache the encoded packet for future use
								if (!cachedDataResult) {
									cachedDataResult = {
										originalData: data,
										originalJsonString,
										encodedPackets: new Map(),
									}
									dataCache.set(dataHash, cachedDataResult)
								}
								cachedDataResult.encodedPackets.set(acceptedStructureId, packet)
							}
						}

						if (packet) {
							const optimizedPayload = JSON.stringify(packet.values)
							const optimizedSize = Buffer.byteLength(optimizedPayload, "utf8")

							const bytesSaved = originalSize - optimizedSize
							const percentageSaved = Math.round((bytesSaved / originalSize) * 100)

							// Update statistics
							stats.optimizedRequests++
							stats.bytesSaved += bytesSaved

							// Update endpoint statistics
							endpointStats.optimizedRequests++
							endpointStats.bytesSaved += bytesSaved
							endpointStats.averageSavings = Math.round(
								endpointStats.bytesSaved / endpointStats.optimizedRequests,
							)

							// Set optimization headers
							res.setHeader("Content-Type", "application/synpatico+json")
							res.setHeader("X-Synpatico-ID", acceptedStructureId)
							res.setHeader("X-Synpatico-Original-Size", originalSize)
							res.setHeader("X-Synpatico-Optimized-Size", optimizedSize)
							res.setHeader("X-Synpatico-Savings", `${percentageSaved}%`)
							res.setHeader("X-Synpatico-Response-Time", `${responseTime}ms`)
							res.setHeader("X-Synpatico-Method", encodingMethod)

							if (enableLogging) {
								const methodIcon = encodingMethod === "fast-no-validation" ? "⚡" : "🚀"
								console.log(
									`${methodIcon} ${req.method} ${req.path} - Optimized: ${originalSize}B → ${optimizedSize}B (${percentageSaved}% saved) [${encodingMethod}]`,
								)
							}

							return res.send(optimizedPayload)
						}
					} else {
						// Structure not found in cache
						if (enableLogging) {
							console.log(`❓ Cache miss for structure ID: ${acceptedStructureId}`)
						}
						res.setHeader("X-Synpatico-Optimization", "cache-miss")
					}
				}

				// Learning mode: Standard JSON response + cache the structure
				const structureDefinition = createStructureDefinition(data)
				addToCache(structureDefinition.id, structureDefinition, req.path)

				// Also cache the data for future use
				if (!cachedDataResult) {
					cachedDataResult = {
						originalData: data,
						originalJsonString,
						encodedPackets: new Map(),
					}
					dataCache.set(dataHash, cachedDataResult)
				}

				// Set learning mode headers
				res.setHeader("Content-Type", "application/json")
				res.setHeader("X-Synpatico-Structure-ID", structureDefinition.id)
				res.setHeader("X-Synpatico-Mode", "learning")
				res.setHeader("X-Synpatico-Response-Time", `${responseTime}ms`)

				if (enableLogging) {
					console.log(
						`📦 ${req.method} ${req.path} - Learning mode: ${originalSize}B (Structure ID: ${structureDefinition.id})`,
					)
				}

				return originalJson(data)
			} catch (error) {
				console.error("Synpatico middleware error:", error)
				res.setHeader("X-Synpatico-Error", "processing-failed")
				return originalJson(data)
			}
		}

		next()
	}
}

export default synpaticoMiddleware
