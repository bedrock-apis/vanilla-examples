process.exit(0);
const ts = require("typescript");
const {downloadContent, getFiles} = require("./functions");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const branch = "preview";

const apis = new Map();
(async()=>{
    console.log("[LOADING RESOURCES] Loading vanilla resources");
    let time = Date.now();
    const content = await downloadContent(`https://raw.githubusercontent.com/bedrock-apis/bds-docs/${branch}/exist.json`);
    const info = JSON.parse(content.toString());
    const tasks = [];
    for(const key of Object.keys(info.script_modules_mapping)){
        if(!key.startsWith("@")) continue;
        const moduleInfo = info.script_modules_mapping[key];
        const vers = moduleInfo.versions.sort(compareVersions);
        const job = async (path, key)=>{
           const content = (await downloadContent(`https://raw.githubusercontent.com/bedrock-apis/bds-docs/${branch}/script_types/${path}.d.ts`)).toString();
           if(content === "404: Not Found") return;
           apis.set(key, content.toString());
        };
        const stableVersion = vers.filter(e=>!e.includes("-")).at(-1);
        const betaVersion = vers.filter(e=>e.includes("beta")).at(-1)??stableVersion;
        const alphaVersion = vers.at(-1)??vers.filter(e=>e.includes("beta")).at(-1)??betaVersion;
        tasks.push(job(`${key}_${alphaVersion}`, `${key}_alpha`));
        tasks.push(job(`${key}_${betaVersion}`, `${key}_beta`));
        tasks.push(job(`${key}_${stableVersion}`, `${key}_stable`));
    }
    await Promise.all(tasks);
    console.log("[LOADING RESOURCES] Loaded vanilla resources in",Date.now() - time,"ms");
    runDiagnostics([...getFiles("./modules")].filter(e=>e.endsWith(".ts") | e.endsWith(".js")));
})().catch(e=>process.exit(console.error(e)??1)); 



function runDiagnostics(sourceFiles) {
    const options = {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      allowJs: true,
      outDir: "./output",
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      strict: false
    };
    const host = createCompilerHost(options);
    for(const file of sourceFiles) {
        console.log("[DIAGNOSTIC] Diagnostics for ",file);
        let data = readFileSync(file).toString();
        let channel = "stable";
        if(data.startsWith("////")){
            channel = data.split("\n")[0].slice(4).replaceAll(" ","").toLowerCase();
            data = data.split("\n").slice(1).join("\n");
        }
        host.getCurrentChannel = ()=>channel;
        host.getSource = (fileName)=>{
            return file.endsWith(fileName)?data:null;
        }
        const program = ts.createProgram([file], options, host);
        console.log(program.emit().diagnostics);
    }
    //

    //ts.createSourceFile("myName.d.ts", "export class Player {};", ts.ScriptTarget.Latest);
    //ts.factory.updateSourceFile(ts.createSourceFile("myName.d.ts", "export class Player {};", ts.ScriptTarget.Latest))
    //const checker = program.getTypeChecker();
    /// do something with program..
    //console.log(program.getSourceFiles().map(e=>e.fileName).filter(e=>!e.startsWith("lib.")));
    //console.log(program.getSourceFile("C:/Users/samde/Documents/GitHub/bapi-tool/node_modules/@minecraft/server/index.d.ts"))
}
function createCompilerHost(options) {
    let object;
    return object = {
      getSourceFile,
      getDefaultLibFileName: () => "lib.es2022.d.ts",
      writeFile(fileName, content){ console.log("[ABSTRACT] - writeFile: " + fileName);},
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
      getDirectories: path => ts.sys.getDirectories(path),
      getCanonicalFileName: fileName =>
        ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
      getNewLine: () => ts.sys.newLine,
      useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
      fileExists(fileName) { return false; },
      readFile: ts.sys.readFile,
      resolveModuleNames
    };
    function getSourceFile(fileName, languageVersion, onError) {
      let sourceText
      if(fileName.startsWith("lib.") && fileName.endsWith(".d.ts")){
        path.dirname(require.resolve("typescript")) + fileName;
        sourceText = object.readFile(path.join(path.dirname(require.resolve("typescript")), fileName));
      } else if(fileName.includes("__native__")) {
        const moduleName = fileName.split("__native__")[0];
        const channel = object.getCurrentChannel?.()??"stable";
        sourceText = apis.get(moduleName+"_"+channel);
      }else{
        sourceText = object.getSource?.(fileName)??object.readFile(fileName);
      }
      return sourceText !== undefined
        ? ts.createSourceFile(fileName, sourceText, languageVersion)
        : undefined;
    }
  
    function resolveModuleNames(
      moduleNames,
      containingFile
    ) {
      const resolvedModules = [];
      for (const moduleName of moduleNames) {
        if(moduleName.startsWith("@")){
          resolvedModules.push({
            resolvedFileName: moduleName + "__native__.d.ts"
          })
          continue;
        }
        // try to use standard resolution
        let result = ts.resolveModuleName(moduleName, containingFile, options, {
          fileExists,
          readFile
        });
        if (result.resolvedModule) {
          resolvedModules.push(result.resolvedModule);
          console.log(result);
        } else {
           console.log("cant found");
        }
      }
      return resolvedModules;
    }
}

function compareVersions(ver, ver2){
    const [version1, tag1] = ver.split("-");
    const [version2, tag2] = ver2.split("-");
    let numbers1 = version1.split(".").map(Number);
    let numbers2 = version2.split(".").map(Number);
    for(let i = 0; i < numbers2.length | i < numbers1.length; i++){
        let num1 = numbers1[i]??0, num2 = numbers2[i]??0;
        if(num1 > num2) return 1;
        else if(num1 < num2) return -1;
    }
    return 0;
}