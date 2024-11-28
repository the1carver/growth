#!/usr/bin/env node

const ngrok = require("ngrok");
const axios = require("axios");
const portfinder = require("portfinder");
const { spawn } = require("child_process");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load the parent project's .env file
try {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} catch (e) {
  console.error("⚠️ No .env file found in the parent directory ⚠️");
  process.exit(1);
}

// Check for required environment variables
if (!process.env.PAT) {
  console.error(
    "⚠️ Missing required environment variables - PAT ⚠️ \n Get your PAT from https://app.botpress.cloud/profile/settings"
  );
  process.exit(1);
}

if (!process.env.WORKSPACE_ID) {
  console.error(
    "⚠️ Missing required environment variables - WORKSPACE_ID ⚠️ \n Get your WORKSPACE_ID from the url of your workspace"
  );
  process.exit(1);
}

const axiosClient = axios.create({
  baseURL: "https://api.botpress.cloud/v1/admin/",
  headers: {
    Authorization: `Bearer ${process.env.PAT}`,
    "x-workspace-id": process.env.WORKSPACE_ID,
  },
});

const getIntegrationId = async (integrationName) => {
  const response = await axiosClient.get("/integrations");
  const integrataions = response.data.integrations;

  const integration = integrataions.find((integration) => {
    return integration.name.split("/")[1] === integrationName;
  });

  if (!integration) {
    throw new Error("⚠️ Integration not found ⚠️");
  }

  return integration.id;
};

const updateIntegrationUrl = async (id, url) => {
  await axiosClient.put(`/integrations/${id}`, { url });
};

const start = async () => {
  const PORT = await portfinder.getPortPromise();

  // Pipe port to public URL using ngrok
  const url = await ngrok.connect(PORT);

  // Run Botpress dev locally
  const childProcess = spawn("bp", [
    "dev",
    "--port",
    PORT,
    "--workspaceId",
    process.env.WORKSPACE_ID,
    "--token",
    process.env.PAT,
  ]);

  // Stream output to the primary process
  childProcess.stdout.on("data", (data) => {
    console.log(`${data.toString()}`);
  });

  childProcess.stderr.on("data", (data) => {
    console.error(`${data.toString()}`);
  });

  const rootPackageJson = path.resolve(process.cwd(), "./package.json");
  const data = fs.readFileSync(rootPackageJson, "utf8");

  const integrationName = JSON.parse(data).integrationName;

  // Update the integration URL
  const id = await getIntegrationId(integrationName);
  await updateIntegrationUrl(id, url);

  setTimeout(async () => {
    const targetURL = `https://app.botpress.cloud/workspaces/${process.env.WORKSPACE_ID}/integrations/${id}`;
    (async () => {
      const boxen = (await import('boxen')).default;
      const title = 'Your integration is now built and running!';
      content = `
 > Head over to the following URL to install and start using your integration:
    👉 [ ${targetURL} ]

 > Changes will trigger hot reloading automatically.
      `;
      console.log(
        boxen(
          content,
          { 
            title,
            titleAlignment: 'center',
            borderColor: 'cyan',
            padding: 1,
          }
        )
      );
    })();
  }, 3500);
};

start();
