module.exports = function(Cam) {
	const linerase = require('./utils').linerase;

	/**
	 * @typedef {object} Cam~User
	 * @property {string} username
	 * @property {string} password
	 * @property {string} userLevel 'Administrator', 'Operator', 'User', 'Anonymous' or 'Extended'
	 */

	/**
	 * @callback Cam~GetUsersCallback
	 * @property {?Error} error
	 * @property {Array.<Cam~User>} videoSourceConfigurations
	 * @property {string} xml Raw SOAP response
	 * The password is not included in the response even if it is present in Cam~User
	 */

	/**
	 * Get the list of Username and their User level.
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.getUsers = function(callback) {
		this._request({
			service: 'device'
			, body: this._envelopeHeader() +
			'<GetUsers xmlns="http://www.onvif.org/ver10/device/wsdl" />' +
			this._envelopeFooter()
		}, function(err, data, xml) {
			if (callback) {
				if (!err) {
					var users = data[0].getUsersResponse[0].user;
					users = users.map(function(user) {
						return linerase(user);
					});
					data = users;
				}
				callback.call(this, err, data, xml);
			}
		}.bind(this));
	};

	/**
	 * Create one or more users
	 * @param {Array.<Cam~User>} [users]
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.createUsers = function(users,callback) {
		const usersOk = users.every(function(user) {
			if (!user.username || !user.password || !user.userLevel) {
				return false;
			}
			return true;
		});
		if (!usersOk) {
			callback.call(this,new Error('Missing username, password or user level'),null,null);
			return;
		}
		var usersXml = '';
		users.forEach(function(user) {
			usersXml += '<User>' +
				'<Username xmlns="http://www.onvif.org/ver10/schema">' + user.username + '</Username>' +
				'<Password xmlns="http://www.onvif.org/ver10/schema">' + user.password + '</Password>' +
				'<UserLevel xmlns="http://www.onvif.org/ver10/schema">' + user.userLevel + '</UserLevel>' +
			'</User>';
		});
		var body = this._envelopeHeader() +
			'<CreateUsers xmlns="http://www.onvif.org/ver10/device/wsdl">' +
				usersXml +
			'</CreateUsers>' +
			this._envelopeFooter();
		this._request({
			service: 'device'
			, body: body,
		}, function(err, data, xml) {
			if (callback) {
				if (err) {
					callback.call(this, err, data, xml);
				} else {
					this.getUsers(callback);
				}
			}
		}.bind(this));
	};

	/**
	 * Set the Password and User level of one or more users by their Username
	 * @param {Array.<Cam~User>} [users]
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.setUsers = function(users,callback) {
		const usersOk = users.every(function(user) {
			if (!user.username || !user.password || !user.userLevel) {
				return false;
			}
			return true;
		});
		if (!usersOk) {
			callback.call(this,new Error('Missing username, password or user level'),null,null);
			return;
		}
		var usersXml = '';
		users.forEach(function(user) {
			usersXml += '<User>' +
				'<Username xmlns="http://www.onvif.org/ver10/schema">' + user.username + '</Username>' +
				'<Password xmlns="http://www.onvif.org/ver10/schema">' + user.password + '</Password>' +
				'<UserLevel xmlns="http://www.onvif.org/ver10/schema">' + user.userLevel + '</UserLevel>' +
			'</User>';
		});
		var body = this._envelopeHeader() +
			'<SetUser xmlns="http://www.onvif.org/ver10/device/wsdl">' + // Although SetUser is not plural, we can set multiple users at a time
				usersXml +
			'</SetUser>' +
			this._envelopeFooter();
		this._request({
			service: 'device'
			, body: body,
		}, function(err, data, xml) {
			if (callback) {
				if (err) {
					callback.call(this, err, data, xml);
				} else {
					var delayGet = false;
					users.some(function(usr) {
						if (usr.username === this.username) {
							delayGet = true;
							this.password = usr.password;
							return true;
						}
					});
					if (delayGet) { // On some cameras, changing the user password we currently use is not effective right away
						setTimeout((function() {this.getUsers(callback);}).bind(this),2000);
					} else {
						this.getUsers(callback);
					}
				}
			}
		}.bind(this));
	};

	/**
	 * Delete one or more users by their Username
	 * @param {Array.<Cam~User> | Array.<string>} [users]
	 * @param {Cam~GetUsersCallback} [callback]
	 */
	Cam.prototype.deleteUsers = function(users,callback) {
		var usernames = [];
		users.forEach(function(user) {
			if (typeof user == 'string' && user.length > 0) {
				usernames.push(user);
			} else if (typeof user == 'object' && user.username) {
				usernames.push(user.username);
			}
		});
		if (!usernames.length) {
			return callback.call(this,new Error('No username'),null,null);
		}
		var usersXml = '';
		usernames.forEach(function(username) {
			usersXml += '<Username>' + username + '</Username>';
		});
		var body = this._envelopeHeader() +
			'<DeleteUsers xmlns="http://www.onvif.org/ver10/device/wsdl">' +
				usersXml +
			'</DeleteUsers>' +
			this._envelopeFooter();
		this._request({
			service: 'device'
			, body: body,
		}, function(err, data, xml) {
			if (callback) {
				if (err) {
					callback.call(this, err, data, xml);
				} else {
					this.getUsers(callback);
				}
			}
		}.bind(this));
	};
};
