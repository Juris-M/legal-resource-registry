const getopts = require("getopts");
const path = require("path");
const dbToCompact = require("./lib/dbToCompact").dbToCompact;
const compactToDescriptive = require("./lib/compactToDescriptive").compactToDescriptive;
const descriptiveToCompact = require("./lib/descriptiveToCompact").descriptiveToCompact;

const handleError = require("./lib/errors").handleError;

/*
 * Options
 */

const optParams = {
    alias: {
		f: "from",
		F: "force",
		t: "to",
		a: "all",
		j: "jurisdiction",
        h: "help"
    },
    string: ["j", "f", "t"],
    boolean: ["h", "a", "F"],
    unknown: option => {
        throw Error("Unknown option \"" +option + "\"");
    }
};
const usage = "Usage: " + path.basename(process.argv[1])
      + "\nUsage: jmconv <options>\n"
      + "    -f, --from\n"
      + "       Data format to convert from. Valid values are:\n"
	  + "       - db-to-compact\n"
	  + "       - compact-to-descriptive\n"
	  + "       - descriptive-to-compact\n"
      + "    -a, --all\n"
      + "       Perform requested operation on all jurisdictions.\n"
      + "    -j <jurisdictionID>, --jurisdiction=<jurisdictionID>\n"
      + "       Perform requested operation on the specified jurisdiction.\n"
      + "    -F --force\n"
      + "       Force overwrite of same data for descriptive-to-compact.\n";

const opts = getopts(process.argv.slice(2), optParams);

if (opts.h) {
	console.log(usage);
	process.exit();
}

if (!opts.f) {
	var e = new Error("The -f option is required");
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

if (!fromToMap[opts.f]) {
	var e = new Error("Argument to option -f must be one of \"db-to-compact\", \"compact-to-descriptive\" or \"descriptive-to-compact\"");
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

console.log("Converting from \"" + fromToMap[opts.f].from + "\" to \"" + fromToMap[opts.f].to + "\"");

if (opts.f === "db-to-compact") {
	dbToCompact(opts).catch(err => handleError(err));
} else if (opts.f === "compact-to-descriptive") {
	compactToDescriptive(opts).catch(err => handleError(err));
} else if (opts.f === "descriptive-to-compact") {
	descriptiveToCompact(opts).catch(err => handleError(err));
}


