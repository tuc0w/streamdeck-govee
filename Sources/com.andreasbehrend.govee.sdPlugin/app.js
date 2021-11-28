/* global $CC, Utils, $SD */

/**
 * Here are a couple of wrappers we created to help you quickly setup
 * your plugin and subscribe to events sent by Stream Deck to your plugin.
 */

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environmet in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */

$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    $SD.on('com.andreasbehrend.govee.power.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('com.andreasbehrend.govee.power.keyUp', (jsonObj) => action.onKeyUp(jsonObj));
    $SD.on('com.andreasbehrend.govee.power.didReceiveSettings', (jsonObj) => action.onDidReceiveSettings(jsonObj));
};

function getState(settings, callback) {
    let xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.onload = function () {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            if (xhr.response !== undefined && xhr.response != null) {
                let result = JSON.parse(xhr.response);

                result.data.properties.forEach(function(item) {
                    if (Object.getOwnPropertyNames(item).includes('powerState')) {
                        callback(settings, item.powerState)
                    }
                });
            }
        }
    };
    xhr.open("GET", `https://developer-api.govee.com/v1/devices/state?device=${settings.device}&model=${settings.model}`);
    xhr.setRequestHeader("Govee-API-Key", settings.api_key);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.send();
};

// ACTIONS
const action = {
    settings: {},
    onDidReceiveSettings: function(jsn) {
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
    },

    /** 
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * This event is a good place to setup your plugin and look at current settings (if any),
     * which are embedded in the events payload.
     */
    onWillAppear: function (jsn) {
        console.log("You can cache your settings in 'onWillAppear'", jsn.payload.settings);
        /**
         * The willAppear event carries your saved settings (if any). You can use these settings
         * to setup your plugin or save the settings for later use. 
         * If you want to request settings at a later time, you can do so using the
         * 'getSettings' event, which will tell Stream Deck to send your data 
         * (in the 'didReceiveSettings above)
         * 
         * $SD.api.getSettings(jsn.context);
        */
        this.settings = jsn.payload.settings;

        // Nothing in the settings pre-fill, just something for demonstration purposes
        if (!this.settings || Object.keys(this.settings).length === 0) {
            this.settings.api_key = 'Request your api key first';
        }
    },

    onKeyUp: function (jsn) {
        getState(this.settings, function(settings, currentState) {
            let newState = "on"
            if (currentState == 'on') {
                newState = 'off'
            }

            let xhr = new XMLHttpRequest();
            let data = JSON.stringify({
                "device": settings.device,
                "model": settings.model,
                "cmd": {
                    "name": "turn",
                    "value": newState
                }
            });

            xhr.withCredentials = true;
            xhr.open("PUT", "https://developer-api.govee.com/v1/devices/control");
            xhr.setRequestHeader("Govee-API-Key", settings.api_key);
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.send(data);
        })
    },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
         * (e.g. some value, which is not saved to settings) 
         * You can send this event from Property Inspector (see there for an example)
         */ 

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.doSomeThing({ [sdpi_collection.key] : sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');            
        }
    },

    /**
     * This snippet shows how you could save settings persistantly to Stream Deck software.
     * It is not used in this example plugin.
     */

    saveSettings: function (jsn, sdpi_collection) {
        console.log('saveSettings:', jsn);
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log('setSettings....', this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },
};
