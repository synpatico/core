import { describe, it, expect, beforeEach } from "vitest"
import { resetState } from "@synpatico/genome"
import { createStructureDefinition, encode, decode } from "../src"

describe("Protocol Core Functionality Tests", () => {
	beforeEach(() => {
		resetState()
	})

	describe("Basic Primitive Types", () => {
		it("should handle numbers correctly", () => {
			const data = { value: 42 }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle strings correctly", () => {
			const data = { value: "hello world" }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle booleans correctly", () => {
			const data = { value: true }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle null correctly", () => {
			const data = { value: null }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle undefined correctly", () => {
			const data = { value: undefined }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})
	})

	describe("Simple Objects", () => {
		it("should handle flat objects correctly", () => {
			const data = {
				id: 1,
				name: "John Doe",
				active: true,
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle nested objects correctly", () => {
			const data = {
				user: {
					id: 1,
					name: "John",
				},
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})
	})

	describe("Simple Arrays", () => {
		it("should handle primitive arrays correctly", () => {
			const data = { values: [1, 2, 3] }

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should handle object arrays correctly", () => {
			const data = {
				users: [
					{ id: 1, name: "John" },
					{ id: 2, name: "Jane" },
				],
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)
			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})
	})

	describe("Debug Information", () => {
		it("should show what encoding produces", () => {
			const data = { id: 1, name: "test" }
			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)

			const result = decode(packet, struct)

			expect(result).toEqual(data)
		})

		it("should show values extraction", () => {
			const data = {
				a: 1,
				b: "test",
				c: { nested: true },
			}

			const struct = createStructureDefinition(data)
			const packet = encode(data, struct.id)

			const result = decode(packet, struct)
			expect(result).toEqual(data)
		})
	})
})
