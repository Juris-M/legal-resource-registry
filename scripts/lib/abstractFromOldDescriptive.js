const fs = require("fs");
const path = require("path");
const eol = require('eol');

const util = require("./util");
const handleError = require("./errors").handleError;
const config = require("./config").config;

const segments = ["name", "abbrev", "ABBREV"];

// Okay, gotta do this from scratch.
// 1. Return array of jurisdictions depending on -j or -a


// AH. We should grab a list of CSL locales. That will be the limit of our
// language arbitration capability anyway.

const getLangsLst = () => {
	var langsLst = JSON.parse();
}

var fileTemplate = {
	langs: {},
	courts: {},
	jurisdictions: {}
}

var entryTemplate = {
	name: null,
	abbrev: null,
	ABBREV: null
}

const getFileObj = () => {
	var obj = JSON.parse(JSON.stringify(fileTemplate));
	return obj;
}

const setObj = (fileObj, type, jKey, cKey, lang) => {
	if (!fileObj) {
		throw new Error(`fileObj is required`);
	}
	if (["jurisdiction", "court", "court-in-jurisdiction"].indexOf(type) === -1) {
		throw new Error(`Type must be "court", "jurisdiction"`);
	}
	if (type === "court") {
		if (!(!jKey && cKey)) {
			throw new Error(`Segment court prohibits jKey and requires cKey`);
		}
	} else if (type === "jurisdiction") {
		if (!(jKey && !cKey)) {
			throw new Error(`Segment jurisdiction requires jKey and prohibits cKey`);
		}
	} else if (type === "court-in-jurisdiction") {
		if (!(jKey && cKey)) {
			throw new Error(`Segment court-in-jurisdiction requires jKey and cKey`);
		}
	}
	var obj = JSON.parse(JSON.stringify(entryTemplate));
	if (type === "court") {
		if (!lang) {
			if (fileObj.courts[cKey]) {
				throw new Error(`Duplicate entry for ${cKey}`);
			}
			fileObj.courts[cKey] = obj;
		} else {
			if (!fileObj.courts[cKey]) {
				throw new Error(`Variant ${lang} added to non-existent court ${cKey}`);
			}
			if (!fileObj.courts[cKey].variants) {
				fileObj.courts[cKey].variants = {};
			}
			if (fileObj.courts[cKey].variants[lang]) {
				throw new Error(`Duplicate entry for ${lang} under ${cKey}`);
			}
			fileObj.courts[cKey].variants[lang] = obj;
		}
	} else if (type === "jurisdiction") {
		if (!lang) {
			if (fileObj.jurisdictions[jKey]) {
				throw new Error(`Duplicate entry for ${jKey}`);
			}
			fileObj.jurisdictions[jKey] = obj;
		} else {
			if (!fileObj.jurisdictions[jKey]) {
				throw new Error(`Variant ${lang} added to non-existent jurisdiction ${jKey}`);
			}
			if (!fileObj.jurisdictions[jKey].variants) {
				fileObj.jurisdictions[jKey].variants = {};
			}
			if (fileObj.jurisdictions[jKey].variants[lang]) {
				throw new Error(`Duplicate entry for ${lang} under ${jKey}`);
			}
			fileObj.jurisdictions[jKey].variants[lang] = obj;
		}
	} else if (type === "court-in-jurisdiction") {
		if (!lang) {
			if (!fileObj.jurisdictions[jKey]) {
				throw new Error(`Court ${cKey} set on non-existent jurisdiction ${jKey}`);
			}
			if (!fileObj.jurisdictions[jKey].courts) {
				fileObj.jurisdictions[jKey].courts = {};
			}
			if (fileObj.jurisdictions[jKey].courts[cKey]) {
				throw new Error(`Duplicate entry for ${cKey} under ${jKey}`);
			}
			fileObj.jurisdictions[jKey].courts[cKey] = obj;
			
		} else {
			if (!fileObj.jurisdictions[jKey]) {
				throw new Error(`Court ${cKey} added to non-existent jurisdiction ${jKey}`);
			}
			if (!fileObj.jurisdictions[jKey].courts) {
				fileObj.jurisdictions[jKey].courts = {};
			}
			if (!fileObj.jurisdictions[jKey].courts[cKey]) {
				throw new Error(`Variant ${lang} added for non-existent court ${cKey} under ${jKey}`);
			}
			if (!fileObj.jurisdictions[jKey].courts[cKey].variants) {
				fileObj.jurisdictions[jKey].courts[cKey].variants = {};
			}
			if (fileObj.jurisdictions[jKey].courts[cKey].variants[lang]) {
				throw new Error(`Duplicate entry for ${lang} for ${cKey} under ${jKey}`);
			}
			fileObj.jurisdictions[jKey].courts[cKey].variants[lang] = obj;
		}
		
	} else {
		throw new Error(`Not sure what you\'re trying to do here`);
    }
    return obj;
}

const setCourt = (fileObj, cKey, lang) => {
    return setObj(fileObj, "court", null, cKey, lang);
}

const setJurisdiction = (fileObj, jKey, lang) => {
	return setObj(fileObj, "jurisdiction", jKey, null, lang);
}

const setCourtInJurisdiction = (fileObj, jKey, cKey, lang) => {
	return setObj(fileObj, "court-in-jurisdiction", jKey, cKey, lang);
}

const extractLangs = (jurisDesc) => {
	var langs = {};
	for (var court in jurisDesc.courts) {
		for (var key in jurisDesc.courts[court]) {
			var m = key.match(/([^:]+):(.*)/);
			if (m) {
				langs[m[2]] = true;
			}
		}
	}
	for (var jurisdiction of jurisDesc.jurisdictions) {
		for (var key in jurisdiction) {
			var m = key.match(/([^:]+):(.*)/);
			if (m) {
				langs[m[2]] = true;
            }
		}
	}
	return Object.keys(langs);
}

const stripObj = (obj) => {
	for (var key in obj) {
		if (obj[key] === null) {
			delete obj[key];
		}
		if (typeof obj[key] === "object" && typeof obj[key].length === "undefined") {
			stripObj(obj[key]);
		}
	}
}

async function abstractFromOldDescriptive(opts) {
	console.log("Will read descriptive jurisdiction files from: " + config.path.jurisSrcDir);
	console.log("Will OVERWRITE old-form descriptive jurisdiction files in new format");
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
		// Call working code for a single jurisdiction here
		opts.j = jurisID;
		var json = fs.readFileSync(path.join(config.path.jurisSrcDir, `juris-${jurisID}-desc.json`)).toString();
		var jurisDesc = JSON.parse(json);
		if (jurisDesc.langs) continue;

		// Yay! So now we have the raw original.
		// Ah! We will also need the associated abbreviation files for this. So one pass to figure out the variants.
		var fileObj = getFileObj();
		var langs = extractLangs(jurisDesc);
		for (var lang of langs) {
			fileObj.langs[lang] = ["abbrevs"];
		}
		langs = [""].concat(langs);
		// For each lang ...
		for (var lang of langs) {
			// Then a pass on courts.
			// Then a pass on jurisdictions.
			// Then a pass on courts in context.
			for (var cKey in jurisDesc.courts) {
				var court = jurisDesc.courts[cKey];
				var obj = setCourt(fileObj, cKey, lang);
				for (var key in court) {
					var matchKey = key;
					if (lang) {
						// If lang, skip if key is not lang
						if (key.indexOf(":") === -1) continue;
						// If lang, strip key for match
						matchKey = key.replace(`:${lang}`, "");
					}
					if (segments.indexOf(matchKey) > -1) {
						obj[matchKey] = court[key].replace("<", "%s").replace(">", "%s");
					}
				}
			}
			for (var jurisdiction of jurisDesc.jurisdictions) {
				var jKey = jurisdiction.path.replace(/\//g, ":");
				var obj = setJurisdiction(fileObj, jKey, lang);
				for (var key in jurisdiction) {
					var matchKey = key;
					if (lang) {
						// If lang, skip if key is not lang
						if (key.indexOf(":") === -1) continue;
						// If lang, strip key for match
						matchKey = key.replace(`:${lang}`, "");
					}
                    if (segments.indexOf(matchKey) > -1) {
						obj[matchKey] = jurisdiction[key].replace("<", "%s").replace(">", "%s");
					}
				}
			}
			for (var jurisdiction of jurisDesc.jurisdictions) {
				var jKey = jurisdiction.path.replace(/\//g, ":");
				for (var cKey of jurisdiction.courts) {
					var abbrev_select = null;
					var ABBREV = null;
					// Is cKey (+)? --> use court, omit jurisdiction --> abbrev_select: "court"
					if (cKey.slice(0, 1) === "+") {
						abbrev_select = "court";
						cKey = cKey.slice(1);
					}
					// Is cKey (-)? --> use jurisdiction, omit court --> abbrev_select: "jurisdiction"
					if (cKey.slice(0, 1) === "-") {
						abbrev_select = "jurisdiction";
						cKey = cKey.slice(1);
					}
					// Does value have ":"? --> ABBREV: <:value>
					var m = cKey.match(/([^:]+)::(.*)/);
					if (m) {
						cKey = m[1];
						ABBREV = m[2];
					}
					var obj = setCourtInJurisdiction(fileObj, jKey, cKey, lang);
					obj.abbrev_select = abbrev_select;
					obj.ABBREV = ABBREV;
				};
			}
			var abbrevsFileName;
			if (lang) {
				abbrevsFileName = `auto-${jurisID}-${lang}.json`;
			} else {
				abbrevsFileName = `auto-${jurisID}.json`;
			}
			var abbrevsPathName = path.join(config.path.jurisAbbrevsDir, abbrevsFileName);
            if (fs.existsSync(abbrevsPathName)) {
			    var objTxt = fs.readFileSync(abbrevsPathName).toString();
                var obj = JSON.parse(objTxt);
                for (var jKey in obj.xdata) {
				    if (jKey === "default") continue;
				    var jurisdiction = obj.xdata[jKey];
				    if (jurisdiction["container-title"]) {
					    if (!fileObj.jurisdictions[jKey]) {
						    throw new Error(`Adding container-title to non-existent jurisdiction ${jKey}`);
					    }
					    fileObj.jurisdictions[jKey]["container-title"] = jurisdiction["container-title"];
				    }
			    }
		    }
		    stripObj(fileObj);
		    fs.writeFileSync(path.join(config.path.jurisSrcDir, `juris-${jurisID}-desc.json`), JSON.stringify(fileObj, null, 2));	
	    }
    }
}
module.exports = {
	abstractFromOldDescriptive: abstractFromOldDescriptive 
}
