/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 1/20/15.
 */

var numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/;

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