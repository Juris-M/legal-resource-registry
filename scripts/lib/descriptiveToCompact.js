const fs = require("fs");
const path = require("path");
const eol = require('eol');

const util = require("./util");
const handleError = require("./errors").handleError;
const config = require("./config").config;


var abbrevTemplate = {
	filename: "REPLACE_ME",
	name: "REPLACE_ME",
	version: "REPLACE_ME",
	xdata: {
		default: {
			place: {}
		}
	}
}

const setAbbrevData = (obj, lang, passthroughs) => {
	if (!passthroughs) {
		passthroughs = [];
	}
	var ret = {};
	if ("undefined" === typeof obj) {
		throw new Error(`Undefined object in setAbbrevData()`);
	}
	if (obj.name) {
		ret.abbrev = obj.name;
	}
	var hasAbbrev = false;
	if (obj.abbrev) {
		ret.abbrev = obj.abbrev;
		hasAbbrev = true;
	}
	if (obj.ABBREV) {
		ret.ABBREV = obj.ABBREV;
	}
	if (obj.variants && obj.variants[lang]) {
		if (obj.variants[lang].name && !hasAbbrev) {
			ret.abbrev = obj.variants[lang].name;
		}
		if (obj.variants[lang].abbrev) {
			ret.abbrev = obj.variants[lang].abbrev;
		}
		if (obj.variants[lang].ABBREV) {
			ret.ABBREV = obj.variants[lang].ABBREV;
		}
	}
	for (var passthrough of passthroughs) {
		if (obj[passthrough]) {
			ret[passthrough] = obj[passthrough];
		}
	}
	return ret;
}
	
const processJurisAbbrevs = (opts, jurisID, jurisDesc) => {
	var langs = [""].concat(getLangs(jurisDesc, "abbrevs"));
	for (var lang of langs) {
		var ret = JSON.parse(JSON.stringify(abbrevTemplate));
		// Add jurisdiction abbrevs to return object
		for (var jKey in jurisDesc.jurisdictions) {
			var jObj = jurisDesc.jurisdictions[jKey];
			if ("undefined" === typeof jObj) {
				throw new Error(`Undefined jObj from ${jKey} in processJurisAbbrevs()`);
			}
			if (jKey.indexOf(":") === -1) {
				ret.name = jObj.name;
			}
			var allcapsJurisdictionKey = jKey.toUpperCase();
			ret.xdata.default.place[allcapsJurisdictionKey] = jObj.name;
			var setAbbrev = false;
			if (jObj.abbrev) {
				setAbbrev = true;
				ret.xdata.default.place[allcapsJurisdictionKey] = jObj.abbrev;
			}
			if (jObj.variants && jObj.variants[lang]) {
				if (!setAbbrev) {
					ret.xdata.default.place[allcapsJurisdictionKey] = jObj.variants[lang].name;
				}
				if (jObj.variants[lang].abbrev) {
					ret.xdata.default.place[allcapsJurisdictionKey] = jObj.variants[lang].abbrev;
				}
			}
		};
		// Build an object with courts and jurisdiction abbrev and ABBREV segments for this lang, with abbrev-select hint
		var data = {
			courts: {},
			jurisdictions: {}
		};
		// courts
		for (var cKey in jurisDesc.courts) {
			var cObj = jurisDesc.courts[cKey];
			data.courts[cKey] = setAbbrevData(cObj, lang);
		}
		// jurisdictions
		for (var jKey in jurisDesc.jurisdictions) {
			var jObj = jurisDesc.jurisdictions[jKey];
			data.jurisdictions[jKey] = setAbbrevData(jObj, lang, ["container-title", "overrides"]);
		}
		// for jurisdictionCourts
		for (var jKey in jurisDesc.jurisdictions) {
			var jurisdiction = jurisDesc.jurisdictions[jKey];
			if (jurisdiction.courts) {
				data.jurisdictions[jKey].courts = {};
				for (var cKey in jurisdiction.courts) {
					var cObj = jurisdiction.courts[cKey];
					data.jurisdictions[jKey].courts[cKey] = setAbbrevData(cObj, lang, ["abbrev_select"]);
				}
			}
			data.jurisdictions[jKey].overrides = {};
			if (jurisdiction.overrides) {
				for (var oKey in jurisdiction.overrides) {
					var oObj = jurisdiction.overrides[oKey];
					data.jurisdictions[jKey].overrides[oKey] = setAbbrevData(oObj, lang, ["abbrev_select"]);
				}
			}
		}
		//console.log(JSON.stringify(data, null, 2));
		
		// Resolve courts in context into ret.jurisdictions
		for (var jKey in data.jurisdictions) {
			var jObj = data.jurisdictions[jKey];
			if ("undefined" === typeof jObj) {
				throw new Error(`Undefined jObj from ${jKey} in data.jurisdictions loop of processJurisAbbrevs`);
			}
			jabbrev = jObj.abbrev;
			jABBREV = jObj.ABBREV;
			if (jObj.courts) {
				for (var cKey in jObj.courts) {
					if ("undefined" === typeof data.courts[cKey]) {
						throw new Error(`Undefined data.courts[cKey] from cKey=${cKey} in processJurisAbbrevs`);
					}
					cabbrev = data.courts[cKey].abbrev;
					cABBREV = data.courts[cKey].ABBREV;

					var jParts = jKey.split(":");
					var jPartString = jParts.shift();
					while (jParts.length > 0) {
						var oObj = data.jurisdictions[jPartString].overrides[cKey];
						if ("undefined" !== typeof oObj) {
							if (oObj.abbrev) {
								cabbrev = oObj.abbrev;
							}
							if (oObj.ABBREV) {
								cABBREV = oObj.ABBREV;
							}
						}
						jPartString += ":" + jParts.shift();
					}

					var cObj = jObj.courts[cKey];
					if ("undefined" === typeof cObj) {
						throw new Error(`Undefined cObj from cKey=${cKey} in processJurisAbbrevs`);
					}
					if (cObj.abbrev) {
						cabbrev = cObj.abbrev;
					}
					if (cObj.ABBREV) {
						cABBREV = cObj.ABBREV;
					}
					
					var val;
					// ordinary abbreviations
					if (!ret.xdata[jKey]) {
						ret.xdata[jKey] = {};
					}
					if (!ret.xdata[jKey]["institution-part"]) {
						ret.xdata[jKey]["institution-part"] = {};
					}
					if (cObj.abbrev_select === "jurisdiction") {
						val = jabbrev;
					} else if (cObj.abbrev_select === "court") {
						val = cabbrev.replace(/^%s\s*/, "").replace(/\s*%s$/, "").replace(/%s\s*/g, "");
					} else {
						val = cabbrev.replace("%s", jabbrev);
					}
					ret.xdata[jKey]["institution-part"][cKey] = val;
					// standard court IDs
					if (cABBREV) {
						if (jABBREV) {
							val = cABBREV.replace("%s", jABBREV);
						} else {
							// This may never happen, but just in case ...
							val = cABBREV.replace("%s", jabbrev);
						}
						if (!ret.xdata[jKey]["institution-entire"]) {
							ret.xdata[jKey]["institution-entire"] = {};
						}
						ret.xdata[jKey]["institution-entire"][cKey] = val;
					}
				}
			}
			if (jObj["container-title"]) {
 				ret.xdata[jKey]["container-title"] = jObj["container-title"];
			}
		}
		// console.log(JSON.stringify(ret, null, 2));
		// Write file
		var pathName;
		if (!lang) {
			var fileName = `auto-${jurisID}.json`;
			pathName = path.join(config.path.jurisAbbrevsDir, fileName);
		} else {
			var fileName = `auto-${jurisID}-${lang}.json`;
			pathName = path.join(config.path.jurisAbbrevsDir, fileName);
		}
		ret.filename = fileName;
		ret.version = util.getDateNow();
		var oldXdata = false;
		if (fs.existsSync(pathName)) {
			var oldXdata = JSON.stringify(JSON.parse(fs.readFileSync(pathName).toString()).xdata).trim();
		}
		var newXdata = JSON.stringify(ret.xdata).trim();
		if (newXdata !== oldXdata || opts.force) {
			console.log(`Writing ${pathName}`);
			fs.writeFileSync(pathName, JSON.stringify(ret, null, 2));
		}
	}
}

// OKAY
// For courts, just harvest everything in a single array.
// For jurisdictions, accept lang pref as optional arg,
// set just one per key, and prefer matching variant by overwriting.

const getCourtStrings = (jurisDesc) => {
	var strings = [];
	var stringIndex = {};
	for (var cKey in jurisDesc.courts) {
		var obj = jurisDesc.courts[cKey];
		stringIndex[`${cKey}:default`] = strings.length;
		//if (obj.name.indexOf("%s") > -1) {
		//	console.log(`XXX ${obj.name}`);
		//}
		strings.push([cKey, obj.name]);
		if (obj.variants) {
			for (var lang in obj.variants) {
				var objVariant = obj.variants[lang];
				if (objVariant.name) {
					stringIndex[`${cKey}:${lang}`] = strings.length;
					strings.push([cKey, objVariant.name]);
				}
			}
		}
	}
	return {
		index: stringIndex,
		vals: strings
	};
}

const getJurisdictionData = (stringIndex, jurisDesc, langs) => {
	var ret = {};
	for (var lang of langs) {
		var arr = [];
		var parentIndex = {};
		var parentPos = null;
		var pos = 0;
		for (var jKey in jurisDesc.jurisdictions) {
			var obj = jurisDesc.jurisdictions[jKey];
			if (!obj.name) {
				throw new Error(`Missing name for ${jKey}`);
			}
			if (jKey.indexOf(":") === -1) {
				parentPos = null;
			} else {
				parentPos = parentIndex[jKey.split(":").slice(0, -1).join(":")];
			}
			parentIndex[jKey] = arr.length;
			arr.push([jKey.split(":").slice(-1)[0], obj.name, parentPos]);
			if (jurisDesc.jurisdictions[jKey].variants && jurisDesc.jurisdictions[jKey].variants[lang]) {
				if (jurisDesc.jurisdictions[jKey].variants[lang].name) {
					arr[pos][1] = jurisDesc.jurisdictions[jKey].variants[lang].name;
				}
			}
			arr[pos] = arr[pos].concat(getCourtsInContext(stringIndex, obj, lang));
			pos++;
		}
		if (!lang) {
			ret.default = arr;
		} else {
			ret[lang] = arr;
		}
	}
	return ret;
}

const getCourtsInContext = (stringIndex, obj, lang) => {
	var ret = [];
	if (obj.courts) {
		for (var cKey in obj.courts) {
			if (!lang) {
				ret.push(stringIndex[`${cKey}:default`]);
			} else {
				if (stringIndex[`${cKey}:${lang}`]) {
					ret.push(stringIndex[`${cKey}:${lang}`]);
				} else {
					ret.push(stringIndex[`${cKey}:default`]);
				}
			}
		}
	}
	return ret;
}

const getLangs = (jurisDesc, key) => {
	var ret = [];
	for (var lKey in jurisDesc.langs) {
		var lang = jurisDesc.langs[lKey];
		if (lang.indexOf(key) > -1) {
			ret.push(lKey);
		}
	}
	return ret;
}

const buildMapVersion = (jurisObj) => {
	var rowcount = 0;
	for (var lang in jurisObj.jurisdictions) {
		rowcount += Object.keys(jurisObj.jurisdictions[lang]).length;
	}
	var timestamp = util.getDateNow();
	return {
		timestamp: timestamp,
		rowcount: rowcount
	};
}

const buildMapVersions = (jurisID) => {
	var versions_path = path.join(config.path.jurisMapDir, `versions.json`);
	var versions;
	console.log(`Reading ${versions_path}`);
	var versions_json = fs.readFileSync(versions_path).toString();
	try {
		versions = JSON.parse(versions_json);
	} catch(e) {
		e = new Error(`Error while reading ${versions_path}\n       \"${e.message}\"\n       Either fix the JSON syntax of the file, or remove it to refresh all jurisdiction maps`);
		handleError(e);
	}
	var map_path = path.join(config.path.jurisMapDir, `juris-${jurisID}-map.json`);
	var map_json = fs.readFileSync(map_path).toString();
	var jurisObj = JSON.parse(map_json);
	versions[jurisID] = buildMapVersion(jurisObj);
	return versions;
};

const validateAllMapJSON = () => {
	var newVersionsObj = false;
	var versions_path = path.join(config.path.jurisMapDir, `versions.json`);
	if (!fs.existsSync(versions_path)) {
		newVersionsObj = {};
	}
	var pth = config.path.jurisMapDir;
	var filenames = fs.readdirSync(pth);
	for (var fn of filenames) {
		var m = fn.match(/^juris-(.*)-map.json$/);
		if (m) {
			var jurisID = m[1];
			var map_path = path.join(config.path.jurisMapDir, fn);
			var map_json = fs.readFileSync(map_path).toString();
			try {
				// Just check that parsing works.
				var jurisObj = JSON.parse(map_json);
				if (newVersionsObj) {
					newVersionsObj[jurisID] = buildMapVersion(jurisObj);
				}
			} catch(e) {
				e = new Error(`ERROR: error parsing file at ${map_path}\n       \"${e.message}\"\n       Map files must be valid JSON.`);
				handleError(e);
			}
		}
	}
	if (newVersionsObj) {
		console.log(`Creating ${versions_path}`);
		fs.writeFileSync(versions_path, JSON.stringify(newVersionsObj, null, 2));
	}
};

const processJurisMap = (opts, jurisID, jurisDesc) => {
	// In Jurism DB
	// 46964|at:innsbruck:innsbruck:silz|Austria|AT|Innsbruck|Innsbruck|Silz|5
	//
    // {
    //     courts: ["Supreme Court", "Cours Supreme", "Court of Appeal", "Cour d'Appel"],
    //     jurisdictions: {
    //         "default": [
    //             ["ca", "Canada", null, 0],
    //             ["ca:nb", "New Brunswick", 0, 0, 2],
    //             ["ca:qb", "Quebec", 0, 0, 2]
    //         ],
    //         "fr": [
    //             ["ca", "Canada", null, 1],
    //             ["ca:nb", "New Brunswick", 0, 0, 2],
    //             ["ca:qb", "Quebec", 0, 1, 3]
    //         ]
    //     }
    // };
	var langs = [""].concat(getLangs(jurisDesc, "ui"));
	var courtStrings = getCourtStrings(jurisDesc);
	var jurisdictionData = getJurisdictionData(courtStrings.index, jurisDesc, langs);
	var ret = {
		courts: courtStrings.vals,
		jurisdictions: jurisdictionData
	};
	var pathName = path.join(config.path.jurisMapDir, `juris-${jurisID}-map.json`);
	var curTxt = false;
	if (fs.existsSync(pathName)) {
		var curTxt = fs.readFileSync(pathName).toString().trim();
	}
	var newTxt = JSON.stringify(ret).trim();
	if (newTxt !== curTxt || opts.force) {
		fs.writeFileSync(pathName, newTxt);
		var versions = buildMapVersions(jurisID);
		fs.writeFileSync(path.join(config.path.jurisMapDir, `versions.json`), JSON.stringify(versions, null, 2));
	}
}

async function descriptiveToCompact(opts) {
	console.log("Will read descriptive jurisdiction files from: " + config.path.jurisSrcDir);
	console.log("Will write abbreviation files to: " + config.path.jurisAbbrevsDir);
	console.log("Will write compact jurisdiction files to: " + config.path.jurisMapDir);
	var jurisIDs = [];
	if (opts.a) {
		for (var fileName of fs.readdirSync(config.path.jurisSrcDir)) {
			var m = fileName.match(/^juris-(.*)-desc.json$/, "$1");
			if (m) {
				jurisIDs.push(m[1]);
			}
		}
	} else if (opts.j) {
		jurisIDs.push(opts.j);
	}
	if (jurisIDs.length === 0) {
		var e;
		if (opts.a) {
			e = new Error("no descriptive jurisdiction files found in " + config.path.jurisSrcDir);
		} else if (opts.j) {
			e = new Error("descriptive jurisdiction file does not exist in " + config.path.jurisSrcDir);
		}
		handleError(e);
	}
	console.log(`Processing: ${jurisIDs.join(", ")}`);
	validateAllMapJSON();
	for (var jurisID of jurisIDs) {
		opts.j = jurisID;
		var json = fs.readFileSync(path.join(config.path.jurisSrcDir, "juris-" + jurisID + "-desc.json")).toString();
		var json = eol.lf(json);
		var jurisDesc = JSON.parse(json);
		processJurisAbbrevs(opts, jurisID, jurisDesc);
		processJurisMap(opts, jurisID, jurisDesc);
	}
	rewriteAbbrevsDirectoryListing();
}

const rewriteAbbrevsDirectoryListing = () => {
	var outPath = path.join(config.path.jurisAbbrevsDir, "DIRECTORY_LISTING.json");
	// Three passes. One to pick up the importable files, another to pick up the parent auto files, and a third to add variants.
	var ret = [];
	for (var filename of fs.readdirSync(config.path.jurisAbbrevsDir)) {
		var m = filename.match(/(.*).json/);
		if (!m) continue;
		if (m[1].slice(0, 5) === "auto-" || m[1].slice(0, 3) === "DIR") {
			continue;
		}
		var obj = JSON.parse(fs.readFileSync(path.join(config.path.jurisAbbrevsDir, filename)).toString());
		ret.push({
			filename: filename,
			name: obj.name
		});
	}
	var acc = {};
	for (var filename of fs.readdirSync(config.path.jurisAbbrevsDir)) {
		var m = filename.match(/^auto-([^-]+).json/);
		if (!m) continue;
		var obj = JSON.parse(fs.readFileSync(path.join(config.path.jurisAbbrevsDir, filename)).toString());
		var jurisdiction = m[1];
		acc[jurisdiction] = {
			filename: filename,
			name: `Abbreviations: ${obj.name} legal`,
			version: obj.version,
			jurisdiction: m[1]
		};
	}
	// Second pass for the variants
	for (var filename of fs.readdirSync(config.path.jurisAbbrevsDir)) {
		var m = filename.match(/^auto-([^-]+)-(.*).json/);
		if (!m) continue;
		var obj = JSON.parse(fs.readFileSync(path.join(config.path.jurisAbbrevsDir, filename)).toString());
		var jurisdiction = m[1];
		var variant = m[2];
		if (!acc[jurisdiction].variants) {
			acc[jurisdiction].variants = {};
		}
		acc[jurisdiction].variants[variant] = obj.version;
	}
	// Compose as array and write
	for (var key in acc) {
		ret.push(acc[key]);
	}
	console.log("Writing!");
	fs.writeFileSync(outPath, JSON.stringify(ret, null, 2));
}

module.exports = {
	descriptiveToCompact: descriptiveToCompact
}
