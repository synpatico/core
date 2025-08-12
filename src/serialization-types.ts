/**
 * @fileoverview Type markers and interfaces for serializing special JavaScript types
 * @module @synpatico/core/serialization-types
 */

/**
 * Type markers used to identify special JavaScript types during serialization.
 * These markers allow proper reconstruction of non-JSON types.
 */
export const TYPE_MARKER = {
	/** JavaScript Date object marker */
	Date: "Date",
	/** JavaScript Map object marker */
	Map: "Map",
	/** JavaScript Set object marker */
	Set: "Set",
	/** JavaScript Symbol marker */
	Symbol: "Symbol",
	/** Function marker (for future use) */
	Function: "Function",
	/** Error object marker */
	Error: "Error",
	/** DOM element marker (for future use) */
	DOMElement: "DOMElement",
	/** Class instance marker (for future use) */
	Class: "Class",	
} as const

/**
 * Union type of all available type markers
 */
export type TypeMarker = (typeof TYPE_MARKER)[keyof typeof TYPE_MARKER]

/**
 * Serialized representation of special JavaScript types.
 * Used to preserve type information during JSON serialization.
 */
export interface SerializedSpecialType {
	/** Type marker identifying the original type */
	__type: TypeMarker
	/** Serialized value of the special type */
	value: unknown
	/** Optional class name for class instances */
	className?: string
}
