#!/usr/bin/env node

const getopts = require("getopts");
const fs = require("fs");
const path = require("path");
const descriptiveToCompact = require("./lib/descriptiveToCompact").descriptiveToCompact;
const abstractFromOldDescriptive = require("./lib/abstractFromOldDescriptive").abstractFromOldDescriptive;

const config = require("./lib/config").config;
const handleError = require("./lib/errors").handleError;


// OKAY!
// Need to run in three modes:
// * Convert from old to new file format. This should be idempotent.
// * Compile from new file format.
// * Info mode, telling which languages to be created in each country.

/*
 * Options
 */

const optParams = {
    alias: {
		a: "all",
		j: "jurisdiction",
		c: "convert",
		F: "force",
		l: "list",
        h: "help"
    },
    string: ["j", "t", "t"],
    boolean: ["h", "a", "F"],
    unknown: option => {
        throw Error("Unknown option \"" +option + "\"");
    }
};
const usage = "Usage: " + path.basename(process.argv[1]) + " <options>\n"
      + "    -a, --all\n"
      + "       Perform requested operation on all jurisdictions.\n"
      + "    -j <jurisdictionID>, --jurisdiction=<jurisdictionID>\n"
	  + "       Perform requested operation on the specified jurisdiction.\n"
      + "    -c, --convert\n"
      + "       Convert from old descriptive format to new descriptive format"
	  + "    -l, --list\n"
	  + "       List codes for all international organizations and countries [with their languages]\n"
      + "    -F --force\n"
      + "       Force overwrite of same data for descriptive-to-compact.\n";

const opts = getopts(process.argv.slice(2), optParams);

if (opts.h) {
	console.log(usage);
	process.exit();
}

if (opts.l) {
	var lst = [];
	var maxlen = 0;
	var obj = null;
	var langs = null;
	for (var fn of fs.readdirSync(config.path.jurisSrcDir)) {
		var m = fn.match(/^juris-(.*)-desc\.json$/);
		if (!m) continue;
		if (opts.j) {
			var optsJ = opts.j.split(",");
			if (optsJ.indexOf(m[1]) === -1) continue;
		}
		try {
			var foundOne = false;
			try {
				obj = JSON.parse(fs.readFileSync(path.join(config.path.jurisSrcDir, fn)));
			} catch (e) {
				throw new Error("JSON parse error in " + path.join(config.path.jurisSrcDir, fn));
			}
			langs = obj.langs;
			for (var info of obj.jurisdictions) {
				if (info.path.indexOf("/") === -1 && info.path.indexOf(":") === -1) {
					if (!info.name) {
						throw new Error("no country/organization name found in " + path.join(config.path.jurisSrcDir, fn));
					}
					foundOne = true;
					lst.push(info);
					if (maxlen < info.path.length) {
						maxlen = info.path.length;
					}
					break;
				}
			}
			if (!foundOne) {
				throw new Error("no country/organization code entry found in " + path.join(config.path.jurisSrcDir, fn));
			}
		} catch (e) {
			handleError(e);
		}
	}
	if (langs) {
		langs = `[${langs.join(", ")}]`;
	} else {
		langs = "";
	}
	lst.sort(function(a,b){
		if (a.name > b.name) {
			return 1;
		} else if (a.name < b.name) {
			return -1;
		} else {
			return 0;
		}
	});
	for (var info of lst) {
		var offset = 0;
		while ((offset + info.path.length) < maxlen) {
			offset++;
		}
		var padding = "";
		while (padding.length < offset) {
			padding = padding + " ";
		}
		console.log(`  ${padding}${info.path} : ${info.name} ${langs}`);
	}
	process.exit();
}

if (!opts.a && !opts.j) {
	var e = new Error("One of -a or -j is required.");
	handleError(e);
}

if (opts.a && opts.j) {
	var e = new Error("Options -a and -j are mutually exclusive.");
	handleError(e);
}

/*
 * Run
 */

if (opts.c) {
	abstractFromOldDescriptive(opts).catch(err => handleError(err));
} else {
	descriptiveToCompact(opts).catch(err => handleError(err));
}
