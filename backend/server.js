import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import qs from 'qs'; // Import qs module
import authRouter from './routes/autoRoutes.js'; // Ensure the correct path and file name
import { connectDB } from './config/db.js'; // Import only connectDB

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRouter);

// Connect to MongoDB
connectDB(); // Call the function to connect to the database

// Amadeus API integration
let accessToken = null;
let tokenExpiryTime = null;

const getAccessToken = async () => {
  const tokenResponse = await axios.post(
    'https://test.api.amadeus.com/v1/security/oauth2/token',
    qs.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  accessToken = tokenResponse.data.access_token;
  tokenExpiryTime = Date.now() + tokenResponse.data.expires_in * 1000;

  return tokenResponse.data.access_token;
};

const ensureAccessToken = async () => {
  if (!accessToken || Date.now() >= tokenExpiryTime) {
    await getAccessToken();
  }
};

const getCityCode = async (location) => {
  await ensureAccessToken();
  const response = await axios.get(
    `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${location}&subType=CITY`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  if (response.data.data.length === 0) {
    throw new Error(`No city code found for location: ${location}`);
  }
  return response.data.data[0].iataCode;
};

app.get('/city-code/:location', async (req, res) => {
  try {
    const cityCode = await getCityCode(req.params.location);
    res.json({ cityCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
