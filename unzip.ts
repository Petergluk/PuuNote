import extract from "extract-zip";
import path from "path";

async function main() {
    try {
        await extract(path.resolve(process.cwd(), "TEMP/PuuChains.zip"), { dir: path.resolve(process.cwd(), "src/plugins") });
        console.log("Extraction complete!");
    } catch (err) {
        console.error(err);
    }
}

main();
