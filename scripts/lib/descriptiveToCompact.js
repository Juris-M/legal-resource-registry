const fs = require("fs");
const path = require("path");
const eol = require('eol');

const util = require("./util");
const handleError = require("./errors").handleError;
const config = require("./config").config;

const processJurisAbbrevs = (jurisDesc) => {
	
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
			if (jurisDesc.jurisdictions.variants && jurisDesc.jurisdictions.variants[lang]) {
				if (jurisDesc.jurisdictions.variants[lang].name) {
					arr[pos][1] = jurisDesc.jurisdictions.variants[lang].name;
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

const getLangs = (jurisDesc) => {
	var ret = [];
	for (var lKey in jurisDesc.langs) {
		var lang = jurisDesc.langs[lKey];
		if (lang.indexOf("ui") > -1) {
			ret.push(lKey);
		}
	}
	return ret;
}

const processJurisMaps = (jurisID, jurisDesc) => {
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
	
	var langs = [""].concat(getLangs(jurisDesc));
	var courtStrings = getCourtStrings(jurisDesc);
	var jurisdictionData = getJurisdictionData(courtStrings.index, jurisDesc, langs);
	var ret = {
		courts: courtStrings.vals,
		jurisdictions: jurisdictionData
	};
	fs.writeFileSync(path.join(config.path.jurisMapDir, `juris-${jurisID}-map.json`), JSON.stringify(ret));
	var versions_json = fs.readFileSync(path.join(config.path.jurisMapDir, `versions.json`)).toString();
	var versions = JSON.parse(versions_json);
	var timestamp = util.getDateNow();
	var rowcount = 0;
	for (var lang in ret.jurisdictions) {
		rowcount += Object.keys(ret.jurisdictions[lang]).length;
	}
	
	versions[jurisID] = {
		timestamp: timestamp,
		rowcount: rowcount
	};
	fs.writeFileSync(path.join(config.path.jurisMapDir, `versions.json`), JSON.stringify(versions, null, 2));
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
	for (var jurisID of jurisIDs) {
		opts.j = jurisID;
		var json = fs.readFileSync(path.join(config.path.jurisSrcDir, "juris-" + jurisID + "-desc.json")).toString();
		var json = eol.lf(json);
		var jurisDesc = JSON.parse(json);
		console.log(jurisID);
		processJurisAbbrevs(jurisDesc);
		processJurisMaps(jurisID, jurisDesc);
	}
}


module.exports = {
	descriptiveToCompact: descriptiveToCompact
}
