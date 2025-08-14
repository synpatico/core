/**
 * @fileoverview Type definitions for the Synpatico core protocol
 * @module @synpatico/core/types
 */

/**
 * Information about a structure including its ID and metadata
 */
export interface StructureInfo {
	/** Unique structure identifier in hierarchical format */
	id: string
	/** Number of depth levels in the structure */
	levels: number
	/** Number of hash collisions for this structure */
	collisionCount: number
}

/**
 * Records property access patterns for optimization analysis
 */
export interface AccessPattern {
	/** Properties that were accessed/read */
	accessed: string[]
	/** Properties that were modified with before/after values */
	mutated: Array<[string, { oldValue: unknown; newValue: unknown }]>
	/** Timestamp when this pattern was recorded */
	timestamp: number
}

/**
 * Encoded packet containing optimized data representation
 */
export interface StructurePacket {
	/** Packet encoding type */
	type: "values-only" | "differential" | "raw"
	/** Reference to the structure definition ID */
	structureId: string
	/** Encoded values (array for values-only, diff object for differential) */
	values: unknown
	/** Optional paths for direct value extraction */
	paths?: string[]
	/** Optional metadata about the encoding */
	metadata?: {
		/** Structure collision count */
		collisionCount: number
		/** Structure depth levels */
		levels: number
		/** Optional timestamp */
		timestamp?: number
	}
}

/**
 * Complete structure definition for encoding/decoding
 */
export interface StructureDefinition {
	/** Hierarchical shape representation of the structure */
	shape: Record<string, unknown>
	/** Unique structure identifier */
	id: string
}

/**
 * Context information for encoding operations
 */
export interface EncodeContext {
	/** Known structure ID for this encoding */
	knownStructureId: string
	/** Optional request ID for tracking */
	requestId?: string
}

/**
 * Client-side registry for managing structures and patterns
 */
export interface ClientRegistry {
	/** Map of structure IDs to their definitions */
	structures: Map<string, StructureDefinition>
	/** Map of structure IDs to access patterns */
	patterns: Map<string, AccessPattern[]>
	/** Map of request IDs to structure IDs */
	requestToStructureId: Map<string, string>
}

/**
 * Configuration options for Waku framework integration
 */
export interface WakuIntegrationConfig {
	/** Whether Waku integration is enabled */
	enabled?: boolean
	/** Whether to fallback to standard JSON on errors */
	fallbackOnError?: boolean
	/** Maximum number of structures to cache */
	maxStructureCacheSize?: number
	/** Whether to learn and optimize based on access patterns */
	enablePatternLearning?: boolean
}

declare const __brand: unique symbol
type Brand<T, TBrand> = T & { [__brand]: TBrand }

export type URLString = Brand<string, "URL">

// Type guard to check if a string is a valid URL
export const isValidURL = (input: string): input is URLString => {
	try {
		new URL(input)
		return true
	} catch {
		return false
	}
}
