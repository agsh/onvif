/**
 * @namespace utils
 * @description Common utils module
 * @author Andrew D.Laptev <a.d.laptev@gmail.com>
 * @licence MIT
 */

const xml2js = require('xml2js')
	;

 const numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/
	; const dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/
	; const prefixMatch = /(?!xmlns)^.*:/
	;

/**
 * Parse SOAP object to pretty JS-object
 * @param {object} xml
 * @returns {object}
 */
const linerase = function(xml) {
	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(linerase);
		}
			xml = xml[0];

	}
	if (typeof xml === 'object') {
		const obj = {};
		Object.keys(xml).forEach((key) => {
			obj[key] = linerase(xml[key]);
		});
		return obj;
	}
		if (xml === 'true') { return true; }
		if (xml === 'false') { return false; }
		if (numberRE.test(xml)) { return parseFloat(xml); }
		if (dateRE.test(xml)) { return new Date(xml); }
		return xml;

};

/**
 * @callback ParseSOAPStringCallback
 * @property {?Error} error
 * @property {object} SOAP response
 * @property {string} raw XML
 */

/**
 * Parse SOAP response
 * @param {string} xml
 * @param {ParseSOAPStringCallback} callback
 */
const parseSOAPString = function(xml, callback) {
	/* Filter out xml name spaces */
	xml = xml.replace(/xmlns([^=]*?)=(".*?")/g,'');

	try {
		xml2js.parseString(
			xml
			, {
				tagNameProcessors : [function(str) {
					str = str.replace(prefixMatch, '');
					const secondLetter = str.charAt(1);
					if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
						return str.charAt(0).toLowerCase() + str.slice(1);
					}
						return str;

				}]
			}
			, (err, result) => {
				if (!result || !result.envelope || !result.envelope.body) {
					callback(new Error('Wrong ONVIF SOAP response'), null, xml);
				} else {
					if (!err && result.envelope.body[0].fault) {
						const fault = result.envelope.body[0].fault[0];
						let reason;
						try {
							if (fault.reason[0].text[0]._) {
								reason = fault.reason[0].text[0]._;
							}
						} catch (e) {
							reason = '';
						}
						if (!reason) {
							try {
								reason = JSON.stringify(linerase(fault.code[0]));
							} catch (e) {
								reason = '';
							}
						}
						let detail = '';
						try {
							detail = fault.detail[0].text[0];
						} catch (e) {
							detail = '';
						}

						// console.error('Fault:', reason, detail);
						err = new Error(`ONVIF SOAP Fault: ${  reason  }${detail}`);
					}
					callback(err, result.envelope.body, xml);
				}
			}
		);
	} catch (err) {
		callback(err, '', xml);
	}
};

const s4 = function() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
};

/**
 * Generate GUID
 * @returns {string}
 */
const guid = function() {
	return (`${s4() + s4()  }-${  s4()  }-${  s4()  }-${  s4()  }-${  s4()  }${s4()  }${s4()}`);
};

module.exports = {
	linerase
	, parseSOAPString
	, guid
};
