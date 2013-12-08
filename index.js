var http = require("http"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    config = require(__dirname + "/config/config"),
    format = "json",
    action,
    method,
    controllers_cache = {},
    supported_formats = {
		json : "application/json",
		jsonp : "application/javascript",
		html : "text/html",
		csv : "application/csv"
    };

var log = function(body, mode){
    var mode = mode || "debug",
        date = new Date();
    date = [date.getMonth(), date.getDay(), date.getFullYear(), mode];
    fs.appendFile("logs/" + date.join("_") + ".log", body + "\n", function (err) {
        err && console.log(err);
    });
};

var respond = function (response, data, http_code) {
    http_code = http_code || 200;
    response.writeHead(http_code, {
        "Content-Type" : supported_formats[format],
        "HTTP/1.1" : http_code,
        "Status" : http_code,
        "Access-Control-Allow-Origin" : "*",
        "Access-Control-Allow-Methods" : "OPTIONS, DELETE, PUT",
        "Access-Control-Allow-Headers" : "Origin, X-Requested-With, Content-Type, Accept"
    });
    data.method = method.toUpperCase();
    data.action = action;
    switch (format) {
        case "json" : data = JSON.stringify(data); break;
        case "csv" : data = data.join(",");
    }
    response.write(""+data);
    response.end();
    console.timeEnd("time");
};

var listener = function(request, response){
    var url = request.url,
        temp,
        dotmark,
        qmark,
        controller_name,
        controller_path,
        exists_cb;

    console.time("time");

    method = request.method.toLowerCase();
    action = "index";

    ((qmark = url.indexOf("?")) != -1) && (url = url.substring(0, qmark));

    if ((dotmark = url.indexOf(".")) != -1) {
        format = url.substring(dotmark + 1, url.length);
        url = url.substring(0, dotmark);
    }

    if (url === "/") {
        return respond(response, {message : "Wrong call"}, 403);
    }

    temp = url.split("/");
    controller_name = temp[1].toLowerCase();
    controller_path = "controllers/" + controller_name;

    exists_cb = function (exists) {
        var controller;

        temp[2] && temp[2] != "" && (action = temp[2]);
        action += "_" + method;
        if (!exists) {
            return respond(response, {message : "controller does not exist"}, 400);
        }

        controller = controllers_cache[controller_name] || (controllers_cache[controller_name] = require(__dirname + "/" + controller_path));

        if (!controller[action]) {
            return respond(response, {message : "action does not exist"}, 400);
        }

        respond(response, controller[action](request.body));
    };

    fs.exists(controller_path + ".js", exists_cb);
};

http.createServer(listener).listen(config.port);

console.log("Server now running at http://localhost:" + config.port);
