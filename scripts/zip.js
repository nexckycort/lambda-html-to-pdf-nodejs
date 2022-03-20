const fse = require("fs-extra");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { spawn } = require("child_process");

function zipDirectory(source, output) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(output);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => {
      console.info(archive.pointer() / 1048576 + " total megabytes");
      resolve();
    });
    archive.finalize();
  });
}

async function removePrevious(source) {
  const action = {
    async directory() {
      console.info("remove previous directory...");
      await fse.remove(path.join(__dirname, "..", "lambda"));
    },
    async zip() {
      console.info("remove previous zip...");
      await fse.remove(path.join(__dirname, "..", "lambda.zip"));
    },
    async all() {
      console.info("remove previous directory and zip...");
      await fse.remove(path.join(__dirname, "..", "lambda"));
      await fse.remove(path.join(__dirname, "..", "lambda.zip"));
    },
  };
  await action[source]();
}

async function copyNecessaryFiles() {
  console.info("copy necessary files...");

  const sourceBase = path.join(__dirname, "..");

  const sourceDist = path.join(sourceBase, "dist");
  const destinationDist = path.join(__dirname, "..", "lambda");
  await fse.copy(sourceDist, destinationDist);

  const sourcePackage = path.join(sourceBase, "package.json");
  const destinationPackage = path.join(destinationDist, "package.json");
  await fse.copyFile(sourcePackage, destinationPackage);
}

function editPackage() {
  console.info("editing package.json...");
  const projectRoot = path.join(__dirname, "..", "lambda", "package.json");
  let packageJSON = fse.readJSONSync(projectRoot);
  const name = packageJSON.name;
  const version = packageJSON.version;
  const author = packageJSON.author;
  const dependencies = packageJSON.dependencies;
  packageJSON = {
    name,
    version,
    author,
    dependencies,
  };

  fse.writeFileSync(projectRoot, JSON.stringify(packageJSON, null, "  "));
}

function installPackage() {
  console.info("installing packages...");
  return new Promise((res) => {
    const installingPackages = spawn("cd lambda && npm i", {
      shell: true,
    });
    installingPackages.stdout.on("data", function (data) {
      console.info(data.toString());
    });

    installingPackages.stderr.on("data", function (data) {
      console.info(data.toString());
    });

    installingPackages.on("exit", async function (_code) {
      await fse.remove(
        path.join(__dirname, "..", "lambda", "package-lock.json")
      );
      console.log("installed packages");
      res();
    });
  });
}

async function lambdaToZip() {
  console.info("compressing lambda to zip...");
  const sourceLambda = path.join(__dirname, "../lambda/");
  const destinationLambda = path.join(__dirname, "..", "lambda.zip");
  await zipDirectory(sourceLambda, destinationLambda);
}

async function main() {
  await removePrevious("all");
  await copyNecessaryFiles();
  editPackage();
  await installPackage();
  await lambdaToZip();
  await removePrevious("directory");
}

main();
