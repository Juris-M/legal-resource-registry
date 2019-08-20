var fs = require("fs");
var path = require("path");

const handleError = require("./errors").handleError;
const config = require("./config").config;

const jurisKeys = [
	"courtNames",
	"courtJurisdictionLinks",
	"jurisdictions",
	"countryCourtLinks",
	"courts"
];

// Slicer modes
const JURISDICTION = 1;
const COURT = 2;

var slicers = [
	function(str, offset, mode){
		if ([JURISDICTION, COURT].indexOf(mode) === -1) {
			var e = new Error("bad mode \"" + mode + "\" in slicer function 0");
			handleError(e);
		}
		// jurisdiction at start of string
		if (mode === JURISDICTION) {
			return str.slice(0, offset).trim();
		} else if (mode === COURT) {
			var court = str.slice(offset).trim();
			if (offset > 0) {
				var separator = str.slice(offset, offset+1);
				if (separator === " ") {
					court = "< " + court;
				} else if (separator) {
					court = "<" + court;
				}
			}
			return court;
		}
	},
	function(str, offset, mode){
		if ([JURISDICTION, COURT].indexOf(mode) === -1) {
			var e = new Error("bad mode \"" + mode + "\" in slicer function 1");
			handleError(e);
		}
		// jurisdiction at end of string
		if (mode === JURISDICTION) {
			return str.slice(-1 * offset).trim();
		} else if (mode === COURT) {
			var court = str.slice(0, -1 * offset).trim();
			if (offset > 0) {
				var separator = str.slice((-1 * offset) - 1, -1 * offset);
				if (separator === " ") {
					court = court + " >";
				} else if (separator) {
					court = court + ">";
				}
			}
			return court;
		}
	}
];

var convertedJurisdictions = [];

var abbrevsDirectoryFilePath = path.join(config.path.jurisAbbrevsDir, "DIRECTORY_LISTING.json");
if (!fs.existsSync(path.join(config.path.jurisAbbrevsDir, "DIRECTORY_LISTING.json"))) {
	var e = new Error("DIRECTORY_LISTING.json not found.\npath.jurisAbbrevsDir in " + config.path.configFile + " must point at a clone of https://github.com/Juris-M/jurism-abbreviations.git");
	handleError(e);
}
var abbrevsDirectory = JSON.parse(fs.readFileSync(abbrevsDirectoryFilePath).toString());

async function compactToDescriptive(opts) {
	var jurisIDs = [];
	if (!fs.existsSync(config.path.jurisVersionFile)) {
		var e = new Error("File \"version.json\" not found. Populate juris-maps with \"jurism-db\" or \"compact\".");
		handleError(e);
	}
	console.log("Reading compact jurisdiction files from: " + config.path.jurisMapDir);
	console.log("Reading abbreviation files from: " + config.path.jurisAbbrevsDir);
	console.log("Writing descriptive jurisdiction+abbrevs files to: " + config.path.jurisSrcDir);
	var allJurisIDs = JSON.parse(fs.readFileSync(config.path.jurisVersionFile).toString());
	if (opts.j) {
		if (!allJurisIDs[opts.j]) {
			var e = new Error("unknown jurisdiction " + opts.j);
			handleError(e);
		}
		jurisIDs.push(opts.j);
	} else if (opts.a) {
		jurisIDs = Object.keys(allJurisIDs);
	}
	for (var jurisID of jurisIDs) {
		convertedJurisdictions.push(jurisID);
		opts.j = jurisID;
		await compactToDescriptive_process(opts);
	}
	var plural = "s";
	var count = convertedJurisdictions.length;
	if (count === 1) {
		plural = "";
	}
	console.log("Converted " + count + " jurisdiction" + plural + ": " + convertedJurisdictions.join(", "));
}

async function compactToDescriptive_process(opts) {
	var mapData = JSON.parse(fs.readFileSync(path.join(config.path.jurisMapDir, "juris-" + opts.j + "-map.json")).toString());
	for (var key of jurisKeys) {
		if (!mapData[key]) {
			mapData[key] = [];
		}
	}
	var ret = {
		courts: {},
		jurisdictions: []
	}
	for (var court of mapData.courts) {
		var courtID = court[0];
		var countryCourtLink = mapData.countryCourtLinks[court[1]];
		var courtName = mapData.courtNames[countryCourtLink[0]];
		ret.courts[courtID] = {
			name: courtName
		}
	}
	
	for (var i=0,ilen=mapData.jurisdictions.length; i<ilen; i++) {
		var jurisdictionInfo = mapData.jurisdictions[i];
		var jurisdictionName = jurisdictionInfo[1].split("|")[0];
		var jurisdictionID = composeJurisdictionID(mapData, i);
		var jurisdictionPath = jurisdictionID.replace(/:/g, "/");
		var courts = composeCourts(mapData, i)
		ret.jurisdictions.push({
			path: jurisdictionPath,
			name: jurisdictionName,
			courts: courts
		});
	}

	// Court names come sometimes before, sometimes after. So
	// "order" and for that matter "separator" need to be set
	// on the court name directly. Like:
	//
	// Bankr. >
	// < Sup. Ct.
	// <地方裁判所
	//
	// THis is handled by the slicer (code for functions at the top
	// of this file).

	var abbrevSets = getAbbrevSets(opts.j);

	for (var fn in abbrevSets) {
		var nationalAbbrevs = getJurisdictionAbbrevs(abbrevSets[fn].data);
		var jurisdictionIdToName = {};
		var abbrevkey = "abbrev";
		if (abbrevSets[fn].extension) {
			abbrevkey = "abbrev:" + abbrevSets[fn].extension;
		}
		for (var i=0,ilen=ret.jurisdictions.length; i<ilen; i++) {
			var jinfo = ret.jurisdictions[i];
			var jurisdictionID = jinfo.path.replace(/\//g, ":");
			ret.jurisdictions[i][abbrevkey] = nationalAbbrevs[jurisdictionID];
			jurisdictionIdToName[jurisdictionID] = nationalAbbrevs[jurisdictionID];
		}
		
		for (var courtID in ret.courts) {
			outer:
			for (var i=0,ilen=slicers.length; i<ilen; i++) {
				var slicer = slicers[i];
				mid:
				for (var jurisdictionID in nationalAbbrevs) {
					var courtAbbrevs = getCourtAbbrevs(abbrevSets[fn].data, jurisdictionID);
					if (courtAbbrevs && courtAbbrevs[courtID]) {
						var courtAbbrev = courtAbbrevs[courtID];
						var baseCruft = nationalAbbrevs[jurisdictionID];
						var offset = baseCruft.length;
						// If jurisdiction does not match this end of the string, try the other slicer if any
						if (slicer(courtAbbrevs[courtID], baseCruft.length, JURISDICTION) !== baseCruft) {
							break;
						}
						courtAbbrev = slicer(courtAbbrevs[courtID], offset, COURT);
						break outer;
					}
				}
			}
			ret.courts[courtID][abbrevkey] = courtAbbrev;
		}
	}
	var filePath = path.join(config.path.jurisSrcDir, "juris-" + opts.j + "-desc.json");
	fs.writeFileSync(filePath, JSON.stringify(ret, null, 2));
}

function composeJurisdictionID(mapData, idx) {
	var id = mapData.jurisdictions[idx][0];
	while ("number" === typeof mapData.jurisdictions[idx][2]) {
		var parentIdx = mapData.jurisdictions[idx][2];
		var parent = mapData.jurisdictions[parentIdx];
		id = parent[0] + ":" + id;
		idx = parentIdx;
	}
	return id;
}

function composeCourts(mapData, idx) {
	var courts = [];
	for (var entry of mapData.courtJurisdictionLinks) {
		if (entry[0] === idx) {
			courts.push(mapData.courts[entry[1]][0]);
		}
	}
	return courts;
}

function getAbbrevSets(jurisID) {
	var data = {};
	for (var info of abbrevsDirectory) {
		if (info.jurisdiction === jurisID) {
			data[info.filename] = {
				extension: false,
				data: {}
			};
			var fileStub = path.basename(info.filename, ".json");
			if (info.variants) {
				for (var variant in info.variants) {
					data[fileStub + "-" + variant + ".json"] = {
						extension: variant,
						data: {}
					};
				}
			}
		}
	}
	for (var fileName in data) {
		data[fileName].data = JSON.parse(fs.readFileSync(path.join(config.path.jurisAbbrevsDir, fileName)).toString());
	}
	return data;
}

function getJurisdictionAbbrevs(data) {
	var abbrevs = {};
	if (data.xdata && data.xdata["default"] && data.xdata["default"].place) {
		var place = data.xdata["default"].place;
		for (var key in place) {
			abbrevs[key.toLowerCase()] = place[key];
		}
	}
	return abbrevs;
}

function getCourtAbbrevs(data, jurisdictionID) {
	var abbrevs = false;
	if (data.xdata && data.xdata[jurisdictionID] && data.xdata[jurisdictionID]["institution-part"]) {
		abbrevs = data.xdata[jurisdictionID]["institution-part"];
	}
	return abbrevs;
}


module.exports = {
	compactToDescriptive: compactToDescriptive
}
