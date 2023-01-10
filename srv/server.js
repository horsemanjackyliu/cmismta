const express = require('express');
const app = express();
const xsenv = require('@sap/xsenv');
xsenv.loadEnv();
const services = xsenv.getServices({
    uaa: { label: 'xsuaa' }
});
var axios = require('axios');
var qs = require('qs');
const servicesdm = xsenv.getServices({ sdm: { label: 'sdm' } });
const uaa = servicesdm.sdm.uaa;

var cmis = require('cmis');

const xssec = require('@sap/xssec');
const passport = require('passport');
passport.use('JWT', new xssec.JWTStrategy(services.uaa));
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
    session: false
}));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/srv', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        res.status(200).send('cmismta');
    } else {
        res.status(403).send('Forbidden');
    }
});


app.get('/srv/cmis', function (req, res) {
    let auth = uaa.clientid.concat(":").concat(uaa.clientsecret);
    const buff = Buffer.from(auth, 'utf-8');
    const base64 = buff.toString('base64');
    const headauth = "Basic ".concat(base64);
    var data = qs.stringify({
        'grant_type': 'client_credentials'
    });
    var config = {
        method: 'post',
        url: uaa.url.concat("/oauth/token"),
        headers: {
            'Authorization': headauth,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    };
    axios(config)
        .then(function (response) {
            let session = new cmis.CmisSession(servicesdm.sdm.uri.concat("browser"));
            console.log(servicesdm.sdm.uri.concat("browser"));
            session.setToken(response.data.access_token).loadRepositories().then(() => session.query("select * from cmis:document"))
                .then(data => {
                    res.status(200).send(data);
                }).catch(err => {
                    res.status(501).send(err);
                });
        })
        .catch(function (error) {
            console.log(error);
        });
});

app.get('/srv/user', function (req, res) {
    if (req.authInfo.checkScope('$XSAPPNAME.User')) {
        res.status(200).json(req.user);
    } else {
        res.status(403).send('Forbidden');
    }
});

const port = process.env.PORT || 5001;
app.listen(port, function () {
    console.info('Listening on http://localhost:' + port);
});