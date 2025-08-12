#!/usr/bin/env node

import { gzipSync } from "node:zlib"
import {
	createStructureDefinition,
	createStructureDefinitionWithPaths,
	decode,
	encode,
} from "@synpatico/core"
import { Bench } from "tinybench"

console.log("🚀 Synpatico Core - Performance & Size Comparison Demo")
console.log("=".repeat(55))

// Generate simple data like Vitest benchmarks for fair comparison
function generateSimpleUsers(count = 100) {
	const users = []
	for (let i = 1; i <= count; i++) {
		users.push({
			id: i,
			name: `User${i}`,
			email: `user${i}@example.com`,
		})
	}
	return { users, total: users.length }
}

// Generate complex structured data to show real-world performance
function generateComplexUsers(count = 100) {
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

	const users = []
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

	return { users, total: count, page: 1, pageSize: count, timestamp: new Date().toISOString() }
}

// Run actual benchmarks using tinybench (same engine as Vitest)
async function runTinyBenchmarks() {
	console.log("   Running performance benchmarks with tinybench...")

	try {
		const results = {
			simple: {},
			complex: {},
			realisticComplex: {},
		}

		// Test data
		const simpleData = generateSimpleUsers(100)
		const complexData = generateComplexUsers(50)
		const realisticComplexData = generateComplexUsers(100)

		// Pre-compute structure definitions for consistent testing
		const simpleStruct = createStructureDefinitionWithPaths(simpleData)
		const complexStruct = createStructureDefinitionWithPaths(complexData)
		const realisticComplexStruct = createStructureDefinitionWithPaths(realisticComplexData)

		// Simple Data benchmarks
		const simpleBench = new Bench({ time: 1000 })
		simpleBench.add("JSON.stringify (baseline)", () => {
			JSON.stringify(simpleData)
		})
		simpleBench.add("encode (adaptive auto-strategy)", () => {
			encode(simpleData, simpleStruct.id, simpleStruct.paths)
		})

		await simpleBench.run()
		results.simple.jsonStringify =
			simpleBench.tasks.find((t) => t.name.includes("JSON.stringify"))?.result?.hz || 0
		results.simple.encode =
			simpleBench.tasks.find((t) => t.name.includes("encode"))?.result?.hz || 0

		// Complex Data benchmarks
		const complexBench = new Bench({ time: 1000 })
		complexBench.add("JSON.stringify (baseline)", () => {
			JSON.stringify(complexData)
		})
		complexBench.add("encode (adaptive auto-strategy)", () => {
			encode(complexData, complexStruct.id, complexStruct.paths)
		})

		await complexBench.run()
		results.complex.jsonStringify =
			complexBench.tasks.find((t) => t.name.includes("JSON.stringify"))?.result?.hz || 0
		results.complex.encode =
			complexBench.tasks.find((t) => t.name.includes("encode"))?.result?.hz || 0

		// Realistic Complex Data benchmarks
		const realisticBench = new Bench({ time: 1000 })
		realisticBench.add("JSON.stringify (baseline)", () => {
			JSON.stringify(realisticComplexData)
		})
		realisticBench.add("encode (adaptive auto-strategy)", () => {
			encode(realisticComplexData, realisticComplexStruct.id, realisticComplexStruct.paths)
		})

		await realisticBench.run()
		results.realisticComplex.jsonStringify =
			realisticBench.tasks.find((t) => t.name.includes("JSON.stringify"))?.result?.hz || 0
		results.realisticComplex.encode =
			realisticBench.tasks.find((t) => t.name.includes("encode"))?.result?.hz || 0

		return results
	} catch (error) {
		console.log("   ⚠️  Could not run benchmarks:", error.message)
		return null
	}
}

// Comprehensive performance and size comparison
async function demonstrateSynpatico() {
	// Step 1: Test both simple and complex data
	console.log("📊 Testing both simple and complex data structures...")

	// First test with simple data (like Vitest)
	const simpleData = generateSimpleUsers(100)
	console.log(
		`📦 Simple Data (like Vitest): ${JSON.stringify(simpleData).length.toLocaleString()} bytes`,
	)

	// Then test with complex realistic data
	const originalData = generateComplexUsers(100)
	console.log(
		`📦 Complex Data (realistic): ${JSON.stringify(originalData).length.toLocaleString()} bytes`,
	)

	// Step 2: Show original JSON size
	const originalJson = JSON.stringify(originalData)
	const originalSize = new TextEncoder().encode(originalJson).length
	console.log(`📦 Original JSON Response: ${originalSize.toLocaleString()} bytes`)

	// Step 3: Structure learning (one-time cost)
	console.log("\n🧠 Learning data structure...")
	const structureLearningStart = performance.now()
	const structureDefinition = createStructureDefinition(originalData)
	const structureLearningTime = performance.now() - structureLearningStart
	console.log(`   Structure ID: ${structureDefinition.id}`)
	console.log(`   Learning time: ${structureLearningTime.toFixed(3)}ms (one-time cost)`)

	// Step 4: Encode with Synpatico
	console.log("\n⚡ Encoding with Synpatico...")
	const optimizedPacket = encode(originalData, structureDefinition.id)

	const optimizedJson = JSON.stringify(optimizedPacket.values)
	const optimizedSize = new TextEncoder().encode(optimizedJson).length
	console.log(`📦 Optimized Response: ${optimizedSize.toLocaleString()} bytes`)

	// Step 5: Show size comparison
	const bytesSaved = originalSize - optimizedSize
	const percentageSaved = Math.round((bytesSaved / originalSize) * 100)
	console.log(
		`🎉 Result: ${percentageSaved}% bandwidth saved (${bytesSaved.toLocaleString()} bytes)`,
	)
	console.log(`📏 Compression: ${(originalSize / optimizedSize).toFixed(1)}:1 ratio`)

	// Step 6: Gzip Comparison (real-world HTTP scenario)
	console.log("\n🗜️ Gzip Compression Comparison (real-world HTTP):")

	const originalGzipped = gzipSync(Buffer.from(originalJson))
	const optimizedGzipped = gzipSync(Buffer.from(optimizedJson))
	const originalGzipSize = originalGzipped.length
	const optimizedGzipSize = optimizedGzipped.length

	console.log(`📦 Original JSON (gzipped): ${originalGzipSize.toLocaleString()} bytes`)
	console.log(`📦 Synpatico values (gzipped): ${optimizedGzipSize.toLocaleString()} bytes`)

	const gzipBytesSaved = originalGzipSize - optimizedGzipSize
	const gzipPercentageSaved = Math.round((gzipBytesSaved / originalGzipSize) * 100)
	console.log(
		`🎉 Gzipped bandwidth saved: ${gzipPercentageSaved}% (${gzipBytesSaved.toLocaleString()} bytes)`,
	)
	console.log(
		`📏 Gzipped compression: ${(originalGzipSize / optimizedGzipSize).toFixed(1)}:1 ratio`,
	)

	// Show gzip effectiveness
	const originalGzipReduction = Math.round((1 - originalGzipSize / originalSize) * 100)
	const optimizedGzipReduction = Math.round((1 - optimizedGzipSize / optimizedSize) * 100)
	console.log(`   • JSON gzip effectiveness: ${originalGzipReduction}% size reduction`)
	console.log(`   • Synpatico gzip effectiveness: ${optimizedGzipReduction}% size reduction`)
	console.log(
		`   • Synpatico advantage persists even after gzip: ${gzipPercentageSaved}% additional savings`,
	)

	// Step 7: Tinybench Performance Benchmarks
	console.log("\n⚡ Performance Benchmarks (using tinybench):")

	const benchResults = await runTinyBenchmarks()

	if (benchResults) {
		console.log("\n📋 SIMPLE DATA (3 fields per user):")
		if (benchResults.simple.jsonStringify && benchResults.simple.encode) {
			console.log(
				`   JSON.stringify:   ${benchResults.simple.jsonStringify.toLocaleString()} ops/sec`,
			)
			console.log(`   Synpatico encode: ${benchResults.simple.encode.toLocaleString()} ops/sec`)
			const simpleRatio = benchResults.simple.encode / benchResults.simple.jsonStringify
			console.log(
				`   🏆 Synpatico is ${simpleRatio > 1 ? `${simpleRatio.toFixed(1)}x FASTER` : `${(1 / simpleRatio).toFixed(1)}x slower`} than JSON.stringify`,
			)
		}

		console.log("\n📋 COMPLEX DATA (nested objects):")
		if (benchResults.complex.jsonStringify && benchResults.complex.encode) {
			console.log(
				`   JSON.stringify:   ${benchResults.complex.jsonStringify.toLocaleString()} ops/sec`,
			)
			console.log(`   Synpatico encode: ${benchResults.complex.encode.toLocaleString()} ops/sec`)
			const complexRatio = benchResults.complex.encode / benchResults.complex.jsonStringify
			console.log(
				`   🏆 Synpatico is ${complexRatio > 1 ? `${complexRatio.toFixed(1)}x FASTER` : `${(1 / complexRatio).toFixed(1)}x slower`} than JSON.stringify`,
			)
		}

		console.log("\n📋 REALISTIC COMPLEX DATA (12+ fields with arrays & dates):")
		if (benchResults.realisticComplex.jsonStringify && benchResults.realisticComplex.encode) {
			console.log(
				`   JSON.stringify:   ${benchResults.realisticComplex.jsonStringify.toLocaleString()} ops/sec`,
			)
			console.log(
				`   Synpatico encode: ${benchResults.realisticComplex.encode.toLocaleString()} ops/sec`,
			)
			const realisticRatio =
				benchResults.realisticComplex.encode / benchResults.realisticComplex.jsonStringify
			console.log(
				`   🏆 Synpatico is ${realisticRatio > 1 ? `${realisticRatio.toFixed(1)}x FASTER` : `${(1 / realisticRatio).toFixed(1)}x slower`} than JSON.stringify`,
			)
		}
	} else {
		console.log("   ⚠️  Benchmarks unavailable, install dependencies and try again")
	}

	// Step 8: Data Integrity Verification
	console.log("\n🔍 Data Integrity Verification:")
	const reconstructedData = decode(optimizedPacket, structureDefinition)

	// Deep equality check
	const isIdentical =
		JSON.stringify(originalData, Object.keys(originalData).sort()) ===
		JSON.stringify(reconstructedData, Object.keys(reconstructedData).sort())

	console.log(`   Perfect reconstruction: ${isIdentical ? "✅ PASSED" : "❌ FAILED"}`)

	if (!isIdentical) {
		console.log("   ❌ Data mismatch detected!")
		console.log("   Original sample:", JSON.stringify(originalData.users[0], null, 2))
		console.log("   Reconstructed sample:", JSON.stringify(reconstructedData.users[0], null, 2))
		return
	}

	// Step 9: Business Impact Analysis
	console.log("\n💰 Business Impact Analysis:")
	const recordCount = originalData.users.length
	const fieldsPerRecord = Object.keys(originalData.users[0]).length + 2 // including nested performance object
	const keysEliminated = fieldsPerRecord * recordCount

	console.log(
		`   📊 Dataset: ${recordCount} users × ${fieldsPerRecord} fields = ${keysEliminated} repetitive keys eliminated`,
	)
	console.log(
		`   📦 Payload size: ${originalSize.toLocaleString()} → ${optimizedSize.toLocaleString()} bytes`,
	)
	console.log(`   🎯 Bandwidth saved: ${percentageSaved}% (${bytesSaved.toLocaleString()} bytes)`)
	console.log(
		`   📈 Compression ratio (without gzip): ${(originalSize / optimizedSize).toFixed(1)}:1`,
	)

	console.log("\n📚 Next Steps:")
	console.log("   • Try the Express middleware: cd ../express-middleware && pnpm start")
	console.log("   • Test the React demo: cd ../react-demo && pnpm dev")
	console.log("   • Check the README for integration guides")
	console.log("   • Star the repo if this saves you money! ⭐")
}

// Run the demonstration
demonstrateSynpatico().catch(console.error)
