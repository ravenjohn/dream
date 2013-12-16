var http = require("http"),
    qs = require("querystring"),
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

    respond = function (req, res, data, http_code) {

        res.writeHead((http_code = http_code || 200), {
            "Content-Type" : "application/json",
            "HTTP/1.1" : http_code,
            "Status" : http_code,
            "Access-Control-Allow-Origin" : "*",
            "Access-Control-Allow-Methods" : "OPTIONS, DELETE, PUT",
            "Access-Control-Allow-Headers" : "Origin, X-reqed-With, Content-Type, Accept"
        });

        data.response_time = +new Date() - req.response_time;
        data.method = req.method.toUpperCase();
        data.action = req.action;

        res.write(JSON.stringify(data));
        res.end();

    },

    listener = function(req, res){
        var url = req.url,
            ctrlr_name,
            ctrlr_path;

        req.response_time = +new Date();
        req.action = "index";
        req.method = req.method.toLowerCase();
        req.body = {};

        req.on('data', function(chunk) {
            req.body = qs.parse(chunk.toString());
        });

        req.on('end', function() {

            ~(ctrlr_name = url.indexOf(".")) && (url = url.substring(0, ctrlr_name));

            if (~(ctrlr_name = url.indexOf("?"))) {
                ctrlr_path = qs.parse(url.substring(ctrlr_name + 1));
                url = url.substring(0, ctrlr_name);
                for (ctrlr_name in ctrlr_path)
                    req.body[ctrlr_name] = ctrlr_path[ctrlr_name];
            }

            if (url === "/")
                return respond(req, res, {message : "Wrong call"}, 400);

            fs.stat((ctrlr_path = "controllers/" + (ctrlr_name = (url = url.split("/"))[1].toLowerCase())) + ".js", function(err, stats){
                var ctrlr,
                    rqd_flds;

                if (err != null)
                    return respond(req, res, {message : "Controller " + ctrlr_name + " does not exist"}, 404);

                if (!ctrlrs_cache[ctrlr_name] || (ctrlrs_cache[ctrlr_name].mtime != +stats.mtime)) {
                    delete require.cache[(__dirname + "/" + ctrlr_path + ".js").replace(/(\\|\/)/g, "\\")];
                    ctrlrs_cache[ctrlr_name] = require(__dirname + "/" + ctrlr_path);
                    ctrlrs_cache[ctrlr_name].mtime = +stats.mtime;
                }

                url[2] && url[2] != "" && (req.action = url[2]);

                if (!(ctrlr = ctrlrs_cache[ctrlr_name][(req.action += "_" + req.method)]))
                    return respond(req, res, {message : "Method " + req.action + " does not exist"}, 404);

                if (rqd_flds = ctrlr.rqd_flds)
                    for (ctrlr_name in rqd_flds)
                        if (ctrlr_name > -1 && !req.body[rqd_flds[ctrlr_name]])
                            return respond(req, res, {message : "Parameter " + rqd_flds[ctrlr_name] + " does not exist"}, 404);

                return respond(req, res, ctrlr(req.body));
            });
        });
    };

http.createServer(listener).listen(config.port);

console.log("Server now running at http://localhost:" + config.port);
