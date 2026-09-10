const server = require("../backend/server");

module.exports = (request, response) => {
    const originalUrl = request.url || "/";
    if (!originalUrl.startsWith("/api")) {
        request.url = `/api${originalUrl}`;
    }
    server.emit("request", request, response);
};