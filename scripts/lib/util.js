var fs = require("fs");
var path = require("path");

const handleError = require("./errors").handleError;
const config = require("./config").config;

function pad(str) {
	str = "" + str;
	while (str.length < 2) {
		str = "0" + str;
	}
	return str;
}

function getDateNow() {
	var dt = new Date();
	var fileDate = [dt.getUTCFullYear(), pad(dt.getUTCMonth()+1), pad(dt.getUTCDate())].join("-")
		+ " "
		+ [pad(dt.getUTCHours()), pad(dt.getUTCMinutes()), pad(dt.getUTCSeconds())].join(":") + " UTC";
	return fileDate;
}

function writeCompactData(opts, ret) {
	var rowDataCount = 0;
	for (var key in ret) {
		rowDataCount = rowDataCount + ret[key].length;
		if (ret[key].length === 0) {
			delete ret[key];
		}
	}
	var diskFilePath = path.join(config.path.jurisMapDir, "juris-" + opts.j + "-map.json");
	var diskObj;
	if (fs.existsSync(diskFilePath)) {
		diskObj = JSON.parse(fs.readFileSync(diskFilePath).toString());
	} else {
		diskObj = {};
	}
	var sameData = deepEqual(diskObj, ret);
	//console.log(JSON.stringify(diskObj, null, 2));
	if (!sameData || opts.F) {
		var versions;
		if (fs.existsSync(config.path.jurisVersionFile)) {
			versions = JSON.parse(fs.readFileSync(config.path.jurisVersionFile).toString());
		} else {
			versions = {};
		}
		versions[opts.j] = {
			timestamp: getDateNow(),
			rowcount: rowDataCount
		};
		fs.writeFileSync(config.path.jurisVersionFile, JSON.stringify(versions, null, 2));

		var filePath = path.join(config.path.jurisMapDir, "juris-" + opts.j + "-map.json");
		fs.writeFileSync(filePath, JSON.stringify(ret));
	}
};

// NB: working to assign new abbrevs object (xdata) to existing disk object
// before write, to preserve journal-based court name suppression etc.

function writeAbbrevData(opts, jurisID, abbrevVariantName, abbrevs) {
	var variantName = abbrevVariantName ? "-" + abbrevVariantName : "";
	var fileName = "auto-" + jurisID + variantName + ".json";
	var filePath = path.join(config.path.jurisAbbrevsDir, fileName);
	var sameData = false;
	var diskObj;
	if (fs.existsSync(filePath)) {
		diskObj = JSON.parse(fs.readFileSync(filePath).toString());
		diskObj.version = abbrevs.version;
		sameData = deepEqual(diskObj, abbrevs);
	}
	if (!sameData || opts.F) {
		var dirlistPath = path.join(config.path.jurisAbbrevsDir, "DIRECTORY_LISTING.json");
		var allinfo = JSON.parse(fs.readFileSync(dirlistPath).toString());
		var foundOne = false;
		for (var info of allinfo) {
			if (!info.jurisdiction) continue;
			if (info.jurisdiction === jurisID) {
				if (abbrevVariantName) {
					info.variants[abbrevVariantName] = abbrevs.version;
				} else {
					info.version = abbrevs.version;
				}
				foundOne = true;
			}
		}
		if (!foundOne) {
			var newInfo = {};
			newInfo.filename = fileName;
			newInfo.name = "Abbreviations: " + abbrevs.name + " legal";
			newInfo.version = abbrevs.version;
			newInfo.jurisdiction = jurisID;
			allinfo.push(newInfo);
		}
		if (fs.existsSync(filePath)) {
			// Remove old keys not found in the new data set
			var diskKeys = Object.keys(diskObj.xdata);
			var newKeys = Object.keys(abbrevs.xdata);
			for (var i=diskKeys.length-1;i>-1;i--) {
				var key = diskKeys[i];
				if (newKeys.indexOf(key) === -1) {
					delete diskObj.xdata[key];
				}
			}
			// Move supplementary segments from existing file to new data set
			for (var jurisdictionKey in diskObj.xdata) {
				for (var fieldKey in diskObj.xdata[jurisdictionKey]) {
					if (["institution-part", "institution-entire"].indexOf(fieldKey) > -1) {
						continue;
					}
					abbrevs.xdata[jurisdictionKey][fieldKey] = diskObj.xdata[jurisdictionKey][fieldKey];
				}
			}
		}
		fs.writeFileSync(dirlistPath, JSON.stringify(allinfo, null, 2));
		fs.writeFileSync(path.join(config.path.jurisAbbrevsDir, fileName), JSON.stringify(abbrevs, null, 2));
	}
}

function deepEqual(x, y) {
  if (x === y) {
    return true;
  }
  else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
    if (Object.keys(x).length != Object.keys(y).length)
      return false;

    for (var prop in x) {
      if (y.hasOwnProperty(prop))
      {  
        if (! deepEqual(x[prop], y[prop]))
          return false;
      }
      else
        return false;
    }

    return true;
  }
  else 
    return false;
}

module.exports = {
	getDateNow: getDateNow,
	writeCompactData: writeCompactData,
	writeAbbrevData: writeAbbrevData
}
