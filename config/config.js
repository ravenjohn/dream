var config = {
    "mode" : "development",
    "production": {
        "port" : 3000
    },
    "development": {
        "port" : 3000
    }
}

module.exports = config[config.mode];
