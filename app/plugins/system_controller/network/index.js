'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var iwlist = require('./lib/iwlist.js');
var ifconfig = require('./lib/ifconfig.js');
var config = new (require('v-conf'))();
var ip = require('ip');
var isOnline = require('is-online');
var os = require('os');


// Define the ControllerNetwork class
module.exports = ControllerNetwork;

function ControllerNetwork(context) {
	var self = this;

	// Save a reference to the parent commandRouter
	self.context = context;
	self.commandRouter = self.context.coreCommand;

	self.logger = self.context.logger;
}

ControllerNetwork.prototype.onVolumioStart = function () {
	var self = this;
	//Perform startup tasks here

	//getting configuration
	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	config.loadFile(configFile);

    return libQ.resolve();
};

ControllerNetwork.prototype.onStop = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetwork.prototype.onRestart = function () {
	var self = this;
	//Perform startup tasks here
};

ControllerNetwork.prototype.onInstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.onUninstall = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.getConfigurationFiles = function () {
	var self = this;

	return ['config.json'];
};

ControllerNetwork.prototype.getUIConfig = function () {
	var self = this;

	var lang_code = self.commandRouter.sharedVars.get('language_code');

	var defer=libQ.defer();
	self.commandRouter.i18nJson(__dirname+'/../../../i18n/strings_'+lang_code+'.json',
		__dirname+'/../../../i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{


	//dhcp
	uiconf.sections[1].content[0].value = config.get('dhcp');

	//static ip
	uiconf.sections[1].content[1].value = config.get('ethip');

	//static netmask
	uiconf.sections[1].content[2].value = config.get('ethnetmask');

	//static gateway
	uiconf.sections[1].content[3].value = config.get('ethgateway');


	//Wireless

	//dhcp
	  //dhcp
        if (config.get('wirelessdhcp') == undefined) {
            uiconf.sections[2].content[0].value = true;
        } else {
            uiconf.sections[2].content[0].value = config.get('wirelessdhcp');
        }

	//static ip
	uiconf.sections[2].content[1].value = config.get('wirelessip');

	//static netmask
	uiconf.sections[2].content[2].value = config.get('wirelessnetmask');

	//static gateway
	uiconf.sections[2].content[3].value = config.get('wirelessgateway');

	//console.log(uiconf);

			defer.resolve(uiconf);
		})
		.fail(function()
		{
			defer.reject(new Error());
		})

	return defer.promise
};

ControllerNetwork.prototype.setUIConfig = function (data) {
	var self = this;

	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');

};

ControllerNetwork.prototype.getConf = function (varName) {
	var self = this;

	return self.config.get(varName);
};

ControllerNetwork.prototype.setConf = function (varName, varValue) {
	var self = this;

	self.config.set(varName, varValue);
};

//Optional functions exposed for making development easier and more clear
ControllerNetwork.prototype.getSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.setSystemConf = function (pluginName, varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.getAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};

ControllerNetwork.prototype.setAdditionalConf = function () {
	var self = this;
	//Perform your installation tasks here
};


ControllerNetwork.prototype.getWirelessNetworks = function (defer) {
	var self = this;
	var networksarray = [];

	var defer = libQ.defer();
	iwlist.scan('wlan0', function (err, networks) {
		var self = this;
		var networksarray = networks;
		var networkresults = {"available": networksarray}
		defer.resolve(networkresults);
	});
	return defer.promise;
};


ControllerNetwork.prototype.saveWiredNet = function (data) {
	var self = this;

	var defer = libQ.defer();

	var dhcp = data['dhcp'];
	var static_ip = data['static_ip'];
	var static_netmask = data['static_netmask'];
	var static_gateway = data['static_gateway'];

	//	fs.copySync(__dirname + '/config.json', __dirname + '/config.json.orig');

	config.set('dhcp', dhcp);
	config.set('ethip', static_ip);
	config.set('ethnetmask', static_netmask);
	config.set('ethgateway', static_gateway);


	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));


	defer.resolve({});
	return defer.promise;
};

ControllerNetwork.prototype.saveWirelessNet = function (data) {
	var self = this;

	var defer = libQ.defer();

	var dhcp = data['wireless_dhcp'];
	var static_ip = data['wireless_static_ip'];
	var static_netmask = data['wireless_static_netmask'];
	var static_gateway = data['wireless_static_gateway'];

	//	fs.copySync(__dirname + '/config.json', __dirname + '/config.json.orig');
	var wirelessdhcp = config.get('wirelessdhcp');
	if (wirelessdhcp == undefined) {
		config.addConfigValue('wirelessdhcp', 'boolean', dhcp);
		config.addConfigValue('wirelessip', 'string', static_ip);
		config.addConfigValue('wirelessnetmask', 'string', static_netmask);
		config.addConfigValue('wirelessgateway', 'string', static_gateway);
	} else {
		config.set('wirelessdhcp', dhcp);
		config.set('wirelessip', static_ip);
		config.set('wirelessnetmask', static_netmask);
		config.set('wirelessgateway', static_gateway);
	}

	self.rebuildNetworkConfig();
	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_SUCCESS'));


	defer.resolve({});
	return defer.promise;
};


ControllerNetwork.prototype.getData = function (data, key) {
	var self = this;

	for (var i in data) {
		var ithdata = data[i];

		if (ithdata[key] != undefined)
			return ithdata[key];
	}

	return null;
};

/**
 *
 * @param data {ssid:’miarete’, encryption:wpa,password:’’}
 * @returns {*}
 */
ControllerNetwork.prototype.saveWirelessNetworkSettings = function (data) {
	var self = this;

	self.logger.info("Saving new wireless network");

	var network_ssid = data['ssid'];
	var network_pass = data['password'];

	config.set('wlanssid', network_ssid);
	config.set('wlanpass', network_pass);

	self.wirelessConnect({ssid: network_ssid, pass: network_pass});

	self.commandRouter.pushToastMessage('success', self.commandRouter.getI18nString('NETWORK.WIRELESS_RESTART_TITLE'), self.commandRouter.getI18nString('NETWORK.WIRELESS_RESTART_SUCCESS'));
	fs.writeFile('/data/configuration/netconfigured', ' ', function (err) {
		if (err) {
			self.logger.error('Cannot write netconfigured '+error);
		}
	});
};
;

ControllerNetwork.prototype.wirelessConnect = function (data) {
	var self = this;

	if (data.pass) {
		if (data.pass.length <= 13) {
			var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL + 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk="' + data.pass + '"' + os.EOL + '}' + os.EOL + 'network={' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + 'wep_key0="' + data.pass + '"' + os.EOL + 'wep_tx_keyidx=0' + os.EOL + '}';
		} else {
			var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL + 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'psk="' + data.pass + '"' + os.EOL + '}' + os.EOL ;
		}
	} else {
		var netstring = 'ctrl_interface=/var/run/wpa_supplicant' + os.EOL + 'network={' + os.EOL + 'scan_ssid=1' + os.EOL + 'ssid="' + data.ssid + '"' + os.EOL + 'key_mgmt=NONE' + os.EOL + '}';
	}
	fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', netstring, function (err) {
		if (err) {
			self.logger.error('Cannot write wpasupplicant.conf '+error);
		}

		self.commandRouter.wirelessRestart();
	});

};

ControllerNetwork.prototype.rebuildNetworkConfig = function () {
	var self = this;
	var staticwlanfile = '/data/configuration/wlanstatic';

	exec("/usr/bin/sudo /bin/chmod 777 /etc/network/interfaces && /usr/bin/sudo /bin/chmod 777 /etc/dhcp/dhclient.conf", {uid: 1000, gid: 1000}, function (error, stdout, stderr) {
		if (error !== null) {
			console.log('Canot set permissions for /etc/network/interfaces: ' + error);

		} else {
			self.logger.info('Permissions for /etc/network/interfaces set')

			try {
				var ws = fs.createWriteStream('/etc/network/interfaces');

				ws.cork();
				ws.write('auto wlan0\n');
				ws.write('auto lo\n');
				ws.write('iface lo inet loopback\n');
				ws.write('\n');


				ws.write('allow-hotplug eth0\n');
				if (config.get('dhcp') == true || config.get('dhcp') == 'true') {
					ws.write('iface eth0 inet dhcp\n');
				}
				else {
					ws.write('iface eth0 inet static\n');

					ws.write('address ' + config.get('ethip') + '\n');
					ws.write('netmask ' + config.get('ethnetmask') + '\n');
					ws.write('gateway ' + config.get('ethgateway') + '\n');
				}

				ws.write('\n');

				ws.write('allow-hotplug wlan0\n');

				if (config.get('wirelessdhcp') == true || config.get('wirelessdhcp') == 'true') {
					ws.write('iface wlan0 inet manual\n');


					//console.log("Restarting networking layer");
					self.commandRouter.wirelessRestart();
					self.commandRouter.networkRestart();
				}

			} catch (err) {
				self.commandRouter.pushToastMessage('error', self.commandRouter.getI18nString('NETWORK.NETWORK_RESTART_ERROR'), self.getI18NString('NETWORK.NETWORK_RESTART_ERROR') + err);
			}
		}
	});

};


ControllerNetwork.prototype.getInfoNetwork = function () {
	var self = this;

	var defer = libQ.defer();
	var response = [];
	var ethspeed = execSync("/usr/bin/sudo /sbin/ethtool eth0 | grep -i speed | tr -d 'Speed:' | xargs", { encoding: 'utf8' });
	var wirelessspeed = execSync("/usr/bin/sudo /sbin/iwconfig wlan0 | grep 'Bit Rate' | awk '{print $2,$3}' | tr -d 'Rate:' | xargs", { encoding: 'utf8' });
	var ssid = execSync('/usr/bin/sudo /sbin/iwconfig wlan0 | grep ESSID | cut -d\\" -f2', { encoding: 'utf8' });
	var wirelessqualityraw1 = execSync(" /usr/bin/sudo /sbin/iwconfig wlan0 | sed 's/  /\\n/g' | grep Signal | sed 's/Signal level://' | sed 's/Signal level=//' | sed 's/ //g'", { encoding: 'utf8' });
	var wirelessqualityraw2 = wirelessqualityraw1.split('/')[0];
	var wirelessquality = 0;

	if (wirelessqualityraw2 >= 65)
		wirelessquality = 5;
	else if (wirelessqualityraw2 >= 50)
		wirelessquality = 4;
	else if (wirelessqualityraw2 >= 40)
		wirelessquality = 3;
	else if (wirelessqualityraw2 >= 30)
		wirelessquality = 2;
	else if (wirelessqualityraw2 >= 1)
		wirelessquality = 1;

	var ethip = ''
	var wlanip = ''
	var oll = 'no';
	isOnline(function (err, online) {
		if (online) oll = 'yes';
	});

	ifconfig.status('eth0', function (err, status) {
		if (status != undefined) {
			if (status.ipv4_address != undefined && status.running != undefined) {
				ethip = status.ipv4_address
				var running = 'connected';
				if(!status.running) {
					running = 'not connected';
					ethspeed = '0Mb/s';
					oll = 'no';
				}
				var ethstatus = {type: "Wired", ip: ethip, status: running, speed: ethspeed, online: oll}
				response.push(ethstatus);
			}
		}
	});

	ifconfig.status('wlan0', function (err, status) {
		if (status != undefined) {
			if (status.ipv4_address != undefined) {
				wlanip = status.ipv4_address;
				var wlanstatus = {type: "Wireless", ssid: ssid, signal: wirelessquality,ip: wlanip, status: "connected", speed: wirelessspeed, online: oll}
				response.push(wlanstatus);
				//console.log(wlanstatus);

			}
		}
		defer.resolve(response);
	});
//console.log(response);
	return defer.promise;
};
