import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import { synpaticoMiddleware } from "./middleware.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware setup
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// Enable CORS for React app
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "http://localhost:5173")
	res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Synpatico-Accept-ID",
	)
	res.header(
		"Access-Control-Expose-Headers",
		"X-Synpatico-Mode, X-Synpatico-Structure-ID, X-Synpatico-ID, X-Synpatico-Original-Size, X-Synpatico-Optimized-Size, X-Synpatico-Savings, X-Synpatico-Agent",
	)

	if (req.method === "OPTIONS") {
		res.sendStatus(200)
	} else {
		next()
	}
})

// Apply Synpatico middleware to all API routes
const middleware = synpaticoMiddleware({
	maxCacheSize: 1000,
	enableLogging: true,
	pathPattern: /^\/api\//,
})

app.use(middleware)

// Sample data generators
// function generateUsers(count = 50) {
// 	const firstNames = [
// 		"John",
// 		"Sarah",
// 		"Mike",
// 		"Emily",
// 		"David",
// 		"Lisa",
// 		"Chris",
// 		"Amy",
// 		"Tom",
// 		"Kate",
// 		"Alex",
// 		"Maria",
// 	]
// 	const lastNames = [
// 		"Smith",
// 		"Johnson",
// 		"Wilson",
// 		"Brown",
// 		"Davis",
// 		"Miller",
// 		"Garcia",
// 		"Martinez",
// 		"Lee",
// 		"Taylor",
// 		"Moore",
// 		"Jackson",
// 	]
// 	const departments = [
// 		"Engineering",
// 		"Marketing",
// 		"Sales",
// 		"Operations",
// 		"Finance",
// 		"HR",
// 		"Design",
// 		"Support",
// 	]
// 	const skills = [
// 		"JavaScript",
// 		"Python",
// 		"React",
// 		"Node.js",
// 		"SQL",
// 		"AWS",
// 		"Docker",
// 		"Kubernetes",
// 		"GraphQL",
// 		"TypeScript",
// 	]

// 	return Array.from({ length: count }, (_, i) => {
// 		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
// 		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
// 		const department = departments[Math.floor(Math.random() * departments.length)]

// 		return {
// 			id: i + 1,
// 			firstName,
// 			lastName,
// 			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
// 			department,
// 			salary: 45000 + Math.floor(Math.random() * 120000),
// 			joinDate: new Date(
// 				2018 + Math.floor(Math.random() * 6),
// 				Math.floor(Math.random() * 12),
// 				Math.floor(Math.random() * 28),
// 			).toISOString(),
// 			isActive: Math.random() > 0.05,
// 			skills: Array.from(
// 				{ length: 2 + Math.floor(Math.random() * 4) },
// 				() => skills[Math.floor(Math.random() * skills.length)],
// 			).filter((skill, index, arr) => arr.indexOf(skill) === index),
// 			performance: {
// 				rating: 1 + Math.floor(Math.random() * 5),
// 				lastReview: new Date(
// 					2023,
// 					Math.floor(Math.random() * 12),
// 					Math.floor(Math.random() * 28),
// 				).toISOString(),
// 				goals: Math.floor(Math.random() * 10) + 1,
// 			},
// 		}
// 	})
// }

function generateConsistentUsers(count = 50) {
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
		"Alex",
		"Maria",
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
		"Moore",
		"Jackson",
	]
	const departments = [
		"Engineering",
		"Marketing",
		"Sales",
		"Operations",
		"Finance",
		"HR",
		"Design",
		"Support",
	]
	const skills = [
		"JavaScript",
		"Python",
		"React",
		"Node.js",
		"SQL",
		"AWS",
		"Docker",
		"Kubernetes",
		"GraphQL",
		"TypeScript",
	]

	// Use a simple pseudo-random based on current time to get different data each time
	// but still deterministic within the same request
	const seed = Math.floor(Date.now() / 1000) // Changes every second
	const pseudoRandom = (index, offset = 0) => {
		return Math.abs(Math.sin(seed + index + offset)) * 10000
	}

	return Array.from({ length: count }, (_, i) => {
		// Use pseudo-random to select different values each time but keep structure identical
		const firstNameIndex = Math.floor(pseudoRandom(i, 1) % firstNames.length)
		const lastNameIndex = Math.floor(pseudoRandom(i, 2) % lastNames.length)
		const departmentIndex = Math.floor(pseudoRandom(i, 3) % departments.length)

		const firstName = firstNames[firstNameIndex]
		const lastName = lastNames[lastNameIndex]
		const department = departments[departmentIndex]

		// Generate skills - always 3 skills to keep structure consistent
		const skillsCount = 3
		const userSkills = []
		for (let j = 0; j < skillsCount; j++) {
			const skillIndex = Math.floor(pseudoRandom(i, 10 + j) % skills.length)
			const skill = skills[skillIndex]
			if (!userSkills.includes(skill)) {
				userSkills.push(skill)
			}
		}
		// Pad with default skills if we don't have enough unique ones
		while (userSkills.length < skillsCount) {
			userSkills.push(skills[userSkills.length % skills.length])
		}

		return {
			id: i + 1,
			firstName,
			lastName,
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
			department,
			salary: 50000 + Math.floor(pseudoRandom(i, 4) % 100000),
			joinDate: new Date(
				2020 + Math.floor(pseudoRandom(i, 5) % 5),
				Math.floor(pseudoRandom(i, 6) % 12),
				1 + Math.floor(pseudoRandom(i, 7) % 28),
			).toISOString(),
			isActive: pseudoRandom(i, 8) > 0.5, // Will be consistent for each user but varies
			skills: userSkills,
			performance: {
				rating: 1 + Math.floor(pseudoRandom(i, 9) % 5),
				lastReview: new Date(
					2024,
					Math.floor(pseudoRandom(i, 10) % 12),
					1 + Math.floor(pseudoRandom(i, 11) % 28),
				).toISOString(),
				goals: 1 + Math.floor(pseudoRandom(i, 12) % 10),
			},
		}
	})
}

function generateProducts(count = 30) {
	const categories = [
		"Electronics",
		"Clothing",
		"Books",
		"Home & Garden",
		"Sports",
		"Toys",
		"Health",
		"Automotive",
	]
	const brands = ["BrandA", "BrandB", "BrandC", "BrandD", "BrandE"]
	const adjectives = [
		"Premium",
		"Deluxe",
		"Professional",
		"Compact",
		"Ultimate",
		"Advanced",
		"Classic",
	]
	const nouns = ["Widget", "Device", "Tool", "System", "Solution", "Kit", "Set", "Bundle"]
	const colors = ["Black", "White", "Silver", "Blue", "Red"]

	// Use time-based seed for varying data with consistent structure
	const seed = Math.floor(Date.now() / 1000)
	const pseudoRandom = (index, offset = 0) => {
		return Math.abs(Math.sin(seed + index + offset)) * 10000
	}

	return Array.from({ length: count }, (_, i) => {
		const categoryIndex = Math.floor(pseudoRandom(i, 1) % categories.length)
		const brandIndex = Math.floor(pseudoRandom(i, 2) % brands.length)
		const adjectiveIndex = Math.floor(pseudoRandom(i, 3) % adjectives.length)
		const nounIndex = Math.floor(pseudoRandom(i, 4) % nouns.length)
		const colorIndex = Math.floor(pseudoRandom(i, 5) % colors.length)

		const category = categories[categoryIndex]
		const brand = brands[brandIndex]
		const adjective = adjectives[adjectiveIndex]
		const noun = nouns[nounIndex]
		const color = colors[colorIndex]

		return {
			id: i + 1,
			name: `${brand} ${adjective} ${noun}`,
			category,
			price: 19.99 + Math.floor(pseudoRandom(i, 6) % 980),
			currency: "USD",
			inStock: pseudoRandom(i, 7) > 0.1,
			stockCount: Math.floor(pseudoRandom(i, 8) % 1000),
			rating: 1 + Math.floor(pseudoRandom(i, 9) % 5),
			reviewCount: Math.floor(pseudoRandom(i, 10) % 500),
			description: `A ${adjective.toLowerCase()} ${noun.toLowerCase()} from ${brand} perfect for your ${category.toLowerCase()} needs.`,
			specifications: {
				weight: `${(0.1 + (pseudoRandom(i, 11) % 50) / 10).toFixed(1)}kg`,
				dimensions: `${Math.floor(pseudoRandom(i, 12) % 50)}x${Math.floor(pseudoRandom(i, 13) % 50)}x${Math.floor(pseudoRandom(i, 14) % 20)}cm`,
				color,
				warranty: `${1 + Math.floor(pseudoRandom(i, 15) % 3)} years`,
			},
		}
	})
}

function generateDashboardMetrics() {
	const seed = Math.floor(Date.now() / 1000)
	const pseudoRandom = (offset = 0) => {
		return Math.abs(Math.sin(seed + offset)) * 10000
	}

	const actions = ["User registered", "Order placed", "Payment processed", "Product viewed"]
	const changes = ["+12.3%", "+8.7%", "+2.1%", "+15.2%"]

	return {
		summary: {
			totalUsers: 15420 + Math.floor(pseudoRandom(1) % 1000),
			activeUsers: 12340 + Math.floor(pseudoRandom(2) % 500),
			totalRevenue: 1245000 + Math.floor(pseudoRandom(3) % 100000),
			monthlyGrowth: 5.2 + (pseudoRandom(4) % 1000) / 100,
		},
		metrics: [
			{
				name: "Page Views",
				value: 45230 + Math.floor(pseudoRandom(5) % 5000),
				change: changes[Math.floor(pseudoRandom(6) % changes.length)],
			},
			{
				name: "Unique Visitors",
				value: 23450 + Math.floor(pseudoRandom(7) % 2000),
				change: changes[Math.floor(pseudoRandom(8) % changes.length)],
			},
			{
				name: "Conversion Rate",
				value: 3.2 + (pseudoRandom(9) % 200) / 100,
				change: changes[Math.floor(pseudoRandom(10) % changes.length)],
			},
			{
				name: "Avg Session Duration",
				value: `${Math.floor(3 + (pseudoRandom(11) % 300) / 100)}:${Math.floor(10 + (pseudoRandom(12) % 50))}`,
				change: changes[Math.floor(pseudoRandom(13) % changes.length)],
			},
		],
		recentActivity: Array.from({ length: 10 }, (_, i) => ({
			id: i + 1,
			action: actions[Math.floor(pseudoRandom(20 + i) % actions.length)],
			user: `user${Math.floor(pseudoRandom(30 + i) % 1000)}@example.com`,
			timestamp: new Date(
				Date.now() - (pseudoRandom(40 + i) % (24 * 60 * 60 * 1000)),
			).toISOString(),
			value: Math.floor(pseudoRandom(50 + i) % 500),
		})),
		chartData: Array.from({ length: 30 }, (_, i) => ({
			date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			revenue: 1000 + Math.floor(pseudoRandom(60 + i) % 5000),
			users: 100 + Math.floor(pseudoRandom(70 + i) % 500),
			orders: 10 + Math.floor(pseudoRandom(80 + i) % 50),
		})),
	}
}

// API Routes
app.get("/api/users", (req, res) => {
	const count = parseInt(req.query.count) || 50
	const users = generateConsistentUsers(count)

	res.json({
		users,
		total: users.length,
		page: parseInt(req.query.page) || 1,
		pageSize: count,
		timestamp: new Date().toISOString(),
	})
})

app.get("/api/products", (req, res) => {
	const count = parseInt(req.query.count) || 30
	const products = generateProducts(count)

	res.json({
		products,
		total: products.length,
		categories: [
			"Electronics",
			"Clothing",
			"Books",
			"Home & Garden",
			"Sports",
			"Toys",
			"Health",
			"Automotive",
		],
		timestamp: new Date().toISOString(),
	})
})

app.get("/api/dashboard", (_req, res) => {
	res.json({
		...generateDashboardMetrics(),
		timestamp: new Date().toISOString(),
		generatedAt: Date.now(),
	})
})

// Statistics endpoint
app.get("/stats/synpatico", (req, res) => {
	const stats = req.synpaticoStats ? req.synpaticoStats() : null

	if (!stats) {
		return res.status(404).json({ error: "Synpatico stats not available" })
	}

	res.json({
		...stats,
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	})
})

// Health check
app.get("/health", (_req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	})
})

// Serve the demo page at root
app.get("/", (_req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Start server
app.listen(PORT, () => {
	console.log("\\n🚀 Synpatico Express Middleware Example")
	console.log("=========================================")
	console.log(`Server running at: http://localhost:${PORT}`)
	console.log("\\nAPI Endpoints:")
	console.log("• GET /api/users      - User data (optimizable)")
	console.log("• GET /api/products   - Product catalog (optimizable)")
	console.log("• GET /api/dashboard  - Dashboard metrics (optimizable)")
	console.log("• GET /stats/synpatico - Optimization statistics")
	console.log("\\nTry making requests:")
	console.log("• First request: Standard JSON response + structure learning")
	console.log("• Add header: X-Synpatico-Accept-ID: [structure-id] for optimization")
	console.log(`\\nOpen http://localhost:${PORT} for interactive demo!`)
})
