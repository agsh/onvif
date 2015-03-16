/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 1/20/15.
 */

var xml2js = require('xml2js')
	, numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/
	, prefixMatch = /(?!xmlns)^.*:/
	;

var _linerase = exports._linerase = function(xml) {
	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(_linerase);
		} else {
			xml = xml[0];
		}
	}
	if (typeof xml === 'object') {
		var obj = {};
		Object.keys(xml).forEach(function(key) {
			if (key === '$') {
				obj.$ = _linerase(xml.$);
			} else {
				obj[key] = _linerase(xml[key]);
			}
		});
		return obj;
	} else {
		if (xml === 'true') { return true; }
		if (xml === 'false') { return false; }
		if (numberRE.test(xml)) { return parseFloat(xml); }
		return xml;
	}
};

exports.parseSOAPString = function(xml, callback) {
	xml2js.parseString(
		xml
		, {
			tagNameProcessors: [function (str) {
				str = str.replace(prefixMatch, '');
				var secondLetter = str.charAt(1);
				if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
					return str.charAt(0).toLowerCase() + str.slice(1);
				} else {
					return str;
				}
			}]
		}
		, callback);
};