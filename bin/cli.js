#!/usr/bin/env node
const yarnif = require("yarnif");
const ba = require("../index");
//oh crap I need the argument here
const package = process.argv[2];
if (!package) {
  console.log("Usage: make-app <package> [args...]");
}
//Now lets include it
try {
  var path = require.resolve(package);
} catch (e) {}
if (!path) {
  yarnif.addDevDependency(package);
  path = require.resolve(package);
}

if (!path) {
  console.log("Could not find package ", package);
  process.exit();
}
const args = process.argv.slice(2);
const newpath = ba.build(path, args);
if (newpath) {
  process.chdir(newpath);
  ba.init();
  console.log("Successfully ran package " + package);
} else {
  console.log("Could not properly run package" + package);
}
