import express from "express"

const app = express()
const PORT = 3001

app.use(express.json())

// Simple test route without middleware first
app.get("/api/users", (_req, res) => {
	res.json({
		message: "Hello from API",
		timestamp: new Date().toISOString(),
	})
})

app.get("/health", (_req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
	})
})

app.listen(PORT, () => {
	console.log(`Test server running at: http://localhost:${PORT}`)
})
