"use strict";
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt");
const axios = require("axios");

const SALT_ROUNDS = 10;

// env -> both MongoDB and Youtube API key
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

// MongoDB config (database is created on first write in Atlas)
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseName = process.env.MONGO_DATABASE_NAME || "should_i_dodge";
const collectionName = process.env.MONGO_COLLECTION_NAME || "users";

if (!uri) {
  console.error(
    "Missing MONGO_CONNECTION_STRING in .env — see .env.example and README for Atlas setup."
  );
  process.exit(1);
}

// storing data from json file
const filePath = path.join(__dirname, "public", "championWinrates.json");
const fileContent = fs.readFileSync(filePath, "utf8");
const { champions } = JSON.parse(fileContent);

// main page
router.get("/", (request, response) => {
  response.render("index");
});

// sign up
router.get("/signUp", (request, response) => {
  response.render("signUp");
});

// inserting a new user to the db
router.post("/signUp", (request, response) => {
  const userName = request.body.userName;
  const password = request.body.password;
  const confirmPassword = request.body.confirmPassword;

  // check for password validation
  if (password !== confirmPassword) {
    return response.render("passwordError");
  }

  (async () => {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

    try {
      await client.connect();
      const database = client.db(databaseName);
      const collection = database.collection(collectionName);

      // 🔍 check if user already exists
      const existingUser = await collection.findOne({ userName: userName });
      if (existingUser) {
        return response.render("userNameAlreadyExists");
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const applicant = { userName, passwordHash };

      // inserting data
      await collection.insertOne(applicant);
      response.render("confirmation");
    } catch (e) {
      console.error(e);
    } finally {
      await client.close();
    }
  })();
});

// Loging in a user
router.post("/dodgeCalculator", (request, response) => {
  (async () => {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    const userName = request.body.userName;
    const password = request.body.password;

    try {
      await client.connect();
      const database = client.db(databaseName);
      const collection = database.collection(collectionName);

      const user = await collection.findOne({ userName });

      let validPassword = false;
      if (user?.passwordHash) {
        validPassword = await bcrypt.compare(password, user.passwordHash);
      } else if (user?.password) {
        // migrate legacy plaintext accounts on successful login
        validPassword = password === user.password;
        if (validPassword) {
          const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
          await collection.updateOne(
            { userName },
            { $set: { passwordHash }, $unset: { password: "" } }
          );
        }
      }

      if (validPassword) {
        response.render("dodgeCalculator", { champions });
      } else {
        response.render("userNotFound");
      }
    } catch (e) {
      console.error(e);
    } finally {
      await client.close();
    }
  })();
});

router.get("/dodgeCalculator", (request, response) => {
  response.render("dodgeCalculator", { champions });
});

// Getting team compositions from the user
router.post("/results", (request, response) => {
  // ally team
  const allyTeam = [
    request.body.top,
    request.body.jungler,
    request.body.mid,
    request.body.bot,
    request.body.support,
  ].map((champ) => champ.trim().toLowerCase());

  // enemy team
  const enemyTeam = [
    request.body.etop,
    request.body.ejungler,
    request.body.emid,
    request.body.ebot,
    request.body.esupport,
  ].map((champ) => champ.trim().toLowerCase());

  // calculate the winrate for the ally team
  let allyWinrateSum = 0;

  for (let ally of allyTeam) {
    // get the winrate from the json object
    const champion = champions.find(
      (champion) => champion.name.toLowerCase() === ally.toLowerCase()
    );
    if (champion) {
      allyWinrateSum += champion.win_rate;
    }
  }

  // calculate the winrate for the enemy team
  let eWinrateSum = 0;

  for (let enemy of enemyTeam) {
    // get the winrate from the json object
    const champion = champions.find(
      (champion) => champion.name.toLowerCase() === enemy.toLowerCase()
    );
    if (champion) {
      eWinrateSum += champion.win_rate;
    }
  }

  let message = ``;

  // normalize the winrates
  const winrate = allyWinrateSum / 5;
  const ewinrate = eWinrateSum / 5;
  if (winrate > ewinrate) {
    message += `<h3 style="color: rgb(140, 178, 248);">Your team has better odds of winning. Do not dodge.</h3>`;
  } else if (winrate < ewinrate) {
    message += `<h3 style="color: rgb(231, 50, 5);">Enemy team has better odds of winning. Consider dodging.</h3>`;
  } else {
    message += `<h3 style="color: white;">Both teams have equal chance of winning. Good luck, you'll need it.</h3>`;
  }
  response.render("results", {
    winrate: winrate.toFixed(3),
    ewinrate: ewinrate.toFixed(3),
    message: message,
  });
});

// champion page
router.get("/championPage", (request, response) => {
  response.render("championPage", { champions });
});

// generate a video using Youtube API
router.post("/generateVideo", (request, response) => {
  (async () => {
    const champion = request.body.targetChamp;
    const apiKey = process.env.YOUTUBE_API_KEY; // using the API key from env file

    try {
      // use Youtube API to search for the first video guide for the selected champion
      const query = `${champion} league of legends guide`;
      const result = await axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: {
            part: "snippet",
            q: query,
            key: apiKey,
            type: "video",
            maxResults: 1,
          },
        }
      );

      const items = result.data.items;

      // no videos found for the selected champion
      if (!items.length) {
        return response.send("No video found.");
      }

      const videoId = items[0].id.videoId;
      const videoUrl = `https://www.youtube.com/embed/${videoId}`;
      response.render("videoResult", {videoUrl, champion});
    } catch (error) {
      console.error("YouTube API error:", error.message);
      response.status(500).send("Something went wrong when fetching the video.");
    }
  })();
});

module.exports = router;
