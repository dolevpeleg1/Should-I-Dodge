## Submitted by: 
- Dolev Peleg (directory id: avplg, student id: 120480621)

## Group Members: 
- Dolev Peleg (avplg)

## App Description: 
- Calculates odds of winning a League of Legends game, also provides video guides about characters in the game.

## YouTube Video Link: 
[Demo](https://youtu.be/pL3-jzMv1bE)

## APIs: 
- [YouTube Data API](https://console.cloud.google.com/apis/library/youtube.googleapis.com?pli=1&inv=1&invt=AbxvyA&project=idyllic-kit-460223-s9)

## Contact Email:  
- avplg@terpmail.umd.edu

## Deployed App Link: 
[ShouldIDodge](https://DodgeCalculator-gvc5.onrender.com/dodgeCalculator)

## Local setup (MongoDB Atlas)

This app uses [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free **M0** tier is enough for this project).

1. Create a free Atlas account and a **M0** cluster.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add your IP (or `0.0.0.0/0` for development only).
4. **Connect** → **Drivers** → copy the connection string.
5. Copy `.env.example` to `.env` and set:
   - `MONGO_CONNECTION_STRING` — paste the URI; replace `<password>` with your user's password.
   - `MONGO_DATABASE_NAME` — e.g. `should_i_dodge` (created automatically on first signup).
   - `YOUTUBE_API_KEY` — if you use champion video guides.
6. Run `npm install` then `npm start`.

The old class database name (`CMSC335DB`) is no longer used; new data goes to the database name in your `.env`.

## Disclaimers: 
- I originally wanted to use an API to get data for the game League of Legends to calculate the winning chance, but I had to wait for an official approval from the game company, so I decided to generate my own JSON file with the data from this website: https://op.gg/lol/statistics/champions. I used ChatGPT to generate this data quickly (its a long repetitive list). Once I get the approval later on, I will try to use their API instead.
- I used Axios and Youtube API to generate the video guides. I used Axios for my internship last summer, so I was familiar with it. I did not know how to use the Youtube API, so I searched data online on how to utilize it.
- In order to use the app, users have to create an account, which is stored on my MongoDB cluster, and then log in.
