var fs = require("fs");
var path = require("path");
var os = require("os");

var handleError = require("./errors").handleError;

var configFile = path.join(os.homedir(), ".jurisUpdate");

var dirNames = [
	"dataDir",
	"jurisMapDir",
	"jurisSrcDir",
	"jurisAbbrevsDir"
]

function getConfig() {
	var config;
	if (fs.existsSync(configFile)) {
		config = JSON.parse(fs.readFileSync(configFile).toString());
	} else {
		config = {
			path: {
				dataDir: null,
				jurisSrcDir: null,
				jurisAbbrevsDir: null,
				configFile: configFile
			}
		}
		fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
	}
	
	if (!config.path.jurisSrcDir) {
		var e = new Error("path.jurisSrcDir is undefined in " + configFile);
		handleError(e);
	}
	
	// TOO SLEEPY TO WORK!
	
	//if (!config.path.dataDir) {
	//	var e = new Error("path.dataDir is undefined in " + configFile);
	//	handleError(e);
	//}

	if (!config.path.jurisMapDir) {
		config.path.jurisAbbrevsDir = path.join(config.path.dataDir, "juris-abbrevs");
	}
	if (!config.path.jurisMapDir) {
		config.path.jurisMapDir = path.join(config.path.dataDir, "juris-maps");
	}
	config.path.jurisVersionFile = path.join(config.path.jurisMapDir, "versions.json");
	
	if (!config.path.jurisAbbrevsDir) {
		config.path.jurisAbbrevsDir = path.join(config.path.dataDir, "juris-abbrevs");
	}
	
	console.log("Using " +config.path.jurisSrcDir + " as path for descriptive jurisdiction files");
	
	for (var subdir of dirNames) {
		if (!config.path[subdir]) continue;
		if (!fs.existsSync(config.path[subdir])) {
			var e = new Error("path does not exist: "+config.path[subdir]);
			handleError(e);
		}
	}
	
	return config;
}

module.exports = {
	config: getConfig()
}
