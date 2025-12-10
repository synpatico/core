interface LRUNode<K, V> {
	key: K
	value: V
	prev: LRUNode<K, V> | null
	next: LRUNode<K, V> | null
}

export interface LRUCache<K, V> {
	get(key: K): V | undefined
	set(key: K, value: V): void
	has(key: K): boolean
	delete(key: K): boolean
	clear(): void
	readonly size: number
}

export function createLRUCache<K, V>(maxSize: number): LRUCache<K, V> {
	const map = new Map<K, LRUNode<K, V>>()

	const head = {
		key: null as unknown as K,
		value: null as unknown as V,
		prev: null,
		next: null,
	} as LRUNode<K, V>
	const tail = {
		key: null as unknown as K,
		value: null as unknown as V,
		prev: head,
		next: null,
	} as LRUNode<K, V>
	head.next = tail

	function moveToFront(node: LRUNode<K, V>) {
		node.prev!.next = node.next
		node.next!.prev = node.prev

		node.next = head.next
		node.prev = head
		head.next!.prev = node
		head.next = node
	}

	function removeLast(): K | null {
		if (tail.prev === head) return null
		const node = tail.prev!
		node.prev!.next = tail
		tail.prev = node.prev
		return node.key
	}

	return {
		get(key: K): V | undefined {
			const node = map.get(key)
			if (!node) return undefined
			moveToFront(node)
			return node.value
		},

		set(key: K, value: V) {
			const existing = map.get(key)
			if (existing) {
				existing.value = value
				moveToFront(existing)
				return
			}

			if (map.size >= maxSize) {
				const evictedKey = removeLast()
				if (evictedKey !== null) map.delete(evictedKey)
			}

			const node: LRUNode<K, V> = { key, value, prev: null, next: null }
			map.set(key, node)
			moveToFront(node)
		},

		has: (key: K) => map.has(key),

		delete(key: K) {
			const node = map.get(key)
			if (!node) return false
			node.prev!.next = node.next
			node.next!.prev = node.prev
			map.delete(key)
			return true
		},

		clear() {
			map.clear()
			head.next = tail
			tail.prev = head
		},

		get size() {
			return map.size
		},
	}
}
