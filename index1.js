const scraper = require('./scraper1');

(async () => {
    try {
        console.log("Starting the scraping process...");
        //const allGGNs = await scraper.scrapeCertificate(13, 537); // Example: Australia, Oranges
        //console.log("Scraping complete!");
    } catch (err) {
        console.error("Error during scraping:", err);
    }
})();


// Uncomment from here


// const  apicall = require('./apicall.js');  // Add .js extension if it's a local file
// // // const  { searchGlobalGAP } = require('./apicall.js');  // Add .js extension if it's a local file


// (async () => {
//   try {
//     console.log("Starting the scraping process...");



//     let result ;
//     for (let i = 548800; i <= 548900;  i += 2) {
//       console.log(i);  // This will print each number to the console
//        result = await apicall.searchGlobalGAP(i, 'en');
//     }

  

//     // Log the response from the API
//     console.log('API Response:', result);
//   } catch (error) {
//     console.error('An error occurred:', error.message);
//   }
// })();
