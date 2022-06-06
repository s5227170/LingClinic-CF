import { MongoClient, MongoError } from "mongodb";

export default class MongoConnection {
  client: MongoClient;
  error: MongoError | null;

  constructor() {
    this.client = new MongoClient(process.env.DB_URL as string);
    this.error = null;
  }

  async init() {
    const connection = await this.client.connect().catch((err: MongoError) => {
      this.error = err;
    });

    if (connection instanceof MongoClient) {
      this.client = connection;
    }
  }

  async connect(db: string, collection: string) {
    const connection = this.client.db(db).collection(collection);
    return connection;
  }

  async close() {
    this.client.close();
  }
}
