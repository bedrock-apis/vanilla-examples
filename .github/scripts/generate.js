const fs = require("node:fs");
const {getFiles} = require("./functions");

const bypass = process.argv[2] === "--bypass";
if(!bypass && !fs.existsSync("./contents.json")) {
    console.error("Console Missing Generated Contents");
    process.exit(1);
}

const contents = [...getFiles(".")].filter(e=>
    !e.startsWith("./.git/") &&
    !e.startsWith("./node_modules/") &&
    !e.endsWith("package-lock.json")
);
const content = {
    contents,
    modules: contents.filter(e=>e.startsWith("./modules")).map(e=>e.slice(10))
};

const newData = JSON.stringify(content, null, 4);
if(!bypass){
    const data = fs.readFileSync("./contents.json");
    if(newData !== data) {
        console.error("Contents are not up to date!");
        process.exit(1);
    }
}
fs.writeFileSync("./contents.json",newData);