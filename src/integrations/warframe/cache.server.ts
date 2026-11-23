export function createTimedLookup<Key, Value>(
	load: (key: Key) => Promise<Value>,
	freshFor: number,
	retryAfter: number,
) {
	const cached = new Map<Key, { value: Value | null; expiresAt: number }>();
	const pending = new Map<Key, Promise<Value | null>>();

	return (key: Key): Promise<Value | null> => {
		const entry = cached.get(key);
		if (entry && entry.expiresAt > Date.now())
			return Promise.resolve(entry.value);
		const request = pending.get(key);
		if (request) return request;

		const next = load(key)
			.then(
				(value) => ({ value, expiresAt: Date.now() + freshFor }),
				() => ({ value: null, expiresAt: Date.now() + retryAfter }),
			)
			.then((result) => {
				cached.set(key, result);
				return result.value;
			})
			.finally(() => pending.delete(key));
		pending.set(key, next);
		return next;
	};
}
