import path from "node:path";
import { AgroPlatformService } from "./platform.service.js";
import { createApiServer } from "./server.js";

const storeFile = path.join(process.cwd(), "data", "agro-store.json");
const platform = new AgroPlatformService(undefined, storeFile);
const { server } = createApiServer(platform);

server.listen(platform.config.PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Agro AI Scheme API server listening with real-time persistence",
      port: platform.config.PORT,
      storeFile,
      docsUrl: `http://localhost:${platform.config.PORT}/docs`,
    })
  );
});
