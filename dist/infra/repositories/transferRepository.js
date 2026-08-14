import { MongoClient } from "mongodb";
export class TransferRepository {
    constructor() {
        this.hasConnected = false;
        const uri = process.env.MONGO_URL ?? process.env.MONGO_URI ?? "mongodb://localhost:27017/indexflow";
        const dbName = process.env.MONGO_DB ?? "indexflow";
        this.client = new MongoClient(uri);
        this.collection = this.client.db(dbName).collection("transfers");
    }
    async ensureConnected() {
        if (this.hasConnected)
            return;
        await this.client.connect();
        this.hasConnected = true;
    }
    async getRecent(count = 50) {
        await this.ensureConnected();
        const docs = await this.collection
            .find({})
            .sort({ blockNumber: -1 })
            .limit(count)
            .toArray();
        // IMPORTANT: DO NOT validate response with Zod!
        return docs.map((doc) => {
            const { _id, ...rest } = doc;
            void _id;
            return rest;
        });
    }
}
export const transferRepository = new TransferRepository();
