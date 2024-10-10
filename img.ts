import sharp from "sharp";
import { trace } from "potrace";
import { promises as fs } from "fs";

// Function to convert PNG to SVG
async function convertPngToSvg(inputPath, outputPath) {
  try {
    // Use sharp to process the PNG image
    const pngBuffer = await sharp(inputPath).png().toBuffer();

    // Trace the PNG to SVG using Potrace
    trace(pngBuffer, async (err, svg) => {
      if (err) {
        console.error("Error converting to SVG: ", err);
        return;
      }

      // Write the SVG data to the output file
      await fs.writeFile(outputPath, svg);
      console.log(`SVG saved to ${outputPath}`);
    });
  } catch (err) {
    console.error("Error processing PNG: ", err);
  }
}

// Example usage
const inputPng = "./logo.png";
const outputSvg = "./output.svg";

convertPngToSvg(inputPng, outputSvg);
