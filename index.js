const Path = require("path");
const fs = require("fs");
const cp = require("child_process");
const walkDependencies = require("@raydeck/walk-dependencies");

getSpawnOptions = function() {
  return {
    stdio: "inherit",
    env: {
      ...process.env,
      path:
        process.path + ";" + Path.join(process.cwd(), "node_modules", ".bin")
    }
  };
};
const yarnif = require("yarnif");
function subRunner(package, key) {
  const cmd = package && package.makeApp && package.makeApp[key];
  runFromCommand(cmd);
}
function runFromCommand(cmd) {
  if (!cmd) return;
  if (cmd) {
    if (typeof cmd == "string") {
      console.log("running command", cmd);
      cp.execSync(cmd, getSpawnOptions());
    } else if (cmd.length) {
      cmd.forEach(v => {
        runFromCommand(v);
      });
    } else {
      console.log("Spawning command", cmd);
      cp.spawnSync(cmd.command, cmd.args, getSpawnOptions());
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
  console.log("Starting with default", ma);
  var depths = {};
  walkDependencies(packageName, true, (path, package, ancestors) => {
    const thisma = package.makeApp;
    if (!thisma) return;
    //console.log("Found my firend in ", path, thisma);
    const depth = ancestors ? ancestors.length : 0;
    const arrays = ["runEarly", "run", "runAfter", "runLate"];
    const objects = ["submodules"];
    Object.keys(thisma).forEach(key => {
      console.log("checking out key", key);
      const v = thisma[key];
      console.log("It has a value ", v);
      if (arrays.indexOf(key) > -1) {
        console.log("Adding to array ", key, v);
        if (!ma[key]) ma[key] = [];
        if (typeof v == "string") {
          ma[key].push(v);
        } else if (v.length) {
          ma[key] = [...ma[key], ...v];
        }
      } else if (objects.indexOf(key) > -1) {
        console.log("Adding object at key", key, v);
        if (!ma[key]) ma[key] = {};
        if (typeof v == "string") {
          ma[key][v] = v;
        } else {
          ma[key] = { ...ma[key], ...v };
        }
        ma[key] = v;
      } else if (
        !ma[key] ||
        !depth ||
        typeof depths[key] == "undefined" ||
        (depths[key] && !(depths[key] < depth))
      ) {
        ma[key] = v;
        console.log("Replaing value ");
      } else {
        console.log("Skipping ", ma[key], depth, depths[key]);
      }
    });
  });
  console.log("Final ma: ", ma);
  //First create the package. Do you have a creation option for me, or do I do this
  if (ma.initializer) {
    if (typeof ma.initializer == "string") {
      ma.initializer = {
        command: ma.initializer,
        args: null
      };
    }
    ma.initializer.args = ma.initializer.args ? ma.initializer.args : [];
    cp.spawnSync(
      ma.initializer.command,
      [...ma.initializer.args, target],
      getSpawnOptions()
    );
  } else {
    throw { message: "Could not get an initializer", obj: ma };
  }
  process.chdir(target);
  //All following code will run from the newly created app as CWD
  if (typeof ma.dependencies == "object")
    Object.keys(ma.dependencies).forEach(k => {
      const v = ma.dependencies[k];
      yarnif.addDependency(v);
    });
  if (typeof ma.devDependencies == "object")
    Object.keys(ma.devDependencies).forEach(k => {
      const v = ma.devDependencies[k];
      yarnif.addDevDependency(v);
    });

  const packagePath = Path.resolve(process.cwd(), "package.json");
  const packageObj = require(packagePath);
  walkDependencies(process.cwd(), true, (path, package, ancestors) => {
    const scripts =
      (package && package.makeApp && package.makeApp.scripts) || {};
    Object.keys(scripts).forEach(k => {
      packageObj.scripts = packageObj.scripts || {};
      packageObj.scripts[k] = scripts[k];
    });
  });
  packageObj.makeApp = ma;
  console.log("I am about to write to the packagePath", packagePath);
  fs.writeFileSync(packagePath, JSON.stringify(packageObj, null, 2));
  const thisPkg = require(Path.resolve(packageName, "package.json"));
  yarnif.addDependency("rhdeck/make-app");
  return process.cwd();
}
function initApp() {
  console.log("Starting initapp");
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
