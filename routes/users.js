const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "NEVER EVER MAKE THIS PUBLIC!";

router.get("/", async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM users");
    return res.json(result.rows);
  } catch (e) {
    return next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const result = await db.query(
      "INSERT INTO users (username, password) VALUES ($1,$2) RETURNING *",
      [req.body.username, hashedPassword]
    );
    return res.json(result.rows[0]);
  } catch (e) {
    return next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    // try to find the user first
    const foundUser = await db.query(
      "SELECT * FROM users WHERE username=$1 LIMIT 1",
      [req.body.username]
    );
    if (foundUser.rows.length === 0) {
      return res.json({ message: "Invalid Username" });
    }
    // if the user exists, let's compare their hashed password to a new hash from req.body.password
    const hashedPassword = await bcrypt.compare(
      req.body.password,
      foundUser.rows[0].password
    );
    // bcrypt.compare returns a boolean to us, if it is false the passwords did not match!
    if (hashedPassword === false) {
      return res.json({ message: "Invalid Password" });
    }

    // let's create a token using the sign() method
    const token = jwt.sign(
      // the first parameter is an object which will become the payload of the token
      { username: foundUser.rows[0].username },
      // the second parameter is the secret key we are using to "sign" or encrypt the token
      SECRET,
      // the third parameter is an object where we can specify certain properties of the token
      {
        expiresIn: 60 * 60 // expire in one hour
      }
    );
    // send back an object with the key of token and the value of the token variable defined above
    return res.json({ token });
  } catch (e) {
    return res.json(e);
  }
});

function ensureLoggedIn(req, res, next) {
  try {
    const authHeaderValue = req.headers.authorization;
    const token = jwt.verify(authHeaderValue, SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

router.get("/secret", ensureLoggedIn, async function(req, res, next) {
  try {
    return res.json({ message: "You made it!" });
  } catch (err) {
    return res.json(err);
  }
});

function ensureCorrectUser(req, res, next) {
  try {
    const authHeaderValue = req.headers.authorization;
    const token = jwt.verify(authHeaderValue, SECRET);
    if (token.username === req.params.username) {
      return next();
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

router.get("/:username", ensureCorrectUser, async function (req, res, next) {
  try {
    return res.json({ message: "You made it!" });
  } catch (err) {
    return res.json(err);
  }
});

module.exports = router;
