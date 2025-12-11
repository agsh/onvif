/**
 * @namespace cam
 * @description Analytics section for Cam class
 * @author Arteco Global S.p.A. <developers@arteco-global.com>
 * @licence MIT
 */
module.exports = function(Cam) {

	const linerase = require('./utils').linerase;

	/**
	 * Get the whole set of analytics rules supported by the device
	 * @param {string} options.configurationToken Contains a reference to the AnalyticsConfiguration to use.
	 * @param {Cam~GetSupportedRules} [callback]
	 */
	Cam.prototype.getSupportedRules = function(options, callback) {
		this._request({
			service: 'analytics'
			, body: this._envelopeHeader() +
				'<GetSupportedRules xmlns="http://www.onvif.org/ver20/analytics/wsdl">' +
				    '<ConfigurationToken>' + options.configurationToken + '</ConfigurationToken>' +
			    '</GetSupportedRules>' +
				this._envelopeFooter()
		}, function(err, data, xml) {
			if (!err) {
				/**
				 * Rules supported by the device
				 */
				this.rules = linerase(data).getSupportedRulesResponse.supportedRules.ruleDescription;	// Array of RuleDescription
			}
			if (callback) {
				callback.call(this, err, this.rules, xml);
			}
		}.bind(this));
	};



};