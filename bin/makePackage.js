#!/usr/bin/env
const fs = require("fs");
const Path = require("path");
const packageTemplate = require("package-template");
//Take in only one arg - the base
const base = argv[2];
fs.mkdir(base);
process.chdir(base);
const tmp = packageTemplate.init(base);
packageTemplate.write(tmp, Path.join(base, "package.json"));
