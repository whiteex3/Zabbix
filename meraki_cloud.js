var params = JSON.parse(value);

var request = new HttpRequest();

request.addHeader('X-Cisco-Meraki-API-Key:' + params.token);
request.addHeader('User-Agent: ZabbixServer/1.0 Zabbix');

var response,
    error_msg = '',
    organizations = [],
    devices = [];

function getHttpData(url) {
    response = request.get(url);

    if (response !== null) {
        try {
            response = JSON.parse(response);
        } catch (error) {
            throw 'Failed to parse response received from Meraki API. Check debug log for more information.';
        }
    }

    if (request.getStatus() !== 200) {
        if (response.errors) {
            throw response.errors.join(', ');
        } else {
            throw 'Failed to receive data: invalid response status code.';
        }
    }

    if (typeof response !== 'object' || response === null) {
        throw 'Cannot process response data: received data is not an object.';
    }

    return response;
}

function replaceAtWithDash(str) {
    return str.replace(/@/g, '-');
}

function fixNullWan1Ip(devicesArray) {
    for (var i = 0; i < devicesArray.length; i++) {
        var device = devicesArray[i];
        if (device.wan1Ip === null && device.wan2Ip !== null) {
            device.wan1Ip = device.wan2Ip;
        }
    }
    return devicesArray;
}

try {
    if (params.token === '{' + '$MERAKI.TOKEN}') {
        throw 'Please change {' + '$MERAKI.TOKEN} macro with the proper value.';
    }

    if (params.url.indexOf('http://') === -1 && params.url.indexOf('https://') === -1) {
        params.url = 'https://' + params.url;
    }

    if (!params.url.endsWith('/')) {
        params.url += '/';
    }

    if (typeof params.httpproxy !== 'undefined' && params.httpproxy !== '') {
        request.setProxy(params.httpproxy);
    }

    organizations = getHttpData(params.url + 'organizations');

    if (Array.isArray(organizations) && organizations.length > 0) {
        for (var i = 0; i < organizations.length; i++) {
            if ('id' in organizations[i]) {
                var organization_devices = getHttpData(params.url + 'organizations/' + encodeURIComponent(organizations[i].id) + '/devices');

                if (Array.isArray(organization_devices) && organization_devices.length > 0) {
                    for (var j = 0; j < organization_devices.length; j++) {
                        organization_devices[j].organizationId = organizations[i].id;
                        organization_devices[j].name = replaceAtWithDash(organization_devices[j].name);

                        devices.push(organization_devices[j]);
                    }
                }
            }
        }
    }

    // Call the function to fix null wan1Ip values
    devices = fixNullWan1Ip(devices);
} catch (error) {
    error_msg = error;
}

organizations = JSON.stringify(organizations).replace(/@/g, '-');
devices = JSON.stringify(devices).replace(/@/g, '-');
error_msg = error_msg.toString().replace(/@/g, '-');

return JSON.stringify({
    'organizations': organizations,
    'devices': devices,
    'error': error_msg
});