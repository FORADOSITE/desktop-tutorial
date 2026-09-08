const { verifyToken } = require("@clerk/backend");

async function getAuthenticatedUserId(req) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token || !process.env.CLERK_SECRET_KEY) return null;

    try {
        const claims = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        return claims.sub || null;
    } catch (error) {
        console.error("Falha ao validar token Clerk:", error.message);
        return null;
    }
}

module.exports = { getAuthenticatedUserId };