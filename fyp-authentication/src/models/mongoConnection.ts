import { MongoClient, MongoError } from "mongodb";

export default class MongoConnection {
  client: MongoClient;
  error: MongoError;

  async init() {
    const connection = await MongoClient.connect(process.env.DB_URL).catch(
      (err: MongoError) => {
        this.error = err;
      }
    );

    if (connection instanceof MongoClient) {
      this.client = connection;
    }
  }

  async connect(db: string, collection: string) {
    const connection = this.client.db(db).collection(collection);
    return connection;
  }
}
