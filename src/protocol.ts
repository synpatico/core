/**
 * @fileoverview Core protocol implementation for Synpatico adaptive encoding/decoding
 * @module @synpatico/core/protocol
 */

import { GLOBAL_KEY_MAP, getStructureInfo } from "@synpatico/genome"
import {
	configureProtocolCaching as configureCaching,
	evictOldCacheEntries as evictCache,
	getProtocolCacheStats as getCacheStats,
	resetProtocolState as resetState,
} from "./cache/cache-manager.js"
import {
	reconstructObject,
	reconstructObjectCompiled,
	reconstructObjectFast,
	reconstructObjectGenome,
	reconstructObjectOptimized,
} from "./decode/reconstruction.js"
import { TYPE_MARKER, type TypeMarker } from "./serialization-types.js"
import { createShape, createShapeOptimized } from "./shape/shape-operations.js"
import type { StructureDefinition, StructurePacket } from "./types.js"
import { extractValues, extractValuesDirectPaths } from "./values/value-extraction.js"

// Re-export cache management functions
export const configureProtocolCaching = configureCaching
export const getProtocolCacheStats = getCacheStats
export const evictOldCacheEntries = evictCache
export const resetProtocolState = resetState

/**
 * Processes JavaScript values for serialization, converting special types
 * (Date, Map, Set, Error) to serializable representations with type markers.
 *
 * @param obj - The value to process for serialization
 * @returns The processed value with special types converted
 * @private
 */
function processForSerialization(obj: unknown): unknown {
	if (obj === null || obj === undefined || typeof obj !== "object") {
		return obj
	}
	if (obj instanceof Date) {
		return { __type: TYPE_MARKER.Date, value: obj.toISOString() }
	}
	if (obj instanceof Map) {
		return { __type: TYPE_MARKER.Map, value: Array.from(obj.entries()) }
	}
	if (obj instanceof Set) {
		return { __type: TYPE_MARKER.Set, value: Array.from(obj) }
	}
	if (obj instanceof Error) {
		return {
			__type: TYPE_MARKER.Error,
			value: { message: obj.message, name: obj.name, stack: obj.stack },
		}
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => processForSerialization(item))
	}
	if (obj.constructor === Object) {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj)) {
			result[key] = processForSerialization(value)
		}
		return result
	}
	return obj
}

/**
 * Processes serialized values for deserialization, restoring special types
 * (Date, Map, Set, Error) from their serialized representations.
 *
 * @param obj - The value to process for deserialization
 * @returns The restored value with special types reconstructed
 * @private
 */
function processForDeserialization(obj: unknown): unknown {
	if (obj === null || obj === undefined || typeof obj !== "object") {
		return obj
	}
	const objRecord = obj as Record<string, unknown>
	if ("__type" in objRecord && typeof objRecord.__type === "string") {
		const typeMarker = objRecord.__type as TypeMarker
		switch (typeMarker) {
			case TYPE_MARKER.Date:
				if (typeof objRecord.value === "string") {
					return new Date(objRecord.value)
				}
				return null
			case TYPE_MARKER.Map:
				if (Array.isArray(objRecord.value)) {
					return new Map(objRecord.value as [unknown, unknown][])
				}
				return new Map()
			case TYPE_MARKER.Set:
				if (Array.isArray(objRecord.value)) {
					return new Set(objRecord.value as unknown[])
				}
				return new Set()
			case TYPE_MARKER.Error: {
				if (typeof objRecord.value === "object" && objRecord.value !== null) {
					const errorValue = objRecord.value as Record<string, unknown>
					const error = new Error(typeof errorValue.message === "string" ? errorValue.message : "")
					if (typeof errorValue.name === "string") {
						error.name = errorValue.name
					}
					if (typeof errorValue.stack === "string") {
						error.stack = errorValue.stack
					}
					return error
				}
				return new Error()
			}
			default:
				return objRecord.value
		}
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => processForDeserialization(item))
	}
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(objRecord)) {
		result[key] = processForDeserialization(value)
	}
	return result
}

/**
 * Creates a structure definition from sample data, capturing its shape and generating a unique ID.
 * This definition can be reused for encoding/decoding similar data structures.
 *
 * @param data - The sample object to analyze
 * @returns A structure definition containing shape and ID
 *
 * @example
 * ```javascript
 * const data = { users: [{ id: 1, name: "John" }] };
 * const structureDef = createStructureDefinition(data);
 * console.log(structureDef.id); // "L0:123-L1:456-L2:789"
 * ```
 */
export function createStructureDefinition(data: object): StructureDefinition {
	const info = getStructureInfo(data)
	const shape = createShape(data)
	return { shape, id: info.id }
}

/**
 * Creates an optimized structure definition with enhanced performance characteristics.
 * Uses optimized shape creation for better encoding/decoding speed.
 *
 * @param data - The sample object to analyze
 * @returns An optimized structure definition
 */
export function createStructureDefinitionOptimized(data: object): StructureDefinition {
	const info = getStructureInfo(data)
	const shape = createShapeOptimized(data)
	return { shape, id: info.id }
}

/**
 * Encodes an object into an optimized packet using a known structure ID.
 * Extracts only the values, relying on the structure definition for reconstruction.
 *
 * @param data - The object to encode
 * @param structureId - The structure ID from a previous createStructureDefinition call
 * @param paths - Optional pre-computed value extraction paths for optimization
 * @returns An optimized structure packet containing only values
 *
 * @example
 * ```javascript
 * const packet = encode(userData, structureDef.id);
 * console.log(packet.values); // [1, "John", "john@example.com", ...]
 * ```
 */
export function encode(data: object, structureId: string, paths?: string[][]): StructurePacket {
	if (paths) {
		return encodeWithDirectPaths(data, structureId, paths)
	}

	const rawValues = extractValues(data)
	const processedValues = processForSerialization(rawValues)

	return {
		type: "values-only",
		structureId: structureId,
		values: processedValues,
		metadata: {
			collisionCount: 0,
			levels: 1,
		},
	}
}

/**
 * Creates a structure definition with pre-computed value extraction paths.
 * Provides optimal performance by pre-calculating all value locations.
 *
 * @param data - The sample object to analyze
 * @returns Structure definition with paths for direct value extraction
 *
 * @example
 * ```javascript
 * const { shape, id, paths } = createStructureDefinitionWithPaths(data);
 * // Use paths for optimized encoding
 * const packet = encodeWithDirectPaths(data, id, paths);
 * ```
 */
export function createStructureDefinitionWithPaths(
	data: object,
): StructureDefinition & { paths: string[][] } {
	const info = getStructureInfo(data)
	const shape = createShape(data)

	const paths: string[][] = []

	const collectPaths = (current: unknown, path: string[] = []) => {
		if (typeof current !== "object" || current === null) {
			paths.push([...path])
			return
		}

		if (Array.isArray(current)) {
			for (let i = 0; i < current.length; i++) {
				collectPaths(current[i], [...path, i.toString()])
			}
			return
		}

		const keys = Object.keys(current).sort()
		for (const key of keys) {
			collectPaths((current as Record<string, unknown>)[key], [...path, key])
		}
	}

	collectPaths(data)

	return { shape, id: info.id, paths }
}

/**
 * Encodes data using pre-computed paths for maximum performance.
 * Bypasses recursive traversal by directly accessing value locations.
 *
 * @param data - The object to encode
 * @param structureId - The structure ID
 * @param paths - Pre-computed paths from createStructureDefinitionWithPaths
 * @returns An optimized structure packet
 */
export function encodeWithDirectPaths(
	data: object,
	structureId: string,
	paths: string[][],
): StructurePacket {
	return {
		type: "values-only",
		structureId: structureId,
		values: extractValuesDirectPaths(data, paths),
		metadata: {
			collisionCount: 0,
			levels: 1,
		},
	}
}

/**
 * Analyzes structure and data characteristics to choose optimal decode strategy.
 * Automatically selects between standard, ultra-fast, compiled, or genome decoders.
 *
 * @param shape - The structure shape to analyze
 * @param valuesLength - Number of values to decode
 * @returns The optimal decoder strategy name
 * @private
 */
function analyzeDecodeStrategy(
	shape: Record<string, unknown>,
	valuesLength: number,
): "standard" | "ultra-fast" | "compiled" | "genome" {
	let complexity = 0
	let depth = 0
	let arrayCount = 0
	let homogeneousArrays = 0
	let totalArrayItems = 0
	let objectCount = 0

	const analyze = (currentShape: Record<string, unknown>, currentDepth: number = 0) => {
		depth = Math.max(depth, currentDepth)
		const type = currentShape.type as string

		if (type === "object") {
			objectCount++
			const keys = Object.keys(currentShape).filter((k) => k !== "type" && k !== "_signature")
			complexity += keys.length

			for (const key of keys) {
				analyze(currentShape[key] as Record<string, unknown>, currentDepth + 1)
			}
		} else if (type === "array") {
			arrayCount++
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			complexity += itemShapes.length
			totalArrayItems += itemShapes.length

			for (const itemShape of itemShapes) {
				analyze(itemShape, currentDepth + 1)
			}
		} else if (type === "homogeneous-array") {
			arrayCount++
			homogeneousArrays++
			const length = currentShape.length as number
			totalArrayItems += length
			complexity += length * 0.1 // Homogeneous arrays are less complex per item

			analyze(currentShape.itemShape as Record<string, unknown>, currentDepth + 1)
		}
	}

	analyze(shape)

	// Check if we have genome bitmap data available for optimization
	const hasGenomeData = GLOBAL_KEY_MAP.size > 0

	// Advanced decision criteria based on benchmark performance patterns

	// Small, simple structures: standard recursive is fine
	if (complexity <= 5 && depth <= 2 && arrayCount === 0 && valuesLength <= 20) {
		return "standard"
	}

	// Use genome decoder when bitmap data is available and we have objects with properties
	if (hasGenomeData && objectCount > 0 && complexity > 3) {
		return "genome"
	}

	// Large homogeneous arrays: ultra-fast decoder excels here
	if (homogeneousArrays > 0 && totalArrayItems > 10) {
		return "ultra-fast"
	}

	// Complex nested structures: ultra-fast decoder wins
	if (depth > 2 || (arrayCount > 0 && objectCount > 3)) {
		return "ultra-fast"
	}

	// Medium complexity with multiple objects: ultra-fast for layout caching
	if (objectCount > 2 && complexity > 8) {
		return "ultra-fast"
	}

	// Very large datasets: consider compiled approach for repeated patterns
	if (valuesLength > 1000 && homogeneousArrays > 0) {
		return "compiled"
	}

	// Default to standard for simple cases
	return "standard"
}

/**
 * Decodes a structure packet back to its original object form.
 * Automatically selects the optimal decoding strategy based on data characteristics.
 *
 * @param packet - The encoded structure packet containing values
 * @param structureDef - The structure definition for reconstruction
 * @returns The fully reconstructed object with all types preserved
 *
 * @example
 * ```javascript
 * const packet = encode(data, structureDef.id);
 * const reconstructed = decode(packet, structureDef);
 * console.log(reconstructed); // Original object restored
 * ```
 */
export function decode(packet: StructurePacket, structureDef: StructureDefinition): unknown {
	// Adaptive strategy selection for optimal performance based on data characteristics
	const strategy = analyzeDecodeStrategy(structureDef.shape, (packet.values as unknown[]).length)

	let reconstructed: unknown

	switch (strategy) {
		case "standard":
			// Simple structures: use lightweight recursive approach
			reconstructed = reconstructObject(packet.values as unknown[], structureDef.shape)
			break

		case "genome":
			// Use genome bitmap for deterministic property ordering
			reconstructed = reconstructObjectGenome(packet.values as unknown[], structureDef.shape)
			break

		case "ultra-fast":
			// Complex/nested structures: use optimized single-pass decoder
			reconstructed = reconstructObjectFast(packet.values as unknown[], structureDef.shape)
			break

		case "compiled":
			// Very large datasets with patterns: use code generation
			reconstructed = reconstructObjectCompiled(packet.values as unknown[], structureDef.shape)
			break

		default:
			reconstructed = reconstructObject(packet.values as unknown[], structureDef.shape)
	}

	return processForDeserialization(reconstructed)
}

/**
 * Decodes using the optimized decoder with key caching.
 * Good for structures with many repeated property names.
 *
 * @param packet - The encoded structure packet
 * @param structureDef - The structure definition
 * @returns The reconstructed object
 */
export function decodeOptimized(
	packet: StructurePacket,
	structureDef: StructureDefinition,
): unknown {
	const reconstructed = reconstructObjectOptimized(packet.values as unknown[], structureDef.shape)
	return processForDeserialization(reconstructed)
}

/**
 * Decodes using the ultra-fast single-pass decoder.
 * Optimal for complex nested structures and homogeneous arrays.
 *
 * @param packet - The encoded structure packet
 * @param structureDef - The structure definition
 * @returns The reconstructed object
 */
export function decodeFast(packet: StructurePacket, structureDef: StructureDefinition): unknown {
	const reconstructed = reconstructObjectFast(packet.values as unknown[], structureDef.shape)
	return processForDeserialization(reconstructed)
}

/**
 * Decodes using dynamically compiled reconstruction functions.
 * Best for very large datasets with repeated patterns.
 *
 * @param packet - The encoded structure packet
 * @param structureDef - The structure definition
 * @returns The reconstructed object
 */
export function decodeCompiled(
	packet: StructurePacket,
	structureDef: StructureDefinition,
): unknown {
	const reconstructed = reconstructObjectCompiled(packet.values as unknown[], structureDef.shape)
	return processForDeserialization(reconstructed)
}

/**
 * Decodes using genome bitmap-optimized property ordering.
 * Leverages GLOBAL_KEY_MAP for deterministic reconstruction.
 *
 * @param packet - The encoded structure packet
 * @param structureDef - The structure definition
 * @returns The reconstructed object
 */
export function decodeGenome(packet: StructurePacket, structureDef: StructureDefinition): unknown {
	const reconstructed = reconstructObjectGenome(packet.values as unknown[], structureDef.shape)
	return processForDeserialization(reconstructed)
}
