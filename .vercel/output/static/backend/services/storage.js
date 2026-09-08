const { GridFSBucket, ObjectId } = require("mongodb");
const { getDb } = require("./db");

async function getBucket() {
    return new GridFSBucket(await getDb(), { bucketName: "uploads" });
}

async function uploadBuffer(buffer, filename, contentType) {
    const bucket = await getBucket();
    return new Promise((resolve, reject) => {
        const upload = bucket.openUploadStream(filename, { metadata: { contentType } });
        upload.on("error", reject);
        upload.on("finish", () => resolve(upload.id.toString()));
        upload.end(buffer);
    });
}

async function streamFile(id, response) {
    if (!ObjectId.isValid(id)) return false;
    const bucket = await getBucket();
    const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
    if (!files[0]) return false;

    response.type(files[0].metadata?.contentType || "application/octet-stream");
    bucket.openDownloadStream(files[0]._id).pipe(response);
    return true;
}

module.exports = { uploadBuffer, streamFile };
