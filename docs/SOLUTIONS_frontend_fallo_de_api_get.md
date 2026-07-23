import axios from 'axios';

async function verifyTemp() {
    try {
        // Replace with your actual API endpoint and parameters
        const apiUrl = "https://api.example.com/verification"; 
        const response = await axios.get(apiUrl, {
            params: {
                key: process.env.VERIFICATION_KEY || 'default_key'
            }
        });

        console.log("Verification successful:");
        console.log(response.data);
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code 
            // that falls into one of the client or server error categories.
            console.error("Error details:", error.response.status, error.response.data);
        } else if (error.request) {
            // The request was made but no response was received.
            console.error("No response received from the server.");
        } else {
            // Something happened in setting up the request that triggered an Error.
            console.error('An unexpected error occurred:', error.message);
        }
    }
}

verifyTemp();

/* 
*** IMPORTANT FIX NOTES ***

1. Dependency Installation: This error (ERR_MODULE_NOT_FOUND) means the 'axios' package is not installed in your project directory. Before running this code, you MUST run the following command in your terminal:
   npm install axios

2. Execution Context: If you are using Node.js ESM modules (ESM), ensure your package.json includes "type": "module".
*/