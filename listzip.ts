import JSZip from "jszip";
import fs from "fs";
import path from "path";

async function main() {
    const data = fs.readFileSync(path.resolve(process.cwd(), "TEMP/PuuChains.zip"));
    const zip = await JSZip.loadAsync(data);
    Object.keys(zip.files).forEach(filename => {
        console.log(filename);
    });
}
main();
