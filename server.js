const fs = require('fs');
const toml = require('toml');
const HyperExpress = require('hyper-express');
const srv = new HyperExpress.Server();

// Load config
if (!fs.existsSync("./config.toml")) {
    console.log(
        "Config doesn't exist. Please rename 'config.toml.example'" +
        "to 'config.toml' and configure it before launching."
    );
    process.exit(1);
}
let config = fs.readFileSync("./config.toml", "utf8");
try {
    config = toml.parse(config);
} catch (e) {
    console.error(`Config parsing error on ${e.line} : ${e.column}, message: ${e.message}`);
}

// Server index
srv.get('/', (req, res) => {
    const host = req.get("host");
    if (host == config.domain) {
        res.sendFile("dist/index.html");
    }
    else {
        const sub = /:\/\/([^/]+)/.exec(hostname)[1];
        const service = config.services.find((s) => s.slug === sub);
        if (!service) {
            res.statusCode = 500;
            res.send("Service not found - tell the admin to add it to the config file!");
        } 
        else redirect(req, res, service);
    }
});

// Subdomains
srv.get('/*', (req, res) => {
    const host = req.get("host");
    const sub = /:\/\/([^/]+)/.exec(host)[1];
    const service = config.services.find((s) => s.slug === sub);
    if (!service) {
        res.statusCode = 500;
        res.send("Service not found - tell the admin to add it to the config file!");
    } 
    else redirect(req, res, service);
});

// Slugs on main domain
config.services.forEach((service) => {
    srv.get(`/${service.slug}`, (req, res) => {
        const host = req.get("host");
        if (host !== config.domain) {
            res.statusCode = 404;
            res.send("bad redirect");
        } 
        else redirect(req, res, service, true);
    });
    srv.get(`/${service.slug}/*`, (req, res) => {
        const host = req.get("host");
        if (host !== config.domain) {
            res.statusCode = 404;
            res.send("bad redirect");
        } 
        else redirect(req, res, service, true);
    });
});

const redirect = (req, res, service, slug=false) => {
    const headers = req.headers;
    // Check for cookies
    const cookies = headers.cookie?.split('; ').reduce((a, v) => {
        const [key, value] = v.trim().split('=');
        return {...a, [key]: value};
    }, {});

    // Check for location cookie
    const loc = cookies?.loc ?? config.defaultLoc ?? config.locations[0].slug;

    // Validate location
    const targetService = service[loc];
    if (!targetService) {
        res.statusCode = 400;
        return res.send("incorrect location set - maybe it changed?");
    }

    // Construct redirect URL
    let path = service.path || req.originalUrl;
    path = slug ? path.replace(`/${service.slug}`, '') : path;
    res.redirect(`https://${targetService}${path}`);
}

// Listen
srv.listen(config.port)
    .then(() => console.log(`Server started on port ${config.port}`))
    .catch(() => console.error(`Failed to start server at designated port ${config.port}`))