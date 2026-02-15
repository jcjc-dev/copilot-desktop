export interface AppError {
	type: 'Network' | 'Auth' | 'Validation' | 'Internal' | 'NotFound';
	message: string;
}

export function parseAppError(error: unknown): AppError {
	if (typeof error === 'string') {
		try {
			const parsed = JSON.parse(error);
			if (parsed.type && parsed.message) return parsed as AppError;
		} catch {
			/* not JSON */
		}
		return { type: 'Internal', message: error };
	}
	if (error instanceof Error) {
		return { type: 'Internal', message: error.message };
	}
	return { type: 'Internal', message: String(error) };
}

export function isRetryable(error: AppError): boolean {
	return error.type === 'Network';
}
