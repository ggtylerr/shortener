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

// Index pages
srv.get('/', (req, res) => {
    const host = req.get("host");
    if (host == config.domain) {
        res.sendFile("dist/index.html");
    }
    else {
        const sub = req.subdomains.join(".");
        const service = config.services.find((s) => s.slug === sub);
        if (!service) {
            res.statusCode = 500;
            res.send("Service not found - tell the admin to add it to the config file!");
        } 
        else {
            /* 
            This redirects the subdomains to the main domain's slug redirect.
            Why? Because of CORS. While it can technically be feasible to apply
            CORS onto the cookies, it'd require resetting them each time a location
            is added. It would also require the sysadmin to either change their reverse
            proxy config each time a change is made, or for this program to somehow
            edit it automatically. While this does introduce a little bit more
            latency, this is simply the most reasonable middle ground.

            As for using wildcards - that is simply insecure and some browsers
            outright deny it. See https://security.stackexchange.com/a/251841
            for more details.
            */
            res.redirect(`https://${config.domain}/${req.subdomains.join("/")}`);
        }
    }
});

// Subdomains
srv.get('/*', (req, res) => {
    const host = req.get("host");
    const sub = req.subdomains.join(".");
    const service = config.services.find((s) => s.slug === sub);
    if (!service) {
        res.statusCode = 500;
        res.send("Service not found - tell the admin to add it to the config file!");
    } 
    else res.redirect(`https://${config.domain}/${req.subdomains.join("/")}`);
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