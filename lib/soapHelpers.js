/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 1/20/15.
 */

var _cropName = exports._cropName = function (name) {
	var colonPos = name.indexOf(':')
		;
	if (~colonPos) {
		name = name.substr(colonPos + 1);
	}
	var secondLetter = name[1];
	if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
		name = name[0].toLowerCase() + name.substr(1);
	}
	return name;
};

var _linerase = exports._linerase = function (xml) {
	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(_linerase);
		} else {
			xml = xml[0];
		}
	}
	if (typeof xml === 'object') {
		var obj = {};
		Object.keys(xml).forEach(function (key) {
			if (key === '$') {
				obj.$ = xml.$;
			} else {
				obj[_cropName(key)] = _linerase(xml[key]);
			}
		});
		return obj;
	} else {
		if (xml === 'true') { return true; }
		if (xml === 'false') { return false; }
		if (!isNaN(parseInt(xml))) { return parseInt(xml); }
		return xml;
	}
};