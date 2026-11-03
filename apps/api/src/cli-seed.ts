import path from "node:path";
import { AgroPlatformService } from "./platform.service.js";

const dbFile = path.resolve(process.cwd(), "dev-store.json");
const service = new AgroPlatformService(undefined, dbFile);
console.log(
  JSON.stringify({
    level: "info",
    msg: "Seeded 3 DEMO schemes (flagged isMock=true) and Karnataka reference locations",
    schemes: service.listAllSchemeVersions().map((s) => ({
      code: s.schemeCode,
      isMock: s.isMock,
      status: s.status,
    })),
  })
);
