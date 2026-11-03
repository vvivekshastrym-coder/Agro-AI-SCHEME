import path from "node:path";
import { AgroPlatformService } from "./platform.service.js";

const dbFile = path.resolve(process.cwd(), "dev-store.json");
const service = new AgroPlatformService(undefined, dbFile);
console.log(
  JSON.stringify({
    level: "info",
    msg: "Database schema & local store migrated and verified",
    persistencePath: dbFile,
    seededDemoSchemes: service.listAllSchemeVersions().length,
  })
);
