/**
 * Value Reconstruction Operations
 * Functions for reconstructing objects from extracted values and shapes
 */

import { GLOBAL_KEY_MAP } from "@synpatico/genome"
import {
	getMapKeyOrderCache,
	getMapKeyOrderCacheSize,
	getMaxKeyOrderCacheSize,
	setMapKeyOrderCache,
} from "../cache/cache-manager.js"

/**
 * Reconstructs an object from its extracted values and shape definition.
 * This is the standard reconstruction algorithm that handles all data types.
 * 
 * @param values - Array of extracted values in deterministic order
 * @param shape - Shape definition describing the object structure
 * @returns The reconstructed object matching the original structure
 */
export function reconstructObject(values: unknown[], shape: Record<string, unknown>): unknown {
	let valueIndex = 0
	const recurse = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string
		if (type !== "object" && type !== "array" && type !== "homogeneous-array") {
			return values[valueIndex++]
		}
		if (type === "array") {
			const arr: unknown[] = []
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			for (let i = 0; i < itemShapes.length; i++) {
				arr.push(recurse(itemShapes[i]))
			}
			return arr
		}
		if (type === "homogeneous-array") {
			// Optimized reconstruction for homogeneous arrays
			const arr: unknown[] = []
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>

			for (let i = 0; i < length; i++) {
				arr.push(recurse(itemShape))
			}
			return arr
		}
		const obj: Record<string, unknown> = {}
		const sortedKeys = Object.keys(currentShape)
			.filter((k) => k !== "type" && k !== "_signature")
			.sort()
		for (let i = 0; i < sortedKeys.length; i++) {
			const key = sortedKeys[i]
			obj[key] = recurse(currentShape[key] as Record<string, unknown>)
		}
		return obj
	}
	return recurse(shape)
}

/**
 * Optimized object reconstruction that caches computed keys to avoid repeated calculations.
 * Provides better performance for complex nested structures with repeated shapes.
 * 
 * @param values - Array of extracted values in deterministic order
 * @param shape - Shape definition describing the object structure
 * @returns The reconstructed object with improved performance characteristics
 */
export function reconstructObjectOptimized(
	values: unknown[],
	shape: Record<string, unknown>,
): unknown {
	let valueIndex = 0

	// Cache for computed keys to avoid repeated calculations
	const keyCache = new Map<Record<string, unknown>, string[]>()

	const getKeys = (currentShape: Record<string, unknown>): string[] => {
		let keys = keyCache.get(currentShape)
		if (!keys) {
			keys = Object.keys(currentShape)
				.filter((k) => k !== "type" && k !== "_signature")
				.sort()
			keyCache.set(currentShape, keys)
		}
		return keys
	}

	const recurse = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string
		if (type !== "object" && type !== "array") {
			return values[valueIndex++]
		}
		if (type === "array") {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr = new Array(itemShapes.length) // Pre-allocate array size
			for (let i = 0; i < itemShapes.length; i++) {
				arr[i] = recurse(itemShapes[i])
			}
			return arr
		}

		// Use cached keys
		const sortedKeys = getKeys(currentShape)
		const obj: Record<string, unknown> = {}

		for (let i = 0; i < sortedKeys.length; i++) {
			const key = sortedKeys[i]
			obj[key] = recurse(currentShape[key] as Record<string, unknown>)
		}
		return obj
	}

	return recurse(shape)
}

/**
 * Ultra-fast object reconstruction using pre-compiled layouts and optimized array handling.
 * Eliminates repeated Object.keys operations and provides specialized paths for homogeneous arrays.
 * 
 * @param values - Array of extracted values in deterministic order
 * @param shape - Shape definition describing the object structure
 * @returns The reconstructed object with maximum performance optimization
 */
export function reconstructObjectFast(values: unknown[], shape: Record<string, unknown>): unknown {
	let valueIndex = 0

	// Pre-compile object property layouts to eliminate repeated Object.keys operations
	const layoutCache = new Map<Record<string, unknown>, string[]>()

	const getLayout = (shapeObj: Record<string, unknown>): string[] => {
		let layout = layoutCache.get(shapeObj)
		if (!layout) {
			layout = Object.keys(shapeObj)
				.filter(
					(k) =>
						k !== "type" &&
						k !== "_signature" &&
						k !== "length" &&
						k !== "itemShape" &&
						k !== "itemShapes",
				)
				.sort()
			layoutCache.set(shapeObj, layout)
		}
		return layout
	}

	// Optimized recursive function with minimal overhead
	const rebuild = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string

		// Primitive values - direct array access
		if (type !== "object" && type !== "array" && type !== "homogeneous-array") {
			return values[valueIndex++]
		}

		// Homogeneous arrays - optimized path
		if (type === "homogeneous-array") {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>
			const arr = new Array(length)

			// Inline object creation for maximum speed
			if (itemShape.type === "object") {
				const layout = getLayout(itemShape)
				const layoutLength = layout.length

				for (let i = 0; i < length; i++) {
					const obj: Record<string, unknown> = {}

					// Unrolled property assignment
					for (let j = 0; j < layoutLength; j++) {
						const key = layout[j]
						obj[key] = rebuild(itemShape[key] as Record<string, unknown>)
					}

					arr[i] = obj
				}
			} else {
				// Non-object items in homogeneous array
				for (let i = 0; i < length; i++) {
					arr[i] = rebuild(itemShape)
				}
			}

			return arr
		}

		// Regular arrays
		if (type === "array") {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr = new Array(itemShapes.length)

			for (let i = 0; i < itemShapes.length; i++) {
				arr[i] = rebuild(itemShapes[i])
			}

			return arr
		}

		// Objects - optimized property assignment
		const layout = getLayout(currentShape)
		const obj: Record<string, unknown> = {}

		// Direct property assignment without loop overhead
		const layoutLength = layout.length
		for (let i = 0; i < layoutLength; i++) {
			const key = layout[i]
			obj[key] = rebuild(currentShape[key] as Record<string, unknown>)
		}

		return obj
	}

	return rebuild(shape)
}

/**
 * Gets or creates the genome key order cache for deterministic property ordering.
 * Uses the global key map from genome package to ensure consistent ordering across all operations.
 * 
 * @returns A Map containing key names to their deterministic order indices
 */
function getMapKeyOrder(): Map<string, number> {
	const currentCache = getMapKeyOrderCache()
	const currentSize = getMapKeyOrderCacheSize()
	const maxSize = getMaxKeyOrderCacheSize()

	// Only rebuild cache if GLOBAL_KEY_MAP has changed or if we need to respect size limits
	const shouldRebuild =
		!currentCache || GLOBAL_KEY_MAP.size !== currentSize || GLOBAL_KEY_MAP.size > maxSize

	if (shouldRebuild) {
		const newCache = new Map<string, number>()
		let index = 0

		// Respect cache size limits - only cache the most frequently used keys
		const keys = Array.from(GLOBAL_KEY_MAP.keys())
		const keysToCache = Math.min(keys.length, maxSize)

		for (let i = 0; i < keysToCache; i++) {
			newCache.set(keys[i], index++)
		}

		setMapKeyOrderCache(newCache, keysToCache)
		return newCache
	}

	// currentCache is guaranteed to be non-null at this point
	return currentCache
}

/**
 * Genome-optimized object reconstruction using deterministic property ordering from GLOBAL_KEY_MAP.
 * Provides consistent ordering across all operations by leveraging the global key registry.
 * 
 * @param values - Array of extracted values in deterministic order
 * @param shape - Shape definition describing the object structure
 * @returns The reconstructed object with genome-consistent property ordering
 */
export function reconstructObjectGenome(
	values: unknown[],
	shape: Record<string, unknown>,
): unknown {
	let valueIndex = 0

	// Cache for genome-optimized property layouts
	const genomeLayoutCache = new Map<Record<string, unknown>, string[]>()

	const getGenomeLayout = (shapeObj: Record<string, unknown>): string[] => {
		let layout = genomeLayoutCache.get(shapeObj)
		if (!layout) {
			// Get all property names for this shape
			const keys = Object.keys(shapeObj).filter(
				(k) =>
					k !== "type" &&
					k !== "_signature" &&
					k !== "length" &&
					k !== "itemShape" &&
					k !== "itemShapes",
			)

			// Use cached Map insertion order for deterministic sorting (O(1) lookup vs O(n) indexOf)
			const keyOrder = getMapKeyOrder()
			layout = keys.sort((a, b) => {
				const indexA = keyOrder.get(a) ?? Number.MAX_SAFE_INTEGER
				const indexB = keyOrder.get(b) ?? Number.MAX_SAFE_INTEGER
				return indexA - indexB
			})

			genomeLayoutCache.set(shapeObj, layout)
		}
		return layout
	}

	const rebuild = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string

		// Primitive values
		if (type !== "object" && type !== "array" && type !== "homogeneous-array") {
			return values[valueIndex++]
		}

		// Homogeneous arrays - optimized for genome ordering
		if (type === "homogeneous-array") {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>
			const arr = new Array(length)

			if (itemShape.type === "object") {
				const layout = getGenomeLayout(itemShape)
				const layoutLength = layout.length

				for (let i = 0; i < length; i++) {
					const obj: Record<string, unknown> = {}

					// Use genome-ordered property assignment
					for (let j = 0; j < layoutLength; j++) {
						const key = layout[j]
						obj[key] = rebuild(itemShape[key] as Record<string, unknown>)
					}

					arr[i] = obj
				}
			} else {
				for (let i = 0; i < length; i++) {
					arr[i] = rebuild(itemShape)
				}
			}

			return arr
		}

		// Regular arrays
		if (type === "array") {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr = new Array(itemShapes.length)

			for (let i = 0; i < itemShapes.length; i++) {
				arr[i] = rebuild(itemShapes[i])
			}

			return arr
		}

		// Objects - use genome-optimized property ordering
		const layout = getGenomeLayout(currentShape)
		const obj: Record<string, unknown> = {}

		const layoutLength = layout.length
		for (let i = 0; i < layoutLength; i++) {
			const key = layout[i]
			obj[key] = rebuild(currentShape[key] as Record<string, unknown>)
		}

		return obj
	}

	return rebuild(shape)
}

/**
 * Experimental compiled object reconstruction that generates optimized code for specific shapes.
 * Creates custom functions tailored to the exact structure being decoded for maximum performance.
 * Falls back to fast reconstruction if compilation fails.
 * 
 * @param values - Array of extracted values in deterministic order
 * @param shape - Shape definition describing the object structure
 * @returns The reconstructed object using compiled or fast reconstruction
 */
export function reconstructObjectCompiled(
	values: unknown[],
	shape: Record<string, unknown>,
): unknown {
	// Generate optimized code for this specific shape
	const generateRebuilder = (
		currentShape: Record<string, unknown>,
		path: string = "result",
	): string => {
		const type = currentShape.type as string

		if (type !== "object" && type !== "array" && type !== "homogeneous-array") {
			return `${path} = values[valueIndex++];`
		}

		if (type === "homogeneous-array") {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>

			let code = `${path} = new Array(${length});`

			if (itemShape.type === "object") {
				const layout = Object.keys(itemShape)
					.filter((k) => k !== "type" && k !== "_signature")
					.sort()

				code += `for (let i = 0; i < ${length}; i++) {`
				code += `${path}[i] = {};`

				for (const key of layout) {
					code += generateRebuilder(
						itemShape[key] as Record<string, unknown>,
						`${path}[i]["${key}"]`,
					)
				}

				code += `}`
			} else {
				code += `for (let i = 0; i < ${length}; i++) {`
				code += generateRebuilder(itemShape, `${path}[i]`)
				code += `}`
			}

			return code
		}

		if (type === "array") {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			let code = `${path} = new Array(${itemShapes.length});`

			for (let i = 0; i < itemShapes.length; i++) {
				code += generateRebuilder(itemShapes[i], `${path}[${i}]`)
			}

			return code
		}

		// Object type
		const layout = Object.keys(currentShape)
			.filter((k) => k !== "type" && k !== "_signature")
			.sort()
		let code = `${path} = {};`

		for (const key of layout) {
			code += generateRebuilder(currentShape[key] as Record<string, unknown>, `${path}["${key}"]`)
		}

		return code
	}

	try {
		const functionBody = `
      let valueIndex = 0;
      let result;
      ${generateRebuilder(shape)}
      return result;
    `

		const compiledFn = new Function("values", functionBody) as (values: unknown[]) => unknown
		return compiledFn(values)
	} catch (_) {
		// Fallback to fast reconstruction
		console.warn("Compiled reconstruction failed, falling back to fast reconstruction")
		return reconstructObjectFast(values, shape)
	}
}
