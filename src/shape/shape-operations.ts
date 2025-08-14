/**
 * Shape Operations
 * Functions for creating and optimizing object shapes
 */

import { getShapeFromCache, setShapeInCache } from "../cache/cache-manager.js"

/**
 * Creates a unique signature for an object based on its keys and their types.
 * The signature is deterministic and can be used for caching similar object structures.
 *
 * @param obj - The object to create a signature for
 * @returns A string signature representing the object's structure
 */
function createShapeSignature(obj: Record<string, unknown>): string {
	const sortedKeys = Object.keys(obj).sort()
	const signature = sortedKeys
		.map((key) => {
			const value = obj[key]
			if (typeof value !== "object" || value === null) {
				return `${key}:${typeof value}`
			}
			if (value instanceof Date) return `${key}:Date`
			if (value instanceof Map) return `${key}:Map`
			if (value instanceof Set) return `${key}:Set`
			if (value instanceof Error) return `${key}:Error`
			if (Array.isArray(value)) return `${key}:array`
			return `${key}:object`
		})
		.join("|")
	return signature
}

/**
 * Creates a shape definition for any JavaScript value, with automatic caching for objects.
 * The shape captures the complete structure and type information needed for encoding/decoding.
 *
 * @param obj - The value to create a shape for (any JavaScript type)
 * @returns A shape object containing type and structural information
 */
export function createShape(obj: unknown): Record<string, unknown> {
	if (obj === null) {
		return { type: "null" }
	}
	if (typeof obj !== "object") {
		return { type: typeof obj }
	}
	// These types are handled by the rich serializer and represent a single value.
	if (obj instanceof Date || obj instanceof Map || obj instanceof Set || obj instanceof Error) {
		return { type: "special_value" }
	}
	if (Array.isArray(obj)) {
		return { type: "array", itemShapes: obj.map((item) => createShape(item)) }
	}

	// For objects, check if we have a cached shape
	const objRecord = obj as Record<string, unknown>
	const signature = createShapeSignature(objRecord)

	const cachedShape = getShapeFromCache(signature)
	if (cachedShape) {
		return cachedShape
	}

	// Build new shape and cache it with LRU eviction
	const shape: Record<string, unknown> = {
		type: "object",
		_signature: signature,
	}
	const sortedKeys = Object.keys(objRecord).sort()
	for (const key of sortedKeys) {
		shape[key] = createShape(objRecord[key])
	}

	setShapeInCache(signature, shape)
	return shape
}

/**
 * Creates an optimized shape definition that detects homogeneous arrays.
 * When all array items have identical structure, uses a more efficient representation.
 *
 * @param obj - The value to create an optimized shape for
 * @returns An optimized shape object, using homogeneous-array type when applicable
 */
export function createShapeOptimized(obj: unknown): Record<string, unknown> {
	if (obj === null) {
		return { type: "null" }
	}
	if (typeof obj !== "object") {
		return { type: typeof obj }
	}
	if (obj instanceof Date || obj instanceof Map || obj instanceof Set || obj instanceof Error) {
		return { type: "special_value" }
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			return { type: "array", itemShapes: [] }
		}

		// Optimize arrays by detecting homogeneous structures
		const firstItem = obj[0]
		if (typeof firstItem === "object" && firstItem !== null && !Array.isArray(firstItem)) {
			const firstShape = createShape(firstItem)
			const firstSignature =
				(firstItem as Record<string, unknown>) &&
				createShapeSignature(firstItem as Record<string, unknown>)

			// Check if all items have the same structure
			let isHomogeneous = true
			for (let i = 1; i < obj.length && isHomogeneous; i++) {
				const item = obj[i]
				if (typeof item !== "object" || item === null || Array.isArray(item)) {
					isHomogeneous = false
				} else {
					const itemSignature = createShapeSignature(item as Record<string, unknown>)
					if (itemSignature !== firstSignature) {
						isHomogeneous = false
					}
				}
			}

			if (isHomogeneous) {
				// All items have the same shape - use optimized representation
				return {
					type: "homogeneous-array",
					length: obj.length,
					itemShape: firstShape,
					_signature: `array[${obj.length}]:${firstSignature}`,
				}
			}
		}

		// Fall back to individual item shapes for heterogeneous arrays
		return { type: "array", itemShapes: obj.map((item) => createShape(item)) }
	}

	return createShape(obj)
}
