const { chromium } = require('playwright');
const axios = require('axios');
const { handleError } = require('./utils');
const cheerio = require('cheerio');
const fs = require('fs');

function randomDelay(minSeconds, maxSeconds) {
  // Generate a random number of seconds between minSeconds and maxSeconds
  const delaySeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;

  // Convert seconds to milliseconds
  const delayMilliseconds = delaySeconds * 1000;

  return new Promise(resolve => setTimeout(resolve, delayMilliseconds));
}


// (async () => {
//   const browser = await chromium.launch({ headless: true, slowMo: 100 });
//   const context = await browser.newContext();
//   const page = await context.newPage();

//   try {
//       // 1. Go to the main page
//       const mainPageUrl = 'https://database.globalgap.org/globalgap/search/SearchMain.faces';
//       await page.goto(mainPageUrl);

//       // 2. Wait for the dropdowns to load
//       await page.waitForSelector('#expertP3Country', { timeout: 100000 });
//       await page.waitForSelector('#expertP3Product', { timeout: 100000 });

//       // 3. Get the HTML of the page
//       const html = await page.content();

//       // 4. Use Cheerio to parse the HTML
//       const $ = cheerio.load(html);

//       // Function to extract values and find the maximum value for a given selector
//       const extractMaxValue = (selector) => {
//           const options = $(selector + ' option');
//           const values = [];
//           options.each((index, option) => {
//               const value = parseInt($(option).attr('value'), 10); // Parse the value as an integer
//               if (!isNaN(value)) {
//                   values.push(value);
//               }
//           });
//           return {
//               values,
//               maxValue: values.reduce((max, value) => (value > max ? value : max), -Infinity),
//           };
//       };

//       // 5. Extract values and maximum for #expertP3Country
//       const countryData = extractMaxValue('#expertP3Country');
//       //console.log('Maximum value (country):', countryData.maxValue);

//       // 6. Extract values and maximum for #expertP3Product
//       const productData = extractMaxValue('#expertP3Product');
//       //console.log('Maximum value (product):', productData.maxValue);

//   } catch (error) {
//       console.error('An error occurred:', error);
//   } finally {
//       await browser.close();
//   }



  
// })();


async function scrapeData(page1){


  // 6. Get the URL of the popup window
  const certificateUrl = page1.url();
  // console.log('Certificate URL:', certificateUrl);

  // 7. Get the HTML content of the popup using Playwright
  const html = await page1.content();

  // 8. Save the HTML to a file (optional, for debugging)
  fs.writeFileSync('certificate.html', html);
  // console.log('HTML saved to certificate.html');

  // 9. Use Cheerio to parse the HTML and extract data
  const $ = cheerio.load(html);

  

  

  // const tableheader = $('.theader')
  const tablebody = $('.tbodyStyle').first()


  const rows = tablebody.find('tr'); // Initialize an array to store the scraped data
  const scrapedData = []; // Iterate over each `tr` element 
  rows.each((index, row) => { 
      const product = $(row).find('.productTh').text().trim(); 
      const certNo = $(row).find('.certNoTh').text().trim(); 
      const attributes = $(row).find('.attributesTh .divStyle').map((i, attr) => $(attr).text().trim()).get(); 
      const cod = $(row).find('.codTh').text().trim(); 
      const scheme = $(row).find('.schemeTh').text().trim(); 
      scrapedData.push({ product, certNo, attributes, cod, scheme, }); }); // Output the scraped  data
      //console.log(scrapedData);

      //  ----  Start of new code ----
      const tableData = scrapedData.map(item => {
          const attributeObj = {};
          item.attributes.forEach(attr => {
              const [key, value] = attr.split(':').map(s => s.trim());
              attributeObj[key] = value; 
          });
          return {
              product: item.product,
              certNo: item.certNo,
              attributes: attributeObj, 
              cod: item.cod,
              scheme: item.scheme
          };
      });

      // console.log(tableData);
  



  // 10. Extract GGN
  const ggn = $('div.ggn:contains("GGN:")').find('span.bold').text().trim();
  // console.log('GGN:', ggn);

  // 11. Extract "Issued to" information
  const issuedTo = {};
  const issuedToDiv = $('div.issue');
  if (issuedToDiv) {
      issuedTo.producer = issuedToDiv.find('div.type.bold').text().trim();
      issuedTo.address = issuedToDiv.find('div.country.bold').text().trim();
  }

  // 12. Extract Log Date, Valid from, Valid to, Date of Certification decision
  const validationData = {};
  const logDateDiv = $('div.dates div.DoP');
  if (logDateDiv) {
      validationData.logDate = logDateDiv.find('span.value').text().trim();
  }

  const validFromDiv = $('div.dates div.DoC');
  if (validFromDiv) {
      validationData.validFrom = validFromDiv.find('span.value').text().trim();
  }

  const validToDiv = $('div.dates div.DoV');
  if (validToDiv) {
      validationData.validTo = validToDiv.find('span.value').text().trim();
  }

  const certDecisionDiv = $('div.dates div.DoI');
  if (certDecisionDiv) {
      validationData.certificationDecisionDate = certDecisionDiv.find('span.value').text().trim();
  }


      const contactInfo = {};
      const contactDiv = $('div.contactCB');

      contactInfo.name = contactDiv.find('span.name').text().trim();
      contactInfo.manager = contactDiv.find('span.manager').text().trim();


  const finalOutput = {
      ggn,
      issuedTo,
      validationData,
      contactInfo,
      tableData
  };


  try {
    const currentData = fs.readFileSync('data.json');
    const existingData = JSON.parse(currentData);
  
    // Check if the ggn already exists
    if (!existingData[finalOutput.ggn]) { 
      existingData[finalOutput.ggn] = finalOutput;
      fs.writeFileSync('data.json', JSON.stringify(existingData, null, 2));
      // console.log('Data written to data.json');
    } else {
      console.log(`GGN ${finalOutput.ggn} already exists. Skipping.`);
    }
  } catch (err) {
    // If the file doesn't exist, create an object with the initial data
    const initialData = {};
    initialData[finalOutput.ggn] = finalOutput;
    fs.writeFileSync('data.json', JSON.stringify(initialData, null, 2));
    // console.log('Data written to data.json'); 
  }


}


function extractallGGNsFromFile(filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const jsonData = JSON.parse(fileData);

    const allGGNs = new Set();

    // Iterate through each entry in the data.json file
    for (const key in jsonData) {
      const entry = jsonData[key];
      // Directly access the 'ggn' property of each entry
      if (entry.ggn) {
        allGGNs.add(entry.ggn);
      }
    }

    return Array.from(allGGNs);
  } catch (error) {
    console.error("Error reading or parsing data.json:", error);
    return []; // Return an empty array on error
  }
}

const filePath = 'data.json';
const allGGNs = extractallGGNsFromFile(filePath);

// console.log("allGGN:", allGGNs);




async function extractGGNsFromTableBody(page1) {
  // Introduce a 1-second delay
  await page1.waitForTimeout(2000);
  // 6. Get the URL of the popup window
  const certificateUrl = page1.url();
  // console.log('Certificate URL:', certificateUrl);

  // 7. Get the HTML content of the popup using Playwright
  const html = await page1.content();

  // 9. Use Cheerio to parse the HTML and extract data
  const $ = cheerio.load(html);


  const ggnValuesPage = []; // Array to store GGN values

            for (let n = 1; n <= 10; n++) {
              // Construct the selector for the nth row (note: nth-child is 1-indexed)
              const rowSelector = `#treetable > table > tbody > tr:nth-child(${n})`;

              const tableRow = $(rowSelector);
              // console.log("tableRow:", tableRow)

              // Check if the row exists
              if (tableRow.length > 0) {
                const ggnCell = tableRow.find('td').eq(4); // Get the 5th cell (index 4)
                const ggnValue = ggnCell.text().trim();

                // Basic validation: Check if it looks like a GGN (all digits)
                if (/^\d+$/.test(ggnValue)) {
                  ggnValuesPage.push(ggnValue);
                 
                } else {
                  // console.warn(`Row ${n} does not appear to contain a valid GGN in the 5th cell.`);
                }
              } else {
                // console.warn(`Row ${n} not found.`);
              }

          }
          // console.log("GGN Values:", ggnValuesPage);
          return ggnValuesPage;
      

}



// Function to check if all GGNs from the current page are already in the unique set
async function shouldContinueToNextPage(page) {
  const ggnValuesPage = await extractGGNsFromTableBody(page);
  const allGGNsPresent = ggnValuesPage.every(ggn => allGGNs.includes(ggn));

  if (allGGNsPresent) {
    console.log("All GGNs from this page are already in the unique set.");

    return true; // Proceed to the next page
  } else {
    console.log("New GGNs found on this page. Continue processing.");

    return false; // Stay on the current page
  }
}



// Function to handle navigation to the next page
async function goToNextPage(page) {
  try {
    const nextButton = await page.getByRole('button', { name: 'Next' }, { timeout: 10007 });
    await page.waitForTimeout(2000)
    if (await nextButton.isVisible()) {
      await nextButton.click();
      console.log("Clicked 'Next' button and moving to the next page.");
      return true;
    } else {
      console.log("No 'Next' button found.");
      return false;
    }
  } catch (error) {
    console.error("Error interacting with 'Next' button:", error);
    return false;
  }
}



// Example usage (assuming you have your Playwright setup and page1 loaded):
// shouldContinueToNextPage








// 3 lines below scrapeCertificate 
// const mainPageUrl = 'https://database.globalgap.org/globalgap/search/SearchMain.faces';
// and  close at the end

async function scrapeCertificate(page, countryIndex, productIndex) {
    // const browser = await chromium.launch({ headless: false, slowMo: 100 });
    // const context = await browser.newContext({ timeout: 100000 });
    // const page = await context.newPage();

    


    
    try {
        // 1. Go to the main page 
        // const mainPageUrl = 'https://database.globalgap.org/globalgap/search/SearchMain.faces';
        // await page.goto(mainPageUrl);
        // await extractGGNsFromTableBody(page);

        // 2. Select country and product
        await page.selectOption('#expertP3Country', `${countryIndex}`);
        await page.selectOption('#expertP3Product', `${productIndex}`);

        await page.waitForTimeout(2000)

        // 3. Click "Start query"
        await page.getByRole('button', { name: 'Start query' }).click();

       

        // await extractGGNsFromTableBody(page); 
       
        
        const DEFAULT_TIMEOUT = 15000; 

                  // 4. Wait for the search results page to load
              // await page.waitForNavigation();

              // // 5. Get the HTML content of the search results page
              // html_content = await page.innerHTML('body');
              // // console.log("html_content",html_content);

              // // 6. Call the extractGGNsFromTableBody function with the HTML content
              // ggn_codes = extractGGNsFromTableBody(html_content);

              // 7. Return the GGN codes
              // return ggn_codes;  
          


 // Main loop to iterate through pages
              while (true) {
                                    // Determine the scenario more efficiently
                    let scenario = null;

                    try {
                        // Wait for any of the relevant icons to appear
                        await page.waitForSelector(
                            "img[src='/globalgap/img/globalgap/validationTable/icon_error.png'], img[src='/globalgap/img/globalgap/dynatreeSearch/icon_selected.gif'], img[src='/globalgap/img/globalgap/dynatreeSearch/icon_open.gif']",
                            { timeout: DEFAULT_TIMEOUT, state: "attached" }
                        );

                        // Check which icons are actually present to determine the scenario
                        const errorIconCount = await page.locator("img[src='/globalgap/img/globalgap/validationTable/icon_error.png']").count();
                        const minusSignCount = await page.locator("img[src='/globalgap/img/globalgap/dynatreeSearch/icon_selected.gif']").count();
                        const plusSignCount = await page.locator("img[src='/globalgap/img/globalgap/dynatreeSearch/icon_open.gif']").count();

                        if (errorIconCount > 0) {
                            scenario = "error";
                            // console.log("Err obs")
                        } else if (minusSignCount >= 1) {
                            scenario = "minus";
                            // console.log("Minus obs")
                        } else if (plusSignCount > 0) {
                            scenario = "plus";
                            // console.log("Plus obs")
                        } else {
                            scenario = "unknown"; // Handle the case where none of the icons are found
                        }

                    } catch (error) {
                        if (error.name === "TimeoutError") {
                            console.warn("Timeout waiting for any of the icons to be attached.");
                            scenario = "unknown" // You might want to handle this differently
                        } else {
                            console.error("An unexpected error occurred:", error);
                        }
                    }


                if (scenario === "error") {
                  let errorExists = 0;
                  
                  try {
                    
                    // Wait for a shorter time, like 5 seconds
                    await page.waitForSelector("img[src='/globalgap/img/globalgap/validationTable/icon_error.png']",{ timeout: 10001, state: "attached" });
                    const imageContainers2 = page.locator("img[src='/globalgap/img/globalgap/validationTable/icon_error.png']",{ timeout: 10008, state: "attached" });
                    errorExists = await imageContainers2.count();
                    // console.log("gets here -4");
       

                    if (errorExists === 1) {
                      console.log(
                        `No data for country&product comb: ${countryIndex} and ${productIndex}`);
                        break; // Exit the entire scrapeCertificate function
                    }
                  } catch (error) {
                    console.error("An error occurred-2:", error);
                    // console.log("Very useful: gets here4 (error icon not found - continuing)");
                    // console.log("gets here 0");
                  }
                  
                  console.log(`No data for country&product comb: ${countryIndex} and ${productIndex}`);
                  // No need to break here, as this scenario doesn't involve iteration
                }

                else if (scenario === "minus") {
                  await page.waitForSelector("img[src='/globalgap/img/globalgap/dynatreeSearch/icon_selected.gif']", { timeout: 20003 });
                  // console.log("gets here 1")

                  // Count the "-" signs
                  const minusSignContainers = page.locator("img[src='/globalgap/img/globalgap/dynatreeSearch/icon_selected.gif']");
                  const minusSignCount = await minusSignContainers.count();


                  if (minusSignCount >= 1) { 
                    // console.log("Processing '-' signs");
                    try {
                      // console.log("gets here 2")
                      const page1Promise = page.waitForEvent('popup', { timeout: 10000 });
                      await page.locator('.searchTdBorderLeft > a[href*="&lang=en"]').nth(0).click(); 

                      const page1 = await page1Promise;
                      await page1.waitForLoadState();

                      const scrapedData = await scrapeData(page1);
                      await page1.waitForTimeout(1000)

                      await page1.close(); 
                      break

                    } catch (error) {
                      console.error(`Error processing "-" sign ${i + 1}:`, error); 
                      break;
                    }
                  }



                  

                  // No need to break here, as this scenario doesn't involve iteration
                } else if (scenario === "plus") 
                  
                  {    // Check if we should continue to the next page after processing all "+" signs
                    
                    
                    // await shouldContinueToNextPage(page); 
                  // *** Iteration for "+" signs scenario ***
                  while (true) 
                    { 


                      if (await shouldContinueToNextPage(page, allGGNs)) {
                        // All GGNs are known, attempt to go to the next page
                        //console.log("After processing '+' signs, all GGNs are known.");
                        hasNextPage = await goToNextPage(page);
                        if (!hasNextPage) {
                          // console.log("gets here 0")
                          console.log("No next page after processing '+' signs, exiting loop.");
                          return;
                        }
                        // console.log("gets here 1")

                        continue; // Skip to the beginning of the while loop (check next page)
                      } else {
                        // console.log("gets here 2")
                        console.log("After processing '+' signs, new GGNs found.");
                        // Handle new GGNs if necessary
                        // ... your code to handle new GGNs ...
                        ; // Exit the while loop if needed after processing new GGNs
                      }
                    
                                        

                    await page.waitForSelector("img[src='/globalgap/img/globalgap/dynatreeSearch/icon_open.gif']",{ timeout: 10004 });
                      //  console.log("gets here 2");
  
                    // Count the "+" signs on the current page
                    const imageContainers = page.locator("img[src='/globalgap/img/globalgap/dynatreeSearch/icon_open.gif']");
  
                    // console.log("gets here 3");

        
                    const buttonCount = await imageContainers.count();
                    console.log(`Number of "+" signs found: ${buttonCount}`);
                    
  
                  // Loop through and click on each "+" sign on the current page
                  for (let i = 0; i < buttonCount; i++) {

                    
                    console.log(`Processing "+" sign ${i + 1} of ${buttonCount}`);
                
                    const plusButton = page.locator('a[onclick^="return oamSubmitForm(\'content:search\'"]').nth(i * 2);

                    // 1. Wait for the button to be attached to the DOM
                    await plusButton.waitFor({ state: 'attached' }); 
                
                    // 2. Wait for a short time to ensure the button is ready
                    await page.waitForTimeout(500); // Wait for 500 milliseconds (adjust as needed)
                
                    // 3. Click the button
                    await plusButton.click();
                    await page.waitForTimeout(500);
                
                    let enLinkFound = true; // Flag to track if the "en" link is found
                    try {

                      // Click the relevant link after opening the "+" sign
                    // const page1Promise = page.waitForEvent('popup', { timeout: 10002 }); // Reduced timeout

                
                    // Check for the "en" link with a shorter timeout and handle missing links
                   

                        await page.waitForSelector('.searchTdBorderLeft > a[href*="&lang=en"]', { timeout: 10003 }); // Shorter timeout
                        await page.locator('.searchTdBorderLeft > a[href*="&lang=en"]').click();

                      // Only proceed if the "en" link was found
                    if (enLinkFound) {
                      const page1Promise = page.waitForEvent('popup', { timeout: 10002 }); // Reduced timeout
                      const page1 = await page1Promise;
                      await page1.waitForLoadState();
              
                      await scrapeData(page1);
              
                      // Close the opened popup page
                      await page1.close();
                  }
              


                        
                    } catch (error) {
                        console.warn(`"en" link not found for "+" sign ${i + 1}. Skipping to next "+" sign.`);
                        enLinkFound = false; // Set the flag to false
                      
                        const nextButton = await page.getByRole('button', { name: 'Next' });
                        if (!(await nextButton.isVisible())) {
                          console.log("No 'Next' button found after 'en' link failure. Exiting function.");
                          // i = i+1; 
                        }

                        console.error("Cannot find the 'en' link:");
                        await plusButton.waitFor({ state: 'visible', timeout: 10004 });
                      // await randomDelay(1, 2);
                        await plusButton.click();
                        // this is a big change?
                        continue;


                    }
                
                    
                    // Re-click the "+" sign to close it (only if it was clicked in the first place)
                    try {
                    // console.log("gets here0");
                      await plusButton.waitFor({ state: 'visible', timeout: 10004 });
                      // await randomDelay(1, 2);
                      await plusButton.click();
                      // console.log("Processed and closed popup for  "+" sign:",i)

                    } catch (error) {
                        console.error("error closing the plus sign:",i)
                    
                      }
                   
                }
  
                  // Click the "Next" button to move to the next page
                  // console.log("gets here Next page");
                  try {
                  
                    // console.log("gets here 2");
                    const nextButton = await page.getByRole('button', { name: 'Next' },  { timeout: 10007 });
                    await nextButton.click();
                    // console.log("gets here 3");
                    // Check if the "Next" button exists before clicking it
                    if (await nextButton.isVisible()) {
                        await nextButton.click();
                        // console.log("gets here 4");
                        console.log("Clicked 'Next' button and moving to the next page.");
                    } else {
                        console.log("No 'Next' button found. Exiting loop.");
                        // console.log("gets here 5");
                        // break; // Exit the loop if the "Next" button is not found
                    }
                    // console.log("gets here 6");
                // break;
                } catch (error) {
                    console.error("No next button");
                    break; // Exit the loop on error (you might want to handle this differently)
                }
// console.log("gets here 6");
                   
                    // break;
              
                  
                }
                // break;
                  }
                  console.log("No next found - Going to next item");
                  break;
                }
                 

    } catch (error) 
    {
      handleError(error);
      console.error("An error occurred2:", error);
      return;

    } finally 
    {
        // await browser.close();
        console.log(`Run complete for: ${countryIndex} and ${productIndex} `);
    }
}


// const countryCount = countryData.maxValue
// const productCount = productData.maxValue

// const countryCount = 5;
// const productCount = 7;


// const countryCount = 100;
// const productCount = 846;

// 846

// Example usage:
//scrapeCertificate(13, 537); // Example: Australia, Oranges
//rapeCertificate(countryCount, productCount); // Example: Australia, Oranges








(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ timeout: 100000 });
  const page = await context.newPage();

  const mainPageUrl = 'https://database.globalgap.org/globalgap/search/SearchMain.faces';
  await page.goto(mainPageUrl);

  // Pass the initialized `page` to the scraping function
  // const countryIndices = [13, 14, 15]; // Example country indices
  // const productIndices = [536, 537, 538]; // Example product indices
  const countryInd = [239]; // Example country indices
  const productInd = [846];
    // 846]; // Example product indices
  // const countryIndices = [13]; // Example country indices
  // const productIndices = [536]; // Example product indices


  // do south africa for 20
  // 154 is weird
  // 200 weird
  // 210 - 40+ tabs - did up to 10 tabs.
  // 258, 281 is big and buggy
  // 342
  
  // 643



  for (const countryIndex of countryInd) {
    for (let j = 10; j <= productInd; j++) {
        let retryCount = 0;
        const maxRetries = 2; // Adjust as needed

        while (retryCount < maxRetries) {
            try {
                await scrapeCertificate(page, countryIndex, j);
                await page.waitForTimeout(500)
                await page.getByRole('button', { name: 'Reset query' }).click();
                break; // Exit the loop if successful
            } catch (error) {
                console.error(`Error for countryIndex: ${countryIndex}, productIndex: ${j}`, error);
                retryCount++;
                await page.waitForTimeout(1000); // Adjust delay as needed
            }
        }
    }
}

await browser.close();
})();






// async function runAllScrapes() { // Wrap in an async function
//   for (let i = 4; i <= countryCount; i++) {
//     for (let j = 72; j <= productCount; j++) {
//       await scrapeCertificate(i, j);
//       // await browser.close(); // Await each call
//     }
//   }
// }

//  runAllScrapes();


// product goes 0 - 846 (will increase)
// country goes 0 to 253

module.exports = { scrapeCertificate };


