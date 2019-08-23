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
	var oldFilePath = path.join(config.path.jurisMapDir, "juris-" + opts.j + "-map.json");
	var oldObj;
	if (fs.existsSync(oldFilePath)) {
		oldObj = JSON.parse(fs.readFileSync(oldFilePath).toString());
	} else {
		oldObj = {};
	}
	var sameData = deepEqual(oldObj, ret);
	//console.log(JSON.stringify(oldObj, null, 2));
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
		}
		fs.writeFileSync(config.path.jurisVersionFile, JSON.stringify(versions, null, 2));
		
		var filePath = path.join(config.path.jurisMapDir, "juris-" + opts.j + "-map.json");
		fs.writeFileSync(filePath, JSON.stringify(ret));
	}
};

function writeAbbrevData(opts, jurisID, abbrevVariantName, abbrevs) {
	var variantName = abbrevVariantName ? "-" + abbrevVariantName : "";
	var fileName = "auto-" + jurisID + variantName + ".json";
	var filePath = path.join(config.path.jurisAbbrevsDir, fileName);
	var sameData = false;
	if (fs.existsSync(filePath)) {
		var oldObj = JSON.parse(fs.readFileSync(filePath).toString());
		oldObj.version = abbrevs.version;
		sameData = deepEqual(oldObj, abbrevs);
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
