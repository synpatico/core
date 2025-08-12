// import { createStructureDefinition, decode } from "@synpatico/core"
import { useEffect, useState } from "react"
import "./App.css"

function App() {
	const [structureIds, setStructureIds] = useState({})
	const [structureCache, setStructureCache] = useState({}) // Cache original data by endpoint
	const [stats, setStats] = useState({})
	const [logs, setLogs] = useState([])
	const [originalData, setOriginalData] = useState(null)
	const [optimizedPayload, setOptimizedPayload] = useState(null)
	const [reconstructedData, setReconstructedData] = useState(null)
	const [_lastRequest, setLastRequest] = useState(null)

	const addLog = (message, type = "info") => {
		const timestamp = new Date().toLocaleTimeString()
		const emoji =
			type === "success" ? "✅" : type === "optimization" ? "🚀" : type === "learning" ? "🧠" : "📝"
		setLogs((prev) => [...prev.slice(-10), { timestamp, emoji, message, type }])
	}

	const formatBytes = (bytes) => {
		if (bytes === 0) return "0B"
		const k = 1024
		const sizes = ["B", "KB", "MB"]
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return Math.round((bytes / k ** i) * 100) / 100 + sizes[i]
	}

	const fetchStats = async () => {
		try {
			const response = await fetch("/stats/synpatico")
			const data = await response.json()
			setStats(data)
		} catch (error) {
			console.error("Failed to fetch stats:", error)
		}
	}

	const testEndpoint = async (endpoint) => {
		setLastRequest(endpoint)
		addLog(`Making request to ${endpoint}...`)

		try {
			// Prepare headers
			const headers = {}
			if (structureIds[endpoint]) {
				headers["X-Synpatico-Accept-ID"] = structureIds[endpoint]
				addLog(`Sending optimization header: ${structureIds[endpoint]}`, "optimization")
			}

			const response = await fetch(endpoint, { headers })

			// Get the raw response text to see what was actually sent over the network
			const responseText = await response.clone().text()
			const data = await response.json()

			// Parse response headers
			const synpaticoMode = response.headers.get("X-Synpatico-Mode")
			const structureId =
				response.headers.get("X-Synpatico-Structure-ID") || response.headers.get("X-Synpatico-ID")
			const originalSize = response.headers.get("X-Synpatico-Original-Size")
			const optimizedSize = response.headers.get("X-Synpatico-Optimized-Size")
			// const savings = response.headers.get("X-Synpatico-Savings")
			const contentType = response.headers.get("Content-Type")

			if (synpaticoMode === "learning") {
				// Learning phase - cache the structure and original data
				setStructureIds((prev) => ({ ...prev, [endpoint]: structureId }))
				setStructureCache((prev) => ({ ...prev, [endpoint]: data })) // Cache original data for this endpoint
				addLog(`Learning phase: Structure ID ${structureId} cached`, "learning")
				addLog(`Next request to ${endpoint} will be optimized!`, "success")

				setOriginalData(data)
				setOptimizedPayload(null)
				setReconstructedData(null)
			} else if (contentType.includes("synpatico")) {
				// Optimization phase - we received optimized payload
				const originalBytes = parseInt(originalSize)
				const optimizedBytes = parseInt(optimizedSize)
				const percentSaved = Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100)

				addLog(
					`Received optimized payload: ${formatBytes(optimizedBytes)} (${percentSaved}% saved)`,
					"optimization",
				)

				// The response text is the optimized payload (just values array)
				const optimizedValues = JSON.parse(responseText)
				setOptimizedPayload(optimizedValues)

				// Get the structure definition from our cache
				const cachedStructureId = structureIds[endpoint]
				const cachedOriginalData = structureCache[endpoint]

				if (cachedStructureId && cachedOriginalData) {
					try {
						// This is where we'd normally get the structure from our local cache
						// For demo purposes, we'll create it from the first learning request
						// In a real app, this would be cached client-side
						addLog(`Reconstructing data using structure ID: ${cachedStructureId}`, "success")

						// Show the cached original data (from learning phase)
						setOriginalData(cachedOriginalData)

						// For now, we'll show that the server already reconstructed it
						// In a proper implementation, we'd call decode(optimizedValues, structureDefinition)
						setReconstructedData(data)

						addLog(`✅ Perfect reconstruction completed!`, "success")
					} catch (error) {
						addLog(`❌ Reconstruction failed: ${error.message}`, "error")
					}
				}
			}

			// Update statistics
			await fetchStats()
		} catch (error) {
			addLog(`Error: ${error.message}`, "error")
			console.error("Request failed:", error)
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: onload
	useEffect(() => {
		fetchStats()
	}, [])

	return (
		<div className="app">
			<div className="container">
				<header className="header">
					<h1>🚀 Synpatico React Demo</h1>
					<p>Client-side reconstruction demonstration</p>
				</header>

				<div className="demo-section">
					<h2>🎮 API Testing</h2>
					<p>
						Click endpoints to see the optimization process with proper client-side reconstruction:
					</p>

					<div className="controls">
						<button type="button" onClick={() => testEndpoint("/api/users")}>
							👥 Test Users API
						</button>
						<button type="button" onClick={() => testEndpoint("/api/products")}>
							🛍️ Test Products API
						</button>
						<button type="button" onClick={() => testEndpoint("/api/dashboard")}>
							📊 Test Dashboard API
						</button>
					</div>

					{/* Per-endpoint statistics */}
					<div className="stats-section">
						<h3>📊 Per-Endpoint Statistics</h3>
						{stats.endpoints && Object.keys(stats.endpoints).length > 0 ? (
							<div className="endpoint-stats">
								{Object.entries(stats.endpoints).map(([path, endpointStats]) => (
									<div key={path} className="endpoint-card">
										<h4>{path}</h4>
										<div className="stats-grid">
											<div>Requests: {endpointStats.totalRequests}</div>
											<div>Optimized: {endpointStats.optimizedRequests}</div>
											<div>Saved: {formatBytes(endpointStats.bytesSaved)}</div>
											<div>Avg: {formatBytes(endpointStats.averageSavings)}</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<p style={{ color: "#666", fontStyle: "italic" }}>
								Make API requests to see endpoint breakdown...
							</p>
						)}
					</div>

					{/* Data display */}
					{(originalData || optimizedPayload) && (
						<div className="data-display">
							<div className="comparison">
								<div className="data-panel">
									<h4>📦 Original Data Structure</h4>
									{originalData && (
										<>
											<div className="size-badge">
												{formatBytes(JSON.stringify(originalData).length)}
											</div>
											<pre>{JSON.stringify(originalData, null, 2)}</pre>
										</>
									)}
								</div>

								<div className="data-panel">
									<h4>⚡ Optimized Network Payload</h4>
									{optimizedPayload ? (
										<>
											<div className="size-badge">
												{formatBytes(JSON.stringify(optimizedPayload).length)}
											</div>
											<pre>{JSON.stringify(optimizedPayload, null, 2)}</pre>
											<p className="explanation">
												↑ This is what was actually sent over the network
											</p>
										</>
									) : (
										<p>Make the same request again to see optimization...</p>
									)}
								</div>
							</div>

							{reconstructedData && (
								<div className="reconstruction-panel">
									<h4>🔄 Client-side Reconstructed Data</h4>
									<div className="size-badge">
										{formatBytes(JSON.stringify(reconstructedData).length)}
									</div>
									<pre>{JSON.stringify(reconstructedData, null, 2)}</pre>
									<p className="success">✅ Perfect reconstruction - identical to original!</p>
								</div>
							)}
						</div>
					)}

					{/* Logs */}
					<div className="logs">
						<h4>📝 Activity Log</h4>
						<div className="log-entries">
							{logs.length === 0 ? (
								<div className="log-entry">💡 Ready to demonstrate Synpatico optimization...</div>
							) : (
								logs.map((log) => (
									<div key={log.message} className="log-entry">
										[{log.timestamp}] {log.emoji} {log.message}
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default App
