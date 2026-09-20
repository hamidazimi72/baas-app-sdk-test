import type { NextRequest } from 'next/server';

import { AUTH_PATH, handleLogin, handleLogout, handleSessionProfile, handleVerifyOtp } from '../../_lib/auth';
import { proxyRequest } from '../../_lib/proxy';

const route = async (request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => {
	const { path } = await ctx.params;
	const joinedPath = path.join('/');
	let response: Response;

	if (joinedPath === AUTH_PATH.login) response = await handleLogin(request, joinedPath);
	else if (joinedPath === AUTH_PATH.verifyOtp) response = await handleVerifyOtp(request, joinedPath);
	else if (joinedPath === AUTH_PATH.logout) response = await handleLogout(request, joinedPath);
	else if (joinedPath === AUTH_PATH.me) response = await handleSessionProfile(request);
	else response = await proxyRequest(request, joinedPath);

	response.headers.set('Cache-Control', 'private, no-store, max-age=0');
	response.headers.set('Expires', '0');
	return response;
};

export { route as DELETE, route as GET, route as HEAD, route as OPTIONS, route as PATCH, route as POST, route as PUT };
