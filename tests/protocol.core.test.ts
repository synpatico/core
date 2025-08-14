import { describe, it, expect, beforeEach } from "vitest"
import { resetState } from "@synpatico/genome"
import {
	createStructureDefinition,
	createStructureDefinitionOptimized,
	encode,
	decode,
	decodeOptimized,
	decodeFast,
	decodeCompiled,
	decodeGenome,
	resetProtocolState,
} from "../src"

// Helper function for deep equal comparison that ignores property order
function deepEqualIgnoreOrder(a: any, b: any): boolean {
	if (a === b) return true

	if (a == null || b == null) return a === b

	if (typeof a !== typeof b) return false

	if (Array.isArray(a) !== Array.isArray(b)) return false

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false
		for (let i = 0; i < a.length; i++) {
			if (!deepEqualIgnoreOrder(a[i], b[i])) return false
		}
		return true
	}

	if (typeof a === "object") {
		const keysA = Object.keys(a).sort()
		const keysB = Object.keys(b).sort()

		if (keysA.length !== keysB.length) return false

		for (let i = 0; i < keysA.length; i++) {
			if (keysA[i] !== keysB[i]) return false
			if (!deepEqualIgnoreOrder(a[keysA[i]], b[keysA[i]])) return false
		}
		return true
	}

	return false
}

// Custom expect matcher
function expectDeepEqual(actual: any, expected: any) {
	if (deepEqualIgnoreOrder(actual, expected)) {
		return
	}
	// Fall back to regular expect for better error messages
	expect(actual).toEqual(expected)
}

describe("Protocol Core Tests", () => {
	beforeEach(() => {
		resetState()
		resetProtocolState()
	})

	describe("Primitive Data Types", () => {
		it("should handle all primitive types correctly", () => {
			const testCases = [
				{ primitive: 42 },
				{ primitive: "hello world" },
				{ primitive: true },
				{ primitive: false },
				{ primitive: null },
				{ primitive: undefined },
				{ primitive: BigInt("123456789") },
			]

			testCases.forEach((data) => {
				const struct = createStructureDefinition(data)
				const packet = encode(data, struct.id)
				const result = decode(packet, struct)
				expect(result).toEqual(data)
			})
		})

		it("should handle special object types", () => {
			const now = new Date("2024-01-01T00:00:00.000Z")
			const map = new Map<string, unknown>([
				["key1", "value1"],
				["key2", 42],
			])
			const set = new Set(["item1", "item2", 42])
			const error = new Error("Test error message")

			const data = { date: now, map: map, set: set, error: error }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct) as any

			expect(result.date).toBeInstanceOf(Date)
			expect(result.date.getTime()).toBe(now.getTime())
			expect(result.map).toBeInstanceOf(Map)
			expect([...result.map.entries()]).toEqual([...map.entries()])
			expect(result.set).toBeInstanceOf(Set)
			expect([...result.set]).toEqual([...set])
			expect(result.error).toBeInstanceOf(Error)
			expect(result.error.message).toBe("Test error message")
		})
	})

	describe("Object Structures", () => {
		it("should handle flat objects", () => {
			const data = { id: 1, name: "John Doe", active: true, score: 95.5 }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})

		it("should handle nested objects", () => {
			const data = {
				user: { id: 1, name: "John" },
				settings: {
					theme: "dark",
					notifications: { email: true, push: false },
				},
			}
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})

		it("should handle empty objects and arrays", () => {
			const data = { empty: {}, emptyArray: [], nested: { empty: {} } }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})
	})

	describe("Array Handling", () => {
		it("should handle primitive arrays", () => {
			const data = {
				numbers: [1, 2, 3, 4, 5],
				strings: ["a", "b", "c"],
				booleans: [true, false, true],
				mixed: [1, "string", true, null],
			}
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})

		it("should handle object arrays", () => {
			const data = {
				users: [
					{ id: 1, name: "John", active: true },
					{ id: 2, name: "Jane", active: false },
					{ id: 3, name: "Bob", active: true },
				],
			}
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})

		it("should handle nested arrays", () => {
			const data = {
				matrix: [
					[1, 2],
					[3, 4],
					[5, 6],
				],
				nested: [{ items: [1, 2, 3] }, { items: [4, 5, 6] }],
			}
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})
	})

	describe("Encoding Variants", () => {
		const testData = {
			simple: { id: 1, name: "test", active: true },
			array: { items: [1, 2, 3, 4, 5] },
			mixed: {
				strings: ["a", "b", "c"],
				numbers: [1, 2, 3],
				objects: [{ x: 1 }, { x: 2 }],
			},
		}

		const encodeVariants = [
			{
				name: "encode (adaptive)",
				fn: (data: any, id: string) => encode(data, id),
			},
		]

		Object.entries(testData).forEach(([dataName, data]) => {
			encodeVariants.forEach(({ name, fn }) => {
				it(`should ${name} correctly handle ${dataName} data`, () => {
					const struct = createStructureDefinition(data)
					const packet = fn(data, struct.id)
					const result = decode(packet, struct)
					expectDeepEqual(result, data)
				})
			})
		})
	})

	describe("Decoding Variants", () => {
		const testData = {
			simple: { id: 1, name: "test" },
			complex: {
				user: { id: 1, name: "John", profile: { email: "john@example.com" } },
				items: [
					{ id: 1, value: "a" },
					{ id: 2, value: "b" },
				],
			},
		}

		const decodeVariants = [
			{ name: "decode (adaptive)", fn: decode },
			{ name: "decodeOptimized", fn: decodeOptimized },
			{ name: "decodeFast", fn: decodeFast },
			{ name: "decodeCompiled", fn: decodeCompiled },
			{ name: "decodeGenome", fn: decodeGenome },
		]

		Object.entries(testData).forEach(([dataName, data]) => {
			decodeVariants.forEach(({ name, fn }) => {
				it(`should ${name} correctly handle ${dataName} data`, () => {
					const struct = createStructureDefinition(data)
					const packet = encode(data, struct.id)
					const result = fn(packet, struct)
					expect(result).toEqual(data)
				})
			})
		})
	})

	describe("Structure Optimization", () => {
		it("should handle homogeneous arrays with optimized structures", () => {
			const data = {
				users: Array.from({ length: 20 }, (_, i) => ({
					id: i,
					name: `User${i}`,
					email: `user${i}@example.com`,
				})),
			}

			const standardStruct = createStructureDefinition(data)
			const optimizedStruct = createStructureDefinitionOptimized(data)

			const standardPacket = encode(data, standardStruct.id)
			const optimizedPacket = encode(data, optimizedStruct.id)

			const standardResult = decode(standardPacket, standardStruct)
			const optimizedResult = decode(optimizedPacket, optimizedStruct)

			expectDeepEqual(standardResult, data)
			expectDeepEqual(optimizedResult, data)
		})
	})

	describe("Data Integrity", () => {
		it("should maintain type consistency", () => {
			const data = {
				stringNum: "123",
				actualNum: 123,
				stringBool: "true",
				actualBool: true,
				nullValue: null,
				undefinedValue: undefined,
				zeroValue: 0,
				emptyString: "",
				falseValue: false,
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct) as any

			expect(result).toEqual(data)
			expect(typeof result.stringNum).toBe("string")
			expect(typeof result.actualNum).toBe("number")
			expect(typeof result.stringBool).toBe("string")
			expect(typeof result.actualBool).toBe("boolean")
			expect(result.nullValue).toBe(null)
			expect(result.undefinedValue).toBe(undefined)
		})

		it("should handle property order consistently", () => {
			const data1 = { a: 1, b: 2, c: 3, d: 4 }
			const data2 = { d: 4, c: 3, b: 2, a: 1 }

			const struct1 = createStructureDefinition(data1)
			const struct2 = createStructureDefinition(data2)

			const packet1 = encode(data1, struct1.id)
			const packet2 = encode(data2, struct2.id)

			const result1 = decode(packet1, struct1)
			const result2 = decode(packet2, struct2)

			expect(result1).toEqual(data1)
			expect(result2).toEqual(data2)
			// Both should have the same structure since they have the same properties
			expect(struct1.id).toBe(struct2.id)
		})

		it("should maintain precision for Date objects", () => {
			const now = new Date()
			const data = {
				timestamp: now,
				iso: now.toISOString(),
				epoch: now.getTime(),
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct) as any

			expect(result.timestamp).toBeInstanceOf(Date)
			expect(result.timestamp.getTime()).toBe(now.getTime())
			expect(result.iso).toBe(now.toISOString())
			expect(result.epoch).toBe(now.getTime())
		})
	})

	describe("Edge Cases", () => {
		it("should handle arrays with null and undefined elements", () => {
			const data = {
				mixedArray: [1, null, "string", undefined, { obj: "value" }],
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle objects with null/undefined properties", () => {
			const data = {
				nullProp: null,
				undefinedProp: undefined,
				validProp: "value",
				nested: { inner: null, valid: "test" },
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle unicode and special characters", () => {
			const data = {
				unicode: "🚀 Unicode test 中文 العربية",
				special: "Special chars: @#$%^&*()_+-=[]{}|;:,.<>?",
				emoji: "😀😁😂🤣😃😄",
				newlines: "Line 1\nLine 2\r\nLine 3",
				quotes: "He said \"Hello\" and 'Goodbye'",
				json: '{"key": "value"}',
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})
	})
})
