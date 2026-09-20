class OAuthError extends Error {
    constructor(code, description, uri) {
        super(description || code);
        this.name = "OAuthError";
        this.code = code;
        this.description = description;
        this.uri = uri;
        Object.setPrototypeOf(this, OAuthError.prototype);
    }
}
class AuthSdk {
    constructor(core) {
        if (!core) {
            throw new Error("AuthSdk requires a CoreSdk instance.");
        }
        if (typeof core.request !== "function") {
            throw new Error("Invalid CoreSdk instance: missing request method.");
        }
        this.core = core;
    }
    async getAuthHeader() {
        const token = await this.core.getAuthToken();
        return { Authorization: token ? `Bearer ${token}` : "" };
    }
    async getInstallationTokenHeader() {
        return { Authorization: `Bearer ${await this.core.ensureInstallationToken()}` };
    }
    async saveTokenFromResponse(response) {
        if (response?.data?.token) {
            await this.core.setAuthToken(response.data.token);
        }
    }
    getOAuthCode(url, provider) {
        const state = url.searchParams.get("state");
        const storedState = sessionStorage.getItem(`${provider}_oauth_state`);
        if (!storedState || state !== storedState) {
            throw new OAuthError("invalid_state", "Invalid OAuth state.");
        }
        const error = url.searchParams.get("error");
        if (error) {
            throw new OAuthError(error, url.searchParams.get("error_description") ?? undefined, url.searchParams.get("error_uri") ?? undefined);
        }
        const code = url.searchParams.get("code");
        if (!code) {
            throw new OAuthError("authorization_code_missing", "Authorization code is missing.");
        }
        return code;
    }
    // OAuth with google
    signInWithGoogle(clientId, redirectUri) {
        const state = `google_${crypto.randomUUID()}`;
        sessionStorage.setItem(`google_oauth_state`, state);
        const params = new URLSearchParams({
            response_type: "code",
            scope: "openid email",
            client_id: clientId,
            redirect_uri: redirectUri,
            state,
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        window.location.href = authUrl;
    }
    async handleGoogleCallback(clientId, clientSecret, redirectUri) {
        const url = new URL(window.location.href);
        const code = this.getOAuthCode(url, "google");
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/google",
            headers: await this.getInstallationTokenHeader(),
            body: {
                code,
                googleClientId: clientId,
                googleClientSecret: clientSecret,
                redirectUri,
            },
        });
        if (response.success) {
            sessionStorage.removeItem(`google_oauth_state`);
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState(null, "", cleanUrl);
        }
        await this.saveTokenFromResponse(response);
        return response;
    }
    // OAuth with my gov
    signInWithMyGov(redirectUri) {
        const state = `myGov_${redirectUri.trim()}`;
        // const state = `myGov_${crypto.randomUUID()}`;
        sessionStorage.setItem(`myGov_oauth_state`, state);
        const params = new URLSearchParams({
            response_type: "code",
            scope: "openid profile",
            client_id: "xmbaas.ir",
            redirect_uri: "https://xmbaas.ir/dolatman-callback",
            state,
        });
        const authUrl = `https://sso.my.gov.ir/oauth2/authorize?${params.toString()}`;
        window.location.href = authUrl;
    }
    async handleMyGovCallback() {
        const url = new URL(window.location.href);
        const code = this.getOAuthCode(url, "myGov");
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/my-gov",
            headers: await this.getInstallationTokenHeader(),
            body: {
                code,
            },
        });
        if (response.success) {
            sessionStorage.removeItem(`myGov_oauth_state`);
            const url = new URL(window.location.href);
            ["code", "state"].forEach((param) => {
                url.searchParams.delete(param);
            });
            window.history.replaceState(null, "", url.toString());
        }
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Register with phone - Send Otp
    async registerPhoneSendOtp(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/phone/register/send-otp",
            headers: await this.getInstallationTokenHeader(),
            body: { ...payload },
        });
    }
    // Register with phone - Verify Otp
    async registerPhoneVerifyOtp(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/phone/register/verify",
            headers: await this.getInstallationTokenHeader(),
            body: {
                // ...(await this.getDeviceIdBody()),d
                ...payload,
            },
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Register with email - Send Otp
    async registerEmailSendOtp(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/register/send-otp",
            headers: await this.getInstallationTokenHeader(),
            body: { ...payload },
        });
    }
    // Register with email - Verify Otp
    async registerEmailVerifyOtp(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/register/verify",
            headers: await this.getInstallationTokenHeader(),
            body: {
                // ...(await this.getDeviceIdBody()),
                ...payload,
            },
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Login with phone - Send Otp
    async loginPhoneSendOtp(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/phone/login/send-otp",
            headers: await this.getInstallationTokenHeader(),
            body: { ...payload },
        });
    }
    // Login with phone - Verify Otp
    async loginPhoneVerifyOtp(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/phone/login/verify",
            headers: await this.getInstallationTokenHeader(),
            body: {
                // ...(await this.getDeviceIdBody()),
                ...payload,
            },
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Login with email - Send Otp
    async loginEmailSendOtp(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/login/send-otp",
            headers: await this.getInstallationTokenHeader(),
            body: { ...payload },
        });
    }
    // Login with email - Verify Otp
    async loginEmailVerifyOtp(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/login/verify",
            headers: await this.getInstallationTokenHeader(),
            body: {
                // ...(await this.getDeviceIdBody()),
                ...payload,
            },
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Login anonymous
    async loginAnonymous(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/anonymous",
            headers: await this.getInstallationTokenHeader(),
            body: {
                // ...(await this.getDeviceIdBody()),
                ...payload,
            },
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Login with My gov
    async loginMyGov(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/my-gov",
            headers: await this.getInstallationTokenHeader(),
            body: {
                // ...(await this.getDeviceIdBody()),
                ...payload,
            },
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
    // Logout
    async logout() {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/session/logout",
            headers: await this.getAuthHeader(),
        });
        if (response?.success) {
            await this.core.clearAuthToken();
        }
        return response;
    }
    // Fetch all sessions
    async fetchAllSessions() {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/session/tokens",
            headers: await this.getAuthHeader(),
        });
    }
    // Revoke token
    async revokeToken(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/session/tokens/revoke",
            headers: await this.getAuthHeader(),
            body: { tokenId: payload?.tokenId },
        });
    }
    // Fetch user profile
    async fetchUser() {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/profile/get",
            headers: await this.getAuthHeader(),
        });
    }
    // Update user profile
    async updateUser(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/profile/update",
            headers: await this.getAuthHeader(),
            body: { ...payload },
        });
    }
    // Reset password - Send Otp
    async resetPasswordSendOtp(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/reset/password/sent-otp",
            headers: await this.getInstallationTokenHeader(),
            body: { ...payload },
        });
    }
    // Reset password - Verify Otp
    async resetPasswordVerifyOtp(payload) {
        return this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/reset/password/verify",
            headers: await this.getInstallationTokenHeader(),
            body: { ...payload },
        });
    }
    // Convert User By Email - Send Otp
    async convertUserByEmailSendOtp(payload) {
        return this.registerEmailSendOtp({ ...payload });
    }
    async convertUserByEmailVerifyOtp(payload) {
        const response = await this.core.request({
            method: "POST",
            url: ":8060/api/v1/auth/email/convert/user",
            body: {
                ...payload,
            },
            headers: await this.getAuthHeader(),
        });
        await this.saveTokenFromResponse(response);
        return response;
    }
}

export { AuthSdk, OAuthError };
