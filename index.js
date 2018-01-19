const Path = require("path");
const fs = require("fs");
const cp = require("child_process");
const walkDependencies = require("@raydeck/walk-dependencies");
const spawnOptions = { stdio: "inherit" };
const yarnif = require("yarnif");
function subRunner(package, key) {
  const cmd = package && package.makeApp && ma.package.makeApp[key];
  runFromCommand(cmd);
}
function runFromCommand(cmd) {
  if (!cmd) return;
  if (cmd) {
    if (typeof cmd == "string") {
      cp.execSync(cmd, spawnOptions);
    } else {
      spawnSync(cmd.command, cmd.args, spawnOptions);
    }
  }
}

function buildApp(packageName, target, args) {
  //assume packagename is in my dependencies or is the current package
  const fullTargetPath = Path.join(process.cwd(), target);
  if (fs.existsSync(fullTargetPath)) {
    throw fullTargetPath + " already exists";
  }
  const defaultPackage = require(Path.join(__dirname, "package.json"));
  var ma = defaultPackage.makeApp;
  var depths = {};
  walkDependencies(packageName, true, (path, package, ancestors) => {
    const thisma = package.makeApp;
    if (!thisma) return;
    depth = ancestors ? ancestors.length : 0;
    arrays: [""];
    objects: [""];
    Object.keys(thisma).forEach(key => {
      const v = thisma[key];
      if (arrays.indexOf[key] > -1) {
        if (!ma[key]) ma[key] = [];
        ma[key].append(v);
      } else if (objects.indexOf[key] > -1) {
        if (!ma[key]) ma[key] = {};
        ma[key] = v;
      } else if (!ma[key] || !depth || (depths[key] && depths[key] > depth)) {
        ma[key] = v;
      }
    });
  });
  //First create the package. Do you have a creation option for me, or do I do this
  if (ma.initializer) {
    if (typeof ma.initializer == "string") {
      ma.initializer = {
        command: ma.initializer,
        args: null
      };
    }
    spawnSync(
      ma.initializer.command,
      [...ma.initializer.args, target],
      spawnOptions
    );
  } else {
    throw { message: "Could not get an initializer", obj: ma };
  }
  process.chdir(target);
  //All following code will run from the newly created app as CWD
  Object.keys(ma.dependencies).forEach(k => {
    const v = ma.dependencies[k];
    yarnif.addDependency(v);
  });
  Object.keys(ma.devDependencies).forEach(k => {
    const v = ma.devDependencies[k];
    yarnif.addDevDependency(v);
  });
  const packageObj = require(Path.resolve(packageName, "package.json"));
  walkDependencies(process.cwd(), true, (path, package, ancestors) => {
    const scripts = package && package.makeApp && package.makeApp.scripts;
    Object.keys(scripts).forEach(k => {
      packageObj.scripts = packageObj.scripts || {};
      packageObj.scripts[k] = scripts[k];
    });
  });
  yarnif.addDependency("make-app");
  return process.cwd();
}
function initApp() {
  //Find the subrunners
  walkDependencies(process.cwd(), true, (path, package, ancestors) => {
    subRunner(package, "runEarly");
  });
  /*
    Possible recursive copy code goes here
    const rc = require('recursive-copy');
  */

  walkDependencies(process.cwd(), true, (path, package, ancestors) => {
    subRunner(package, "run");
  });
  walkDependencies(process.cwd(), true, (path, package, ancestors) => {
    subRunner(package, "runLate");
  });
  walkDependencies(process.cwd(), true, (path, package, ancestors) => {
    subRunner(package, "runLast");
  });
  return true;
}
module.exports = {
  build: buildApp,
  init: initApp
};
