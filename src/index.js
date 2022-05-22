require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const session = require('express-session')
const cors = require('cors')
const API_ENDPOINT = 'https://discord.com/api/v8'
const REDIRECT_URI = 'http://localhost:3000';
const fetch = require('cross-fetch')
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const cookieParser = require('cookie-parser');
var passport
const Passport = require('discord-passport')
app.use(cookieParser());
const path = require('path')

const roleId = '811747885245923359'
const guildId = '811747822277885952'
app.use(cors())
app.use(bodyParser.json())
app.use(session({ secret: 'asdasmdklamsdaklsmdklasmdlamsdlakmsdlaksmdlkmdlaksmdakmdla', cookie: { maxAge: 60000 }}))
app.use(express.static(path.join(__dirname, 'static/assets')))


async function initPassport(code, ending) {
    passport = new Passport({
       code: code,
       client_id: process.env.client,
       client_secret: CLIENT_SECRET,
       redirect_uri: REDIRECT_URI + ending,
       scope: ["identify", "guilds", "guilds.members.read"]
   })
   await passport.open();
   const data = {
       access_token: passport.token,
       refresh_token: passport.refresh_token,
       expires_in: passport.expires_in,
   }
   setTimeout(async () => { // After our token expires, get a new one.
       await passport.refresh(); // Updates these values with the new ones.
   }, passport.expires_in);
   return passport
}

async function checkPermissions(passport, id) {
    const raw = await fetch(API_ENDPOINT + `/users/@me/guilds/${guildId}/member`, {
        headers: {
            'Authorization': 'Bearer ' + passport
        }
    })

    const json = await raw.json()
    const roles = json.roles
    for (const i in roles) {
        if (roles[i] === roleId) { 
            return true
        }
    } 
    return false
}

async function authenticate(req,res,ending) {
    if (req.query.code && req.session.hasPerms == undefined) {
        const pas = await initPassport(req.query.code, '/' + ending)
    } 
    if (passport == null) {
        return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=811749458672615454&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F${ending}&response_type=code&scope=identify%20guilds.members.read%20guilds`)
    }
    if (req.session.hasPerms == null) {
        const permissions = await checkPermissions(passport.token, passport.user.id)
        if (permissions == false) {
            // @ts-ignore
            req.session.hasPerms = false
            res.send('no permissions')
             return
        } else if (permissions == true) {
            // @ts-ignore  
            req.session.hasPerms = true
            return true
            
        }
        res.cookie('.bpasecurity', passport.token, { maxAge: passport.expires_in })
        if (!permissions) { 
            res.send('no permissions')
             return
        }
        } else if (req.session.hasPerms == false) {
            res.send('no permissions')
            return
            // @ts-ignore
        } else if (req.session.hasPerms == true) {
            return true
        }
        

}

async function getUserDetailsViaLogin (req,res) {
    if (req.query.code && req.session.hasPerms == undefined) {
        const pas = await initPassport(req.query.code, '/' + ending)
    } 
    if (passport == null) {
        return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=811749458672615454&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F${ending}&response_type=code&scope=identify%20guilds.members.read%20guilds`)
    }
    const userDetails = await passport.user
    return userDetails
}

app.get('/panel', async (req, res) => {
    const l = await authenticate(req,res,'panel')
    if (l == true) {
        res.sendFile(path.join(__dirname,'static/admin.html'))
    }
})

app.get('/register', async (req, res) => {
    const details = await getUserDetailsViaLogin(req,res)
    if (details) { 
        res.sendFile(path.join(__dirname,'static/register.html'))
    }
})

app.get('/api/cur', async (req, res) => {
    const details = passport.user
    if (details) {
        res.json(details)
    }
})


app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`)
    })