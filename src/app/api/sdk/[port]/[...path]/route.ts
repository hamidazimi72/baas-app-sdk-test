const route = () =>
	Response.json(
		{ success: false, message: 'SDK proxy is disabled. Use the configured service URL directly.' },
		{ status: 410 },
	);

export { route as DELETE, route as GET, route as HEAD, route as OPTIONS, route as PATCH, route as POST, route as PUT };
