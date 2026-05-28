import { Module, Global } from "@nestjs/common";
import { MongoClient, Db } from "mongodb";

@Global()
@Module({
  providers: [
    {
      provide: "DATABASE_CLIENT",
      useFactory: async () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is required");
        return new MongoClient(uri).connect();
      },
    },
    {
      provide: "DATABASE_CONNECTION",
      useFactory: async (client: MongoClient): Promise<Db> => {
        return client.db(process.env.MONGODB_DB_NAME || "proofplay_xcup");
      },
      inject: ["DATABASE_CLIENT"],
    },
  ],
  exports: ["DATABASE_CONNECTION"],
})
export class DatabaseModule {}
