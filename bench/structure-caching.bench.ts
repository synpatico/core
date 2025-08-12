import { bench, describe } from "vitest"
import { createStructureDefinition, createStructureDefinitionOptimized, encode } from "../../../src/index"

// Test data generators that create the pattern you described
function generateUser() {
	return {
		fname: "John",
		lname: "Smith",
		address: {
			city: "New York",
			state: "NY",
		},
	}
}

function generateUserArray(count = 100) {
	return Array.from({ length: count }, () => generateUser())
	
}

function generateMixedUserArray(count = 100) {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		...generateUser(),
		email: `user${i}@example.com`,
	}))
}

function generateComplexDataset() {
	return {
		users: generateUserArray(50),
		products: Array.from({ length: 30 }, (_, i) => ({
			id: i,
			name: `Product ${i}`,
			price: 99.99,
			specs: {
				weight: "1kg",
				dimensions: "10x10x5cm",
			},
		})),
		metadata: {
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		},
	}
}

// Pre-generate test data
const homogeneousUserArray = generateUserArray(100)
const mixedUserArray = generateMixedUserArray(100)
const complexDataset = generateComplexDataset()

describe("Structure Caching Optimization", () => {
	describe("Homogeneous User Array (same structure repeated)", () => {
		bench("createStructureDefinition (standard)", () => {
			createStructureDefinition(homogeneousUserArray)
		})

		bench("createStructureDefinitionOptimized (with caching)", () => {
			createStructureDefinitionOptimized(homogeneousUserArray)
		})
	})

	describe("Mixed User Array (similar structures)", () => {
		bench("createStructureDefinition (standard)", () => {
			createStructureDefinition(mixedUserArray)
		})

		bench("createStructureDefinitionOptimized (with caching)", () => {
			createStructureDefinitionOptimized(mixedUserArray)
		})
	})

	describe("Complex Dataset (nested homogeneous arrays)", () => {
		bench("createStructureDefinition (standard)", () => {
			createStructureDefinition(complexDataset)
		})

		bench("createStructureDefinitionOptimized (with caching)", () => {
			createStructureDefinitionOptimized(complexDataset)
		})
	})
})

describe("Encoding Performance with Structure Caching", () => {
	// Pre-compute structures for encoding tests
	const homogeneousStruct = createStructureDefinition(homogeneousUserArray)
	const homogeneousStructOptimized = createStructureDefinitionOptimized(homogeneousUserArray)

	describe("Encoding Homogeneous User Array", () => {
		bench("encode with standard structure", () => {
			encode(homogeneousUserArray, homogeneousStruct.id)
		})

		bench("encode with optimized structure", () => {
			encode(homogeneousUserArray, homogeneousStructOptimized.id)
		})
	})
})

describe("Memory Usage Comparison", () => {
	describe("Structure Size Analysis", () => {
		bench("standard structure creation (memory intensive)", () => {
			const struct = createStructureDefinition(homogeneousUserArray)
			// Structure contains individual shapes for each array item
			const structureSize = JSON.stringify(struct.shape).length
			return void structureSize
		})

		bench("optimized structure creation (memory efficient)", () => {
			const struct = createStructureDefinitionOptimized(homogeneousUserArray)
			// Structure contains single reusable shape for homogeneous arrays
			const structureSize = JSON.stringify(struct.shape).length
			return void structureSize
		})
	})
})
