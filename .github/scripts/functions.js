const fs = require("node:fs");
const {Buffer} = require("node:buffer")
function * getFiles(path, recursive = true){
    for(const entry of fs.readdirSync(path, {withFileTypes: true}))
        if(entry.isFile()) yield path + "/" + entry.name;
        else if(entry.isDirectory() && recursive) yield * getFiles(path + "/" + entry.name, recursive);
}
async function downloadContent(url, headers = {}) {
    return Buffer.from(
        await (await fetch(url, { headers, method: 'GET' })).arrayBuffer()
    );
}
module.exports = {
    getFiles,
    downloadContent
}