#!/usr/bin/env node

const getopts = require("getopts");
const fs = require("fs");
const path = require("path");
const dbToCompact = require("./lib/dbToCompact").dbToCompact;
const compactToDescriptive = require("./lib/compactToDescriptive").compactToDescriptive;
const descriptiveToCompact = require("./lib/descriptiveToCompact").descriptiveToCompact;

const config = require("./lib/config").config;
const handleError = require("./lib/errors").handleError;

/*
 * Options
 */

const optParams = {
    alias: {
		t: "transform",
		t: "to",
		a: "all",
		j: "jurisdiction",
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
      + "    -t, --transform\n"
      + "       Data transformation to perform. Valid values are:\n"
	  + "           db-to-compact\n"
	  + "           compact-to-descriptive\n"
	  + "           descriptive-to-compact\n"
      + "    -a, --all\n"
      + "       Perform requested operation on all jurisdictions.\n"
      + "    -j <jurisdictionID>, --jurisdiction=<jurisdictionID>\n"
      + "       Perform requested operation on the specified jurisdiction.\n"
	  + "    -l, --list\n"
	  + "       List codes for all international organizations and countries\n"
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
	for (var fn of fs.readdirSync(config.path.jurisSrcDir)) {
		try {
			try {
				var obj = JSON.parse(fs.readFileSync(path.join(config.path.jurisSrcDir, fn)));
			} catch (e) {
				throw new Error("JSON parse error in " + path.join(config.path.jurisSrcDir, fn));
			}
			for (var info of obj.jurisdictions) {
				if (info.path.indexOf("/") === -1) {
					if (!info.name) {
						throw new Error("no country/organization name found in " + path.join(config.path.jurisSrcDir, fn));
					}
					lst.push(info);
					if (maxlen < info.path.length) {
						maxlen = info.path.length;
					}
					break;
				}
				throw new Error("no country/organization code entry found in " + path.join(config.path.jurisSrcDir, fn));
			}
		} catch (e) {
			handleError(e);
		}
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
		console.log(" "+ padding + info.path + " : " + info.name);
	}
	process.exit();
}

if (!opts.t) {
	var e = new Error("The -t option is required");
	handleError(e);
}

var fromToMap = {
	"db-to-compact": {
		from: "jurism-db",
		to: "compact"
	},
	"compact-to-descriptive": {
		from: "compact",
		to: "descriptive"
	},
	"descriptive-to-compact": {
		from: "descriptive",
		to: "compact"
	}
}

if (!fromToMap[opts.t]) {
	var e = new Error("Argument to option -t must be one of \"db-to-compact\", \"compact-to-descriptive\" or \"descriptive-to-compact\"");
	handleError(e);
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

console.log("Converting from \"" + fromToMap[opts.t].from + "\" to \"" + fromToMap[opts.t].to + "\"");

if (opts.t === "db-to-compact") {
	dbToCompact(opts).catch(err => handleError(err));
} else if (opts.t === "compact-to-descriptive") {
	compactToDescriptive(opts).catch(err => handleError(err));
} else if (opts.t === "descriptive-to-compact") {
	descriptiveToCompact(opts).catch(err => handleError(err));
}
