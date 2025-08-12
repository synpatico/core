/**
 * Value Extraction Operations
 * Functions for extracting and reconstructing values from data structures
 */

/**
 * Extracts all values from a data structure in deterministic order.
 * Traverses the structure recursively, preserving the order needed for reconstruction.
 * Handles primitives, objects, arrays, and special types (Date, Map, Set, Error).
 * 
 * @param data - The data structure to extract values from
 * @returns Array of values in the order they appear in the structure
 */
export function extractValues(data: unknown): unknown[] {
	const values: unknown[] = []
	const recurse = (current: unknown) => {
		if (typeof current !== "object" || current === null) {
			values.push(current)
			return
		}
		if (
			current instanceof Date ||
			current instanceof Map ||
			current instanceof Set ||
			current instanceof Error
		) {
			values.push(current)
			return
		}
		if (Array.isArray(current)) {
			current.forEach((item) => recurse(item))
			return
		}
		const sortedKeys = Object.keys(current).sort()
		for (const key of sortedKeys) {
			recurse((current as Record<string, unknown>)[key])
		}
	}
	recurse(data)
	return values
}

/**
 * Extracts values from data using pre-computed access paths for optimal performance.
 * Uses direct property access instead of recursive traversal when paths are known.
 * 
 * @param data - The source data structure
 * @param paths - Array of property path arrays (e.g., [['user', 'name'], ['user', 'age']])
 * @returns Array of values extracted using the specified paths
 */
export function extractValuesDirectPaths(data: unknown, paths: string[][]): unknown[] {
	const values: unknown[] = []

	for (const path of paths) {
		let current = data
		for (const segment of path) {
			// Type assertion is necessary here since we're accessing dynamic paths
			current = (current as Record<string, unknown>)[segment]
		}
		values.push(current)
	}

	return values
}
