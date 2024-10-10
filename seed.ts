import fs from "fs";
import csv from "csv-parser";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import sharp from "sharp";
import { trace } from "potrace";
import { writeFile } from "fs/promises";

const execAsync = promisify(exec);

interface CsvRow {
  title: string;
  logo: string;
}

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
};

const definition = `
import { IntegrationDefinition, z } from "@botpress/sdk";
import { integrationName } from "./package.json";

export default new IntegrationDefinition({
  name: integrationName,
  version: "0.0.1",
  readme: "hub.md",
  icon: "icon.svg",
  configuration: {
    schema: z.object({
      requestAccess: z.string().describe("Your Email Address"),
      yourFullName: z.string(),
      additionalMessage: z.string().optional(),
    }),
  },
});
`;

async function runCommand(command: string): Promise<void> {
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log("Command output:", stdout);
    if (stderr) {
      console.error("Command error:", stderr);
    }
  } catch (error) {
    console.error("Error executing command:", error);
  }
}

async function downloadLogo(
  url: string,
  integrationName: string
): Promise<void> {
  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
    });

    const contentType = response.headers["content-type"];
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error(
        `Invalid content-type. Expected image/* but received ${contentType}`
      );
    }

    const writer = fs.createWriteStream(`${integrationName}/logo.png`);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to download image: ${error.message}`);
    } else {
      throw error;
    }
  }
}

async function convertLogoToSvg(inputPath: string, outputPath: string) {
  try {
    const pngBuffer = await sharp(inputPath).png().toBuffer();

    trace(pngBuffer, async (err, svg) => {
      if (err) {
        console.error("Error converting to SVG: ", err);
        return;
      }

      writeFile(outputPath, svg);
      console.log(colors.green + `SVG saved to ${outputPath}`);
      await runCommand(`rm ${inputPath}`);
    });
  } catch (err) {
    console.error(colors.red + "Error processing PNG: ", err);
  }
}

async function seed(filePath: string): Promise<void> {
  const results: CsvRow[] = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data: CsvRow) => results.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  for (const row of results) {
    const integrationName = row.title.toLowerCase().replace(/\s+/g, "-");
    const command = `npx @botpress/cli@0.11.5 init --name ${integrationName} --type integration -y && cd ${integrationName} && npm i --save-dev @botpress/cli nodemon && npm i`;

    console.log(colors.green + `Processing integration: ${row.title}`);
    console.log(colors.green + `Running command: ${command}`);

    await runCommand(command);
    await downloadLogo(row.logo, integrationName);
    await convertLogoToSvg(
      `${integrationName}/logo.png`,
      `${integrationName}/icon.svg`
    );
    await runCommand(
      `echo '${definition}' > ${integrationName}/integration.definition.ts`
    );
    console.log(colors.green + `Finished processing ${row.title}\n`);
  }
}

const csvFilePath = "./services_logos.csv";
seed(csvFilePath).catch(console.error);
