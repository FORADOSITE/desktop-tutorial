const { MongoClient, GridFSBucket } = require("mongodb");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || "fora-do-site";

if (!supabaseUrl || !supabaseKey || !mongoUri) {
    throw new Error("Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e MONGODB_URI antes da migração.");
}

const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
};

async function supabaseRequest(path, options = {}) {
    const response = await fetch(`${supabaseUrl}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
    return response;
}

async function readTable(table) {
    const response = await supabaseRequest(`/rest/v1/${table}?select=*`);
    return response.json();
}

async function listObjects(bucket, prefix = "") {
    const response = await supabaseRequest(`/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
    });
    const entries = await response.json();
    const files = [];
    for (const entry of entries) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id) files.push(path);
        else files.push(...await listObjects(bucket, path));
    }
    return files;
}

async function uploadGridFile(bucket, filePath, gridfs) {
    const response = await supabaseRequest(`/storage/v1/object/authenticated/${bucket}/${filePath}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    return new Promise((resolve, reject) => {
        const upload = gridfs.openUploadStream(`${bucket}/${filePath}`, {
            metadata: { contentType, sourceBucket: bucket, sourcePath: filePath },
        });
        upload.on("error", reject);
        upload.on("finish", () => resolve(upload.id.toString()));
        upload.end(buffer);
    });
}

function storageReference(bucket, reference) {
    if (!reference) return null;
    if (!reference.startsWith("http")) return `${bucket}/${reference}`;

    const marker = `/object/`;
    const markerIndex = reference.indexOf(marker);
    if (markerIndex === -1) return null;
    const path = reference.slice(markerIndex + marker.length).split("/");
    path.shift();
    return `${bucket}/${path.join("/")}`;
}

async function run() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const database = client.db(mongoDbName);
    const gridfs = new GridFSBucket(database, { bucketName: "uploads" });

    const tableNames = ["usuarios", "redes_sociais", "beats", "todos"];
    const tables = {};
    for (const tableName of tableNames) {
        tables[tableName] = await readTable(tableName);
        if (tables[tableName].length) {
            await database.collection(tableName).deleteMany({});
            await database.collection(tableName).insertMany(tables[tableName]);
        }
        console.log(`Tabela ${tableName}: ${tables[tableName].length} registros migrados.`);
    }

    const references = new Map();
    const filesByBucket = new Map();
    for (const bucket of ["documentos-identidade", "avatars", "capa", "previews"]) {
        const files = await listObjects(bucket);
        filesByBucket.set(bucket, files);
        for (const filePath of files) {
            const id = await uploadGridFile(bucket, filePath, gridfs);
            references.set(`${bucket}/${filePath}`, id);
            console.log(`Arquivo migrado: ${bucket}/${filePath}`);
        }
    }

    const usuarios = database.collection("usuarios");
    for (const usuario of await usuarios.find({}).toArray()) {
        const updates = {};
        if (usuario.documento_identidade_path) {
            updates.documento_identidade_id = references.get(storageReference("documentos-identidade", usuario.documento_identidade_path));
        }
        if (usuario.image_perfil) {
            updates.image_perfil = references.get(storageReference("avatars", usuario.image_perfil));
        }
        if (Object.keys(updates).length) await usuarios.updateOne({ _id: usuario._id }, { $set: updates });
    }

    const beats = database.collection("beats");
    for (const registro of await beats.find({}).toArray()) {
        const atualizados = { ...(registro.beats || {}) };
        for (const value of Object.values(atualizados)) {
            if (value[3]) value[3] = references.get(storageReference("capa", value[3])) || value[3];
            if (value[4]) value[4] = references.get(storageReference("previews", value[4])) || value[4];
        }
        await beats.updateOne({ _id: registro._id }, { $set: { beats: atualizados } });
    }

    await client.close();
    console.log("Migração concluída.");
}

run().catch((error) => {
    console.error(`Migração interrompida: ${error.message}`);
    process.exitCode = 1;
});
