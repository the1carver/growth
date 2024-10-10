import fs from "fs";
import csv from "csv-parser";
import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import path from "path";

const execAsync = promisify(exec);

interface CsvRow {
  title: string;
  logo: string;
}

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

async function downloadLogo(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch logo: ${response.statusText}`);
  const buffer = await response.buffer();
  fs.writeFile(destPath, buffer);
  console.log(`Logo downloaded and saved to ${destPath}`);
}

async function processCSV(filePath: string): Promise<void> {
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
    const template = "empty-integration"; // You can change this to 'hello-world' or 'webhook-message' if needed
    const command = `npx @botpress/cli@0.11.5 init --name ${integrationName} --type integration --template ${template}`;

    console.log(`Processing integration: ${row.title}`);
    console.log(`Running command: ${command}`);

    await runCommand(command);

    // Change directory to the newly created integration folder
    process.chdir(integrationName);

    // Install dependencies
    await runCommand("npm i --save-dev @botpress/cli nodemon && npm i");

    // Download and save the logo
    const logoPath = path.join(process.cwd(), "logo.png");
    await downloadLogo(row.logo, logoPath);

    // Change back to the parent directory
    process.chdir("..");

    console.log(`Finished processing ${row.title}\n`);
  }
}

const csvFilePath = "path/to/your/csvfile.csv"; // Update this with the actual path to your CSV file
processCSV(csvFilePath).catch(console.error);
