const fs = require("node:fs");

function * readDir(path){
    for(const entry of fs.readdirSync(path, {withFileTypes: true}))
        if(entry.isFile()) yield path + "/" + entry.name;
        else if(entry.isDirectory()) yield * readDir(path + "/" + entry.name);
}
[...readDir(".")].forEach(e=>console.log(e));
fs.writeFileSync("contents.json", JSON.stringify(
    {
        date: Date.now(),
        contents: [...readDir(".")].filter(e=>!e.startsWith("./.git/")).map(e=>e.startsWith("./")?e.slice(2):e),
        modules: [...readDir("modules")].filter(e=>e.endsWith(".json")).map(e=>e.startsWith("./")?e.slice(2):e)
    },
null, "   "))