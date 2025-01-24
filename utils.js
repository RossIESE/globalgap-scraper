// Handle errors gracefully
function handleError(err) {
  console.error("Error:", err.message);
  throw err; // Re-throw the error for visibility
}

// Add delays between requests to avoid rate-limiting
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {handleError, delay};



// uncomment for other run

// export const handleError = (error) => {
//   console.error(error);
// };