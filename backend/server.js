require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const qs = require('qs'); // Import qs module

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;

let accessToken = '';
let tokenExpiryTime = 0;
let tokenPromise = null; // Prevent multiple token requests at once

const getAccessToken = async () => {
  if (tokenPromise) return tokenPromise;

  tokenPromise = axios
    .post('https://test.api.amadeus.com/v1/security/oauth2/token', qs.stringify({
      grant_type: 'client_credentials',
      client_id: AMADEUS_API_KEY,
      client_secret: AMADEUS_API_SECRET,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    .then(response => {
      accessToken = response.data.access_token;
      tokenExpiryTime = Date.now() + response.data.expires_in * 1000; // Set token expiry time
      tokenPromise = null;
      return accessToken;
    })
    .catch(error => {
      console.error('Error fetching access token:', error.response?.data || error.message);
      tokenPromise = null;
      throw error;
    });

  return tokenPromise;
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

app.post('/generate-trip-location', async (req, res) => {
  const { location, days, budget, travelGroup } = req.body;

  console.log('Received request:', { location, days, budget, travelGroup });

  try {
    await ensureAccessToken();

    const cityCode = await getCityCode(location);
    console.log('City code:', cityCode);
    const tripLocation = location;

    // Here you can add additional logic to process days, budget, and travelGroup
    // For example, you might want to use these parameters to fetch additional data or customize the response

    res.json({ tripLocation, days, budget, travelGroup });
  } catch (error) {
    console.error('Error generating trip location:', error);

    // Refresh the access token if it has expired and retry the request
    if (error.response && error.response.status === 401) {
      try {
        await getAccessToken();
        const cityCode = await getCityCode(location);
        const tripLocation = location;

        res.json({ tripLocation, days, budget, travelGroup });
      } catch (retryError) {
        console.error('Error retrying trip location generation:', retryError);
        res.status(500).json({ error: 'Failed to generate trip location' });
      }
    } else if (error.response && error.response.status === 404) {
      console.error('City code not found:', error.response.data);
      res.status(404).json({ error: 'City code not found' });
    } else {
      res.status(500).json({ error: 'Failed to generate trip location' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
