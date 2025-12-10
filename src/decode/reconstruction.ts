import { GLOBAL_KEY_MAP } from '@synpatico/genome'

/**
 * Reconstructs an object from its extracted values and shape definition.
 */
export function reconstructObject(values: unknown[], shape: Record<string, unknown>): unknown {
	let valueIndex = 0

	const recurse = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string

		if (type !== 'object' && type !== 'array' && type !== 'homogeneous-array') {
			return values[valueIndex++]
		}

		if (type === 'array') {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr: unknown[] = []
			for (let i = 0; i < itemShapes.length; i++) {
				arr.push(recurse(itemShapes[i]))
			}
			return arr
		}

		if (type === 'homogeneous-array') {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>
			const arr: unknown[] = []
			for (let i = 0; i < length; i++) {
				arr.push(recurse(itemShape))
			}
			return arr
		}

		const obj: Record<string, unknown> = {}
		const sortedKeys = Object.keys(currentShape)
			.filter((k) => k !== 'type' && k !== '_signature')
			.sort()

		for (const key of sortedKeys) {
			obj[key] = recurse(currentShape[key] as Record<string, unknown>)
		}
		return obj
	}

	return recurse(shape)
}

/**
 * Optimized reconstruction with key caching per shape.
 */
export function reconstructObjectOptimized(
	values: unknown[],
	shape: Record<string, unknown>,
): unknown {
	let valueIndex = 0
	const keyCache = new Map<Record<string, unknown>, string[]>()

	const getKeys = (currentShape: Record<string, unknown>): string[] => {
		let keys = keyCache.get(currentShape)
		if (!keys) {
			keys = Object.keys(currentShape)
				.filter((k) => k !== 'type' && k !== '_signature')
				.sort()
			keyCache.set(currentShape, keys)
		}
		return keys
	}

	const recurse = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string

		if (type !== 'object' && type !== 'array' && type !== 'homogeneous-array') {
			return values[valueIndex++]
		}

		if (type === 'array') {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr = new Array(itemShapes.length)
			for (let i = 0; i < itemShapes.length; i++) {
				arr[i] = recurse(itemShapes[i])
			}
			return arr
		}

		if (type === 'homogeneous-array') {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>
			const arr = new Array(length)
			for (let i = 0; i < length; i++) {
				arr[i] = recurse(itemShape)
			}
			return arr
		}

		const sortedKeys = getKeys(currentShape)
		const obj: Record<string, unknown> = {}
		for (const key of sortedKeys) {
			obj[key] = recurse(currentShape[key] as Record<string, unknown>)
		}
		return obj
	}

	return recurse(shape)
}

/**
 * Fast reconstruction with pre-compiled layouts.
 */
export function reconstructObjectFast(values: unknown[], shape: Record<string, unknown>): unknown {
	let valueIndex = 0
	const layoutCache = new Map<Record<string, unknown>, string[]>()

	const getLayout = (shapeObj: Record<string, unknown>): string[] => {
		let layout = layoutCache.get(shapeObj)
		if (!layout) {
			layout = Object.keys(shapeObj)
				.filter(
					(k) =>
						k !== 'type' &&
						k !== '_signature' &&
						k !== 'length' &&
						k !== 'itemShape' &&
						k !== 'itemShapes',
				)
				.sort()
			layoutCache.set(shapeObj, layout)
		}
		return layout
	}

	const rebuild = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string

		if (type !== 'object' && type !== 'array' && type !== 'homogeneous-array') {
			return values[valueIndex++]
		}

		if (type === 'homogeneous-array') {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>
			const arr = new Array(length)

			if (itemShape.type === 'object') {
				const layout = getLayout(itemShape)
				for (let i = 0; i < length; i++) {
					const obj: Record<string, unknown> = {}
					for (const key of layout) {
						obj[key] = rebuild(itemShape[key] as Record<string, unknown>)
					}
					arr[i] = obj
				}
			} else {
				for (let i = 0; i < length; i++) {
					arr[i] = rebuild(itemShape)
				}
			}
			return arr
		}

		if (type === 'array') {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr = new Array(itemShapes.length)
			for (let i = 0; i < itemShapes.length; i++) {
				arr[i] = rebuild(itemShapes[i])
			}
			return arr
		}

		const layout = getLayout(currentShape)
		const obj: Record<string, unknown> = {}
		for (const key of layout) {
			obj[key] = rebuild(currentShape[key] as Record<string, unknown>)
		}
		return obj
	}

	return rebuild(shape)
}

// core/src/decode/reconstruction.ts

/**
 * Genome-optimized reconstruction - currently uses alphabetical ordering
 * to match the extraction order. The genome bitmap is available for future
 * optimization where both encode and decode use consistent genome ordering.
 */
export function reconstructObjectGenome(
	values: unknown[],
	shape: Record<string, unknown>,
): unknown {
	let valueIndex = 0
	const layoutCache = new Map<Record<string, unknown>, string[]>()

	const getLayout = (shapeObj: Record<string, unknown>): string[] => {
		let layout = layoutCache.get(shapeObj)
		if (!layout) {
			layout = Object.keys(shapeObj)
				.filter(
					(k) =>
						k !== 'type' &&
						k !== '_signature' &&
						k !== 'length' &&
						k !== 'itemShape' &&
						k !== 'itemShapes',
				)
				.sort() // Use alphabetical sort to match extractValues
			layoutCache.set(shapeObj, layout)
		}
		return layout
	}

	const rebuild = (currentShape: Record<string, unknown>): unknown => {
		const type = currentShape.type as string

		if (type !== 'object' && type !== 'array' && type !== 'homogeneous-array') {
			return values[valueIndex++]
		}

		if (type === 'homogeneous-array') {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>
			const arr = new Array(length)

			if (itemShape.type === 'object') {
				const layout = getLayout(itemShape)
				for (let i = 0; i < length; i++) {
					const obj: Record<string, unknown> = {}
					for (const key of layout) {
						obj[key] = rebuild(itemShape[key] as Record<string, unknown>)
					}
					arr[i] = obj
				}
			} else {
				for (let i = 0; i < length; i++) {
					arr[i] = rebuild(itemShape)
				}
			}
			return arr
		}

		if (type === 'array') {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			const arr = new Array(itemShapes.length)
			for (let i = 0; i < itemShapes.length; i++) {
				arr[i] = rebuild(itemShapes[i])
			}
			return arr
		}

		const layout = getLayout(currentShape)
		const obj: Record<string, unknown> = {}
		for (const key of layout) {
			obj[key] = rebuild(currentShape[key] as Record<string, unknown>)
		}
		return obj
	}

	return rebuild(shape)
}

/**
 * Compiled reconstruction - generates optimized code for specific shapes.
 */
export function reconstructObjectCompiled(
	values: unknown[],
	shape: Record<string, unknown>,
): unknown {
	const generateRebuilder = (
		currentShape: Record<string, unknown>,
		path: string = 'result',
	): string => {
		const type = currentShape.type as string

		if (type !== 'object' && type !== 'array' && type !== 'homogeneous-array') {
			return `${path} = values[valueIndex++];`
		}

		if (type === 'homogeneous-array') {
			const length = currentShape.length as number
			const itemShape = currentShape.itemShape as Record<string, unknown>

			let code = `${path} = new Array(${length});`

			if (itemShape.type === 'object') {
				const layout = Object.keys(itemShape)
					.filter((k) => k !== 'type' && k !== '_signature')
					.sort()

				code += `for (let i = 0; i < ${length}; i++) {`
				code += `${path}[i] = {};`

				for (const key of layout) {
					code += generateRebuilder(
						itemShape[key] as Record<string, unknown>,
						`${path}[i]["${key}"]`,
					)
				}

				code += `}`
			} else {
				code += `for (let i = 0; i < ${length}; i++) {`
				code += generateRebuilder(itemShape, `${path}[i]`)
				code += `}`
			}

			return code
		}

		if (type === 'array') {
			const itemShapes = currentShape.itemShapes as Record<string, unknown>[]
			let code = `${path} = new Array(${itemShapes.length});`

			for (let i = 0; i < itemShapes.length; i++) {
				code += generateRebuilder(itemShapes[i], `${path}[${i}]`)
			}

			return code
		}

		const layout = Object.keys(currentShape)
			.filter((k) => k !== 'type' && k !== '_signature')
			.sort()
		let code = `${path} = {};`

		for (const key of layout) {
			code += generateRebuilder(currentShape[key] as Record<string, unknown>, `${path}["${key}"]`)
		}

		return code
	}

	try {
		const functionBody = `
      let valueIndex = 0;
      let result;
      ${generateRebuilder(shape)}
      return result;
    `

		const compiledFn = new Function('values', functionBody) as (values: unknown[]) => unknown
		return compiledFn(values)
	} catch {
		return reconstructObjectFast(values, shape)
	}
}
