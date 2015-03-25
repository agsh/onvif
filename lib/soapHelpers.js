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
		, function(err, result) {
			if (!result || !result['envelope'] || !result['envelope']['body']) {
				callback(new Error('Wrong ONVIF SOAP response'), null, xml);
			} else {
				if (!err && result['envelope']['body'][0]['fault']) {
					err = new Error(
						'ONVIF SOAP Fault: ' +
						(
							result['envelope']['body'][0]['fault'][0]['reason'][0]['text'][0]._
							||
							JSON.stringify(_linerase(result['envelope']['body'][0]['fault'][0]['code'][0]))
						)
					);
				}
				callback(err, result['envelope']['body'], xml);
			}
		});
};

function S4() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

exports.guid = function() {
	return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
};