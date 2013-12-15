var http = require("http"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    config = require(__dirname + "/config/config"),
    ctrlrs_cache = {},

    log = function(body, mode){
        var date = new Date();
        fs.appendFile(config.logs_folder + [date.getMonth(), date.getDay(), date.getFullYear(), mode || "debug"].join("_") + ".log", body + "\n", function (err) {
            err && console.log(err);
        });
    },

    respond = function (response, req, data, http_code) {

        response.writeHead((http_code = http_code || 200), {
            "Content-Type" : "application/json",
            "HTTP/1.1" : http_code,
            "Status" : http_code,
            "Access-Control-Allow-Origin" : "*",
            "Access-Control-Allow-Methods" : "OPTIONS, DELETE, PUT",
            "Access-Control-Allow-Headers" : "Origin, X-Requested-With, Content-Type, Accept"
        });

        data.method = req.method.toUpperCase();
        data.action = req.action;

        response.write(JSON.stringify(data));
        response.end();

        console.timeEnd("time");
    },

    listener = function(request, response){
        console.log(request.params);
        console.log(request.body);
        console.log(request.query);
        var url = request.url,
            ctrlr_name,
            ctrlr_path,
            req = {
                action : "index",
                method : request.method.toLowerCase()
            };

        console.time("time");

        ~(ctrlr_name = url.indexOf(".")) && (url = url.substring(0, ctrlr_name));
        ~(ctrlr_name = url.indexOf("?")) && (url = url.substring(0, ctrlr_name));

        if (url === "/")
            return respond(response, req, {message : "Wrong call"}, 400);

        fs.stat((ctrlr_path = "controllers/" + (ctrlr_name = (url = url.split("/"))[1].toLowerCase())) + ".js", function(err, stats){
            var ctrlr;

            if (err != null)
                return respond(response, req, {message : "Controller " + ctrlr_name + " does not exist"}, 404);

            if (!ctrlrs_cache[ctrlr_name] || (ctrlrs_cache[ctrlr_name].mtime != +stats.mtime)) {
                delete require.cache[(__dirname + "/" + ctrlr_path + ".js").replace(/(\\|\/)/g, "\\")];
                ctrlrs_cache[ctrlr_name] = require(__dirname + "/" + ctrlr_path);
                ctrlrs_cache[ctrlr_name].mtime = +stats.mtime;
            }

            url[2] && url[2] != "" && (req.action = url[2]);

            if (!(ctrlr = ctrlrs_cache[ctrlr_name][(req.action += "_" + req.method)]))
                return respond(response, req, {message : "Method " + req.action + " does not exist"}, 404);

            return respond(response, req, ctrlr(request.body));
        });
    };

http.createServer(listener).listen(config.port);

console.log("Server now running at http://localhost:" + config.port);
