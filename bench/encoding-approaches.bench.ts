import { bench, describe } from "vitest"
import { createStructureDefinitionWithPaths, encode, encodeWithDirectPaths } from "../../../src/index"

// Test data generators
function generateSimpleData(size = 100) {
	const users: any = []
	for (let i = 1; i <= size; i++) {
		users.push({
			id: i,
			name: `User${i}`,
			email: `user${i}@example.com`,
		})
	}
	return { users, total: users.length }
}

function generateComplexData(size = 50) {
	const users: any = []
	for (let i = 1; i <= size; i++) {
		users.push({
			id: i,
			firstName: `User${i}`,
			lastName: `LastName${i}`,
			email: `user${i}@example.com`,
			department: "Engineering",
			isActive: i % 10 !== 0,
			profile: {
				avatar: `https://api.avatar.com/user${i}`,
				preferences: {
					theme: "dark",
					notifications: true,
				},
			},
			metadata: {
				created: new Date().toISOString(),
				tags: [`tag${i % 3}`, `role${i % 2}`],
			},
		})
	}
	return { users, total: users.length }
}

function generateRealisticComplexData(count = 100) {
	const firstNames = [
		"John",
		"Sarah",
		"Mike",
		"Emily",
		"David",
		"Lisa",
		"Chris",
		"Amy",
		"Tom",
		"Kate",
	]
	const lastNames = [
		"Smith",
		"Johnson",
		"Wilson",
		"Brown",
		"Davis",
		"Miller",
		"Garcia",
		"Martinez",
		"Lee",
		"Taylor",
	]
	const departments = ["Engineering", "Marketing", "Sales", "Operations", "Finance", "HR", "Design"]
	const skills = ["JavaScript", "Python", "React", "Node.js", "SQL", "AWS", "Docker"]

	const users: any = []
	for (let i = 1; i <= count; i++) {
		const firstName = firstNames[i % firstNames.length]
		const lastName = lastNames[i % lastNames.length]
		const department = departments[i % departments.length]

		users.push({
			id: i,
			firstName,
			lastName,
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
			department,
			salary: 50000 + i * 1000,
			joinDate: new Date(2020, i % 12, (i % 28) + 1).toISOString(),
			isActive: i % 10 !== 0, // 90% active
			skills: [
				skills[i % skills.length],
				skills[(i + 1) % skills.length],
				skills[(i + 2) % skills.length],
			],
			performance: {
				rating: (i % 5) + 1,
				lastReview: new Date(2024, i % 12, 15).toISOString(),
				goals: (i % 8) + 1,
			},
		})
	}

	return {
		users,
		total: count,
		page: 1,
		pageSize: count,
		timestamp: new Date().toISOString(),
	}
}

const testData = {
	simple: generateSimpleData(100),
	complex: generateComplexData(50),
	realisticComplex: generateRealisticComplexData(100),
}

// Pre-compute structure definitions for consistent testing
// const simpleStruct = createStructureDefinition(testData.simple);
const simplePathsStruct = createStructureDefinitionWithPaths(testData.simple)
// const complexStruct = createStructureDefinition(testData.complex);
const complexPathsStruct = createStructureDefinitionWithPaths(testData.complex)
// const realisticComplexStruct = createStructureDefinition(
// 	testData.realisticComplex,
// );
const realisticComplexPathsStruct = createStructureDefinitionWithPaths(testData.realisticComplex)

describe("Encoding Performance Comparison", () => {
	describe("Simple Data (100 users)", () => {
		bench("JSON.stringify (baseline)", () => {
			JSON.stringify(testData.simple)
		})

		bench("encode (adaptive auto-strategy)", () => {
			encode(testData.simple, simplePathsStruct.id, simplePathsStruct.paths)
		})

		bench("encodeWithDirectPaths (pre-computed)", () => {
			encodeWithDirectPaths(testData.simple, simplePathsStruct.id, simplePathsStruct.paths)
		})
	})

	describe("Complex Data (50 users with nested objects)", () => {
		bench("JSON.stringify (baseline)", () => {
			JSON.stringify(testData.complex)
		})

		bench("encode (adaptive auto-strategy)", () => {
			encode(testData.complex, complexPathsStruct.id, complexPathsStruct.paths)
		})

		bench("encodeWithDirectPaths (pre-computed)", () => {
			encodeWithDirectPaths(testData.complex, complexPathsStruct.id, complexPathsStruct.paths)
		})
	})

	describe("Realistic Complex Data (100 users with skills, performance, dates)", () => {
		bench("JSON.stringify (baseline)", () => {
			JSON.stringify(testData.realisticComplex)
		})

		bench("encode (adaptive auto-strategy)", () => {
			encode(
				testData.realisticComplex,
				realisticComplexPathsStruct.id,
				realisticComplexPathsStruct.paths,
			)
		})

		bench("encodeWithDirectPaths (pre-computed)", () => {
			encodeWithDirectPaths(
				testData.realisticComplex,
				realisticComplexPathsStruct.id,
				realisticComplexPathsStruct.paths,
			)
		})
	})
})
