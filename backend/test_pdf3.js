const pdfParse = require('pdf-parse');
const fs = require('fs');

async function run() {
    try {
        const fakeBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Title (Test PDF)\n>>\nendobj\n");
        // Try calling the module directly (sometimes it's a function despite the keys)
        let func = typeof pdfParse === 'function' ? pdfParse : pdfParse.PDFParse;
        if (!func) {
            console.log("No parser function found");
            return;
        }
        const data = await func(fakeBuffer);
        console.log("Success!", data.text);
    } catch(err) {
        console.error("Error:", err.message);
    }
}
run();
