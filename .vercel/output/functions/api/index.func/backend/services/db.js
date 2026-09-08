const { MongoClient } = require("mongodb");

let client;
let database;

async function getDb() {
	if (database) return database;

	const uri = process.env.MONGODB_URI;
	const databaseName = process.env.MONGODB_DB || "fora-do-site";

	if (!uri) {
		throw new Error("Configure MONGODB_URI no ambiente do servidor.");
	}

	client = new MongoClient(uri);
	await client.connect();
	database = client.db(databaseName);
	return database;
}

async function collection(name) {
	return (await getDb()).collection(name);
}

async function closeDb() {
	if (client) await client.close();
	client = undefined;
	database = undefined;
}

module.exports = { getDb, collection, closeDb };