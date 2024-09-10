/*
    Script for preloader
    Waits for the entire page to load, then hides the preloader after 3 seconds.
*/
$(window).on('load', function () {
    $('#preloader').delay(3000).fadeOut("slow"); // Delay of 3 seconds, then slowly fade out the preloader
});

$(document).ready(function () {
    // Show the project information modal when the page is fully loaded
    $('#projectInfoModal').modal('show');
});

// Functions

/*
    Converts a number to its ordinal form (e.g., 1 becomes 1st, 2 becomes 2nd)
*/
function nth(num) {
    return (num % 10 == 1 && num % 100 != 11) ? num.toString() + "st" : (num % 10 == 2 && num % 100 != 12) ? num.toString() + "nd" : (num % 10 == 3 && num % 100 != 13) ? num.toString() + "rd" : num.toString() + "th";
}

/*
    Fetches the country code and updates the dropdown selection based on latitude and longitude
*/
function updateCountryCodeAndCountryName(lat, lng) {
    $.ajax({
        url: "php/getCountryCode.php", // Make a POST request to get the country code
        type: 'POST',
        dataType: 'JSON',
        data: {
            lat: lat,
            lng: lng // Send latitude and longitude as data
        },
        success: function (result) {
            if (result.status.name == "ok") {
                // Update the country dropdown with the fetched country code
                $('#selCountry').val(result['data']['countryCode']).change();
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // Error handling
        }
    });
}

/*
    Compares two strings alphabetically, ignoring case sensitivity
*/
function compareStrings(a, b) {
    let al = a.toLowerCase();
    let bl = b.toLowerCase();
    return (al < bl) ? -1 : (al > bl) ? 1 : 0; // Returns -1, 1, or 0 for sorting
}

/*
    Formats large numbers with commas for better readability
    e.g., 1970 becomes 1,970
*/
function largeNumberFormat(num) {
    const numStr = num.toString(); // Convert number to string
    const digits = numStr.length;  // Get the length of the number

    // If it's a small number, return as is
    if (digits <= 3) return numStr;

    let result = '';
    for (let i = 0; i < digits; i++) {
        result += numStr[digits - 1 - i]; // Build the number string in reverse

        // Add commas every three digits (except the last group)
        if ((i % 3 == 2) && i != digits - 1) result += `,`;
    }

    // Reverse the string and return it with commas added
    return [...result].reverse().join('');
}

// Set up the map

// Basemap layers from different sources (Streets, Satellite, Dark)
const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

const cartoDarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
});

// Map layers configuration for toggling between basemaps
const basemaps = {
    "Satellite": satellite,
    "Streets": streets,
    "Dark": cartoDarkMatter
};

// Initialize the map, default to satellite view
let map = L.map('map', {
    layers: [satellite], 
    zoomControl: false // Disable the default zoom controls
}).fitWorld();

// Add custom zoom control at the bottom right
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Add search control for finding countries, places, and attractions
const search = new GeoSearch.GeoSearchControl({
    provider: new GeoSearch.OpenStreetMapProvider(),
    style: 'button',
    showPopup: true,
    popupFormat: ({ query, result }) =>
        `${result.label} <br/> Latitude: ${parseFloat(result.y).toFixed(6)} <br/>
     Longitude: ${parseFloat(result.x).toFixed(6)}`,
    searchLabel: 'Enter country, place or attraction'
});

map.addControl(search);

/*
    Handles the event when the user's location is found.
    Updates the country code based on latitude and longitude.
*/
function onLocationFound(e) {
    const latitude = e.latlng['lat'];
    const longitude = e.latlng['lng'];
    updateCountryCodeAndCountryName(latitude, longitude);
}

map.on('locationfound', onLocationFound); // Event listener for when location is found

// Automatically locate the user's position
map.locate({ setView: true, maxZoom: 6 });

/*
    Fetches country names and populates the country dropdown menu.
    The country names are sorted alphabetically.
*/
$.ajax({
    url: 'php/getCountryName.php',
    type: 'POST',
    dataType: 'JSON',
    success: function (result) {
        if (result.status.name == "ok") {
            // Sort country names alphabetically
            result.data.features.sort((a, b) => compareStrings(a.properties.name, b.properties.name));
            
            // Populate the country dropdown
            for (let i = 0; i < result.data.features.length; i++) {
                let $option = $('<option>').val(result.data.features[i].properties.iso_a2).text(result.data.features[i].properties.name);
                $('#selCountry').append($option);
            }
        }
    },
    error: function (jqXHR, textStatus, errorThrown) {
        // Error handling
    }
});

/*
    Map marker cluster groups for different types of data: Wikipedia articles, weather observations, and cities
*/
let border = new L.GeoJSON();
const wikipediaArticleMarkers = L.markerClusterGroup();
const weatherObservationMarkers = L.markerClusterGroup();
const cityMarkers = L.markerClusterGroup();

// Set up overlays for toggling markers on the map
const overlays = {
    "WikipediaArticles": wikipediaArticleMarkers,
    "WeatherObservations": weatherObservationMarkers,
    "Cities": cityMarkers
};

// Layer control for switching between basemaps and overlays
const layerControl = L.control.layers(basemaps, overlays).addTo(map);

/*
    Event triggered when a country is selected from the dropdown.
    Fetches country borders and additional data (Wikipedia articles, weather, cities) for the selected country.
*/
$('#selCountry').on('change', function () {
    let code = $('#selCountry').val(); // Get the selected country code

    // Clear existing layers and markers
    border.clearLayers();
    wikipediaArticleMarkers.clearLayers();
    weatherObservationMarkers.clearLayers();
    cityMarkers.clearLayers();

    // Fetch and display country borders
    $.ajax({
        url: 'php/getCountryBorders.php',
        type: 'POST',
        dataType: 'JSON',
        data: {
            countryCode: code // Send the selected country code
        },
        success: function (result) {
            let myStyle = {
                "color": "#FF0000",
                "weight": 1,
                "fillColor": "#F28B82"
            };

            // Add country borders to the map and style them
            border.addData(result).setStyle(myStyle).addTo(map);
            map.fitBounds(border.getBounds()); // Adjust the map view to fit the country borders
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // Error handling
        }
    });
// ///////////////////////////////////////////////////////////////////////////////////////
let north;
let south;
let east;
let west;

// Fetch country information using the selected country code
$.ajax({
    url: "php/getCountryInfo.php",
    type: 'POST',
    dataType: 'JSON',
    data: {
        country: code // Send the selected country code
    },
    success: function (result) {

        if (result.status.name == "ok") {
            // Extract the geographical bounds (north, south, east, west) of the selected country
            north = result['data'][0]['north'];
            south = result['data'][0]['south'];
            east = result['data'][0]['east'];
            west = result['data'][0]['west'];

            // Fetch Wikipedia articles based on the country's geographical boundaries
            $.ajax({
                url: "php/wikipediaArticles.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    north: north, // Send the geographical boundaries
                    south: south,
                    east: east,
                    west: west
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Define the icon style for Wikipedia markers
                        const databaseIcon = L.ExtraMarkers.icon({
                            prefix: 'fa',
                            icon: 'fa-database',
                            iconColor: 'white',
                            svg: true,
                            markerColor: '#0072B5',
                            shape: 'square'
                        });

                        let wikipediaArticleCoords = [];

                        // Iterate through the fetched articles
                        for (let i = 0; i < result['data'].length; i++) {
                            let wikipediaArticleText = ``;
                            let wikiTitle = result['data'][i]['title'];
                            let wikiLatitude = result['data'][i]['lat'];
                            let wikiLongitude = result['data'][i]['lng'];
                            let wikiSummary = result['data'][i]['summary'];
                            let wikiUrl = result['data'][i]['wikipediaUrl'];

                            // Build the text content for the Wikipedia article popup
                            wikipediaArticleText += `<h4>${wikiTitle}</h4>`;
                            wikipediaArticleText += `<p>${wikiSummary} </p>`;
                            wikipediaArticleText += `<p class="text-center" id="wikipedia"><a href="https://${wikiUrl}" target="_blank" title="View Wikipedia Article for ${wikiTitle}">View Wikipedia Article</a></p>`;

                            // Store the article's coordinates, title, and text
                            wikipediaArticleCoords.push([wikiLatitude, wikiLongitude, wikiTitle, wikipediaArticleText]);
                        }

                        // Add markers to the map for each Wikipedia article
                        for (let i = 0; i < wikipediaArticleCoords.length; i++) {
                            let arr = wikipediaArticleCoords[i];
                            let title = arr[2];
                            let description = arr[3];
                            let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: databaseIcon, title: title });
                            marker.bindPopup(description); // Attach a popup with the article details
                            wikipediaArticleMarkers.addLayer(marker);
                        }

                        map.addLayer(wikipediaArticleMarkers); // Add the Wikipedia markers to the map
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for Wikipedia articles
                }
            });

            // Fetch weather observations within the country's geographical boundaries
            $.ajax({
                url: "php/weatherObservations.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    north: north, // Send the geographical boundaries
                    south: south,
                    east: east,
                    west: west
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Define the icon style for weather observation markers
                        const theWeatherIcon = L.ExtraMarkers.icon({
                            prefix: 'fa',
                            icon: 'fa-umbrella',
                            iconColor: 'white',
                            svg: true,
                            markerColor: '#6B5B95',
                            shape: 'square'
                        });

                        let weatherObservationCoords = [];

                        // Iterate through the fetched weather observations
                        for (let i = 0; i < result['data'].length; i++) {
                            let weatherObservationText = ``;
                            let weatherDate = new Date(result['data'][i]['datetime']);
                            let weatherObservation = result['data'][i]['observation'];
                            let weatherStationName = result['data'][i]['stationName'];
                            let weatherClouds = result['data'][i]['clouds'];
                            let weatherLatitude = result['data'][i]['lat'];
                            let weatherLongitude = result['data'][i]['lng'];
                            let weatherTemperature = result['data'][i]['temperature'];

                            // Build the text content for the weather observation popup
                            weatherObservationText += `Date and Time - ${weatherDate.toDateString()} - ${weatherDate.toTimeString().slice(0, 5)} <br/>`;
                            weatherObservationText += `Observation - ${weatherObservation} <br/>`;
                            weatherObservationText += `Weather Station - ${weatherStationName} <br/>`;
                            weatherObservationText += `Clouds - ${weatherClouds} <br/>`;
                            weatherObservationText += `Temperature - ${weatherTemperature} °C`;

                            // Store the observation's coordinates, station name, and text
                            weatherObservationCoords.push([weatherLatitude, weatherLongitude, weatherStationName, weatherObservationText]);
                        }

                        // Add markers to the map for each weather observation
                        for (let i = 0; i < weatherObservationCoords.length; i++) {
                            let arr = weatherObservationCoords[i];
                            let title = arr[2];
                            let description = arr[3];
                            let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: theWeatherIcon, title: title });
                            marker.bindPopup(description); // Attach a popup with the observation details
                            weatherObservationMarkers.addLayer(marker);
                        }

                        map.addLayer(weatherObservationMarkers); // Add the weather markers to the map
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for weather observations
                }
            });

            // Fetch cities within the country's geographical boundaries
            $.ajax({
                url: "php/cities.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    north: north, // Send the geographical boundaries
                    south: south,
                    east: east,
                    west: west
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Define the icon style for city markers
                        const cityIcon = L.ExtraMarkers.icon({
                            prefix: 'fa',
                            icon: 'fa-city',
                            iconColor: 'white',
                            svg: true,
                            markerColor: '#00A170',
                            shape: 'square'
                        });

                        let cityCoords = [];

                        // Iterate through the fetched cities
                        for (let i = 0; i < result['data'].length; i++) {
                            let cityText = ``;
                            let cityName = result['data'][i]['name'];
                            let cityLatitude = result['data'][i]['lat'];
                            let cityLongitude = result['data'][i]['lng'];
                            let cityPopulation = result['data'][i]['population'];
                            let cityUrl = result['data'][i]['wikipedia'];

                            // Build the text content for the city popup
                            cityText += `<h4>${cityName}</h4>`;
                            cityText += `<p>Population - ${largeNumberFormat(cityPopulation)} </p>`;
                            cityText += `<p class="text-center" id="citywikipedia"><a href="https://${cityUrl}" target="_blank" title="View Wikipedia Article for ${cityName}">View Wikipedia Article</a></p>`;

                            // Store the city's coordinates, name, and text
                            cityCoords.push([cityLatitude, cityLongitude, cityName, cityText]);
                        }

                        // Add markers to the map for each city
                        for (let i = 0; i < cityCoords.length; i++) {
                            let arr = cityCoords[i];
                            let title = arr[2];
                            let description = arr[3];
                            let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: cityIcon, title: title });
                            marker.bindPopup(description); // Attach a popup with the city details
                            cityMarkers.addLayer(marker);
                        }

                        map.addLayer(cityMarkers); // Add the city markers to the map
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for fetching cities
                }
            });

        }
    },
    error: function (jqXHR, textStatus, errorThrown) {
        // Handle errors for fetching country information
    }

});

});

// //////////////////////////////////////////

// Set Up Easy Buttons
let infoBtn = L.easyButton({
    states: [{
        stateName: 'get-country-information',
        icon: 'fa-info',  // Use the info icon for the button
        title: 'Country Information',  // Tooltip for the button
        onClick: function (btn, map) {
            // Clear the HTML content for the country information fields
            $('#countryname').html(``);
            $('#countrycapital').html(``);
            $('#countrypopulation').html(``);
            $('#countrycontinent').html(``);
            $('#countrycurrency').html(``);
            $('#countrydriveon').html(``);
            $('#countryspeedunit').html(``);
            $('#countrywhatthreewords').html(``);
            $('#countryflag').html(``);
            $('#countryapparentsunrise').html(``);
            $('#countryapparentsunset').html(``);
            
            // Get the current map center to retrieve the latitude and longitude
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            
            // Update the country code based on the current location (lat, lng)
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fetch country information using Geonames API
            $.ajax({
                url: "php/getCountryInfo.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val() // Use the selected country code
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Extract the country information from the result
                        let countryName = result['data'][0]['countryName'];
                        let countryNameWithUnderscores = countryName.replaceAll(" ", "_");
                        let countryCapital = result['data'][0]['capital'];
                        let countryCapitalWithUnderscores = countryCapital.replaceAll(" ", "_");
                        let countryPopulation = result['data'][0]['population'];

                        // Update the HTML with the country name and capital, including Wikipedia links
                        $("#countryname").html(`<a href="https://en.wikipedia.org/wiki/${countryNameWithUnderscores}" target="_blank" title="View More Details for ${countryName}">${countryName}</a>`);
                        $("#countrycapital").html(`<a href="https://en.wikipedia.org/wiki/${countryCapitalWithUnderscores}" target="_blank" title="View More Details for ${countryCapital}">${countryCapital}</a>`);
                        $("#countrypopulation").html(`${largeNumberFormat(countryPopulation)}`);
                        $("#countrycontinent").html(`${result['data'][0]['continentName']} (${result['data'][0]['continent']})`);

                        // Fetch additional data from REST Countries API
                        $.ajax({
                            url: "php/restCountries.php",
                            type: 'POST',
                            dataType: 'JSON',
                            data: {
                                // Adjust country names that might have special characters
                                country: $('#selCountry :selected').text().replace("W. Sahara", "Western Sahara").replaceAll(" ", "%20")
                            },
                            success: function (result) {
                                if (result.status.name == "ok") {
                                    // If capital is not provided, fall back to REST Countries data
                                    if (countryCapital.length == 0) {
                                        countryCapital = result['data'][0]['capital'][0];
                                        countryCapitalWithUnderscores = countryCapital.replaceAll(" ", "_");
                                        $("#countrycapital").html(`<a href="https://en.wikipedia.org/wiki/${countryCapitalWithUnderscores}" target="_blank" title="View More Details for ${countryCapital}">${countryCapital}</a>`);
                                    }
                                }
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                // Handle errors for REST Countries API
                            }
                        });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for Geonames API
                }
            });

            // Fetch additional country data using Open Cage Data API
            $.ajax({
                url: "php/openCageDataByCountry.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    // Handle special characters for certain countries
                    country: $('#selCountry :selected').text().replaceAll(" ", "%20").replace("Dem.%20Rep.%20Korea", "North%20Korea").replace("Rep.", "Republic").replace("Lao%20PDR", "Laos")
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Filter out results based on component types
                        const filterData = result.data.results.filter((componentType) => componentType.components._type === "country" || componentType.components._type === "administrative" || (componentType.components._type === "state" && componentType.components.state_code === "PR"));

                        // Update the HTML with additional country data (currency, drive side, etc.)
                        $("#countrycurrency").html(filterData[0]['annotations']['currency']['name']);
                        $("#countrydriveon").html(filterData[0]['annotations']['roadinfo']['drive_on']);
                        $("#countryspeedunit").html(filterData[0]['annotations']['roadinfo']['speed_in']);
                        $("#countrywhatthreewords").html(filterData[0]['annotations']['what3words']['words']);
                        $("#countryflag").html(filterData[0]['annotations']['flag']);

                        // Convert apparent sunrise/sunset times to human-readable format
                        const apparentSunrise = filterData[0]['annotations']['sun']['rise']['apparent'];
                        const apparentSunset = filterData[0]['annotations']['sun']['set']['apparent'];
                        const apparentSunriseDateTime = new Date(apparentSunrise * 1000);
                        const apparentSunsetDateTime = new Date(apparentSunset * 1000);

                        // Update the HTML with sunrise and sunset times
                        $("#countryapparentsunrise").html(apparentSunriseDateTime.toTimeString().slice(0, 5));
                        $("#countryapparentsunset").html(apparentSunsetDateTime.toTimeString().slice(0, 5));
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for Open Cage Data API
                }
            });

            // Show the modal containing the country information
            $('#infoModal').modal('show');
        }
    }]
});

// Apply styling to the information button
infoBtn.button.style.backgroundColor = '#800020'; // Dark red color

// Add the info button to the map
infoBtn.addTo(map);

// Set Up Exchange Button
let exchangeBtn = L.easyButton({
    states: [{
        stateName: 'get-exchange-information',
        icon: 'fa-dollar',  // Use the dollar icon for the button
        title: 'Exchange Information',  // Tooltip for the button
        onClick: function (btn, map) {
            // Clear the exchange rate fields and placeholders for cleaner UI
            $('#exchangeupdatedon').html(`<p class="loading-text">Loading exchange data...</p>`);
            $('#exchangefromcurrency').html(`<p class="loading-text">Currency...</p>`);
            $('#exchangeresults').html(``);

            // Get the map center to retrieve the latitude and longitude
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            
            // Update the country code based on the current location (lat, lng)
            updateCountryCodeAndCountryName(latitude, longitude);

            let selectedCurrencyCode;

            // Fetch country information to get the currency code
            $.ajax({
                url: "php/getCountryInfo.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val() // Use the selected country code
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Retrieve the currency code
                        selectedCurrencyCode = result['data'][0]['currencyCode'];

                        // Fetch exchange rates from Open Exchange Rates API
                        $.ajax({
                            url: "php/openExchangeRates.php",
                            type: 'POST',
                            dataType: 'JSON',
                            data: {
                                base: 'USD' // Base currency is USD
                            },
                            success: function (result) {

                                if (result.status.name == "ok") {
                                    // Format and display the last updated time for the exchange rates
                                    let exchangeTimeStamp = result['data']['timestamp'];
                                    let exchangeUpdatedOn = new Date(exchangeTimeStamp * 1000);
                                    $('#exchangeupdatedon').html(`<p>Last Updated: ${exchangeUpdatedOn.toDateString()} - ${exchangeUpdatedOn.toTimeString().slice(0, 5)}</p>`);

                                    // Update the from currency field with some styling
                                    $("#exchangefromcurrency").html(`<span class="currency-display">${selectedCurrencyCode}</span>`);

                                    // Populate the currency dropdown with available currencies and styled select
                                    $('#selCurrency').html('<option value="" disabled selected>Select Currency</option>');
                                    const currencies = Object.keys(result['data']['rates']);
                                    for (let i = 0; i < currencies.length; i++) {
                                        $('#selCurrency').append(`<option value=${currencies[i]}>${currencies[i]}</option>`);
                                    }

                                    // Set the default currency code
                                    $('#selCurrency').val(selectedCurrencyCode);

                                    let selectedCurrency;

                                    // Event to calculate exchange result when user inputs amount
                                    $('#fromamount').on('keyup', function () {
                                        const amount = $('#fromamount').val();

                                        // Validate the amount input
                                        if (amount < 1 || amount > 1000000 || (amount[0] == "0" && amount.length > 1) || !Number.isInteger(Number(amount))) {
                                            $('#exchangeresults').html(`<p class="error-text">Please enter a valid whole number between 1 and 1,000,000 (in ${selectedCurrencyCode}).</p>`);
                                        } else {
                                            calculateResult();
                                        }
                                    });

                                    // Event when the amount field is changed
                                    $('#fromamount').on('change', function () {
                                        calculateResult();
                                    });

                                    // Event when the currency dropdown is changed
                                    $('#selCurrency').on('change', function () {
                                        calculateResult();
                                    });

                                    /*
                                        Function to calculate and display the exchange result
                                    */
                                    function calculateResult() {
                                        selectedCurrency = $('#selCurrency :selected').text();
                                        const fromCurrencyToUSD = 1 / result['data']['rates'][selectedCurrencyCode]; // Get exchange rate for base currency
                                        const amount = $('#fromamount').val(); // Get the entered amount
                                        const selectedExchangeRate = result['data']['rates'][selectedCurrency]; // Get the selected exchange rate
                                        const exchangeResult = fromCurrencyToUSD * amount * selectedExchangeRate; // Calculate the result

                                        // Display the result formatted with two decimal places, styled
                                        $('#exchangeresults').html(`<h3 class="result-text">${amount} ${selectedCurrencyCode} = ${exchangeResult.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedCurrency}</h3>`);
                                    }

                                    // Event to clear the result when the clear button is clicked
                                    $('#exchangeclear').on('click', function () {
                                        $('#exchangeresults').html(``);
                                    });
                                }
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                // Handle errors for Open Exchange Rates API
                                $('#exchangeresults').html('<p class="error-text">Failed to retrieve exchange rates.</p>');
                            }
                        });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for Geonames API
                    $('#exchangeresults').html('<p class="error-text">Failed to retrieve country information.</p>');
                }
            });

            // Show the modal for exchange information
            $('#exchangeModal').modal('show');
        }
    }]
});

// Apply enhanced styling to the exchange button
exchangeBtn.button.style.backgroundColor = '#228B22'; // Green color

// Add the exchange button to the map
exchangeBtn.addTo(map);

// ///////////////////////////////////////////


// Set Up Weather Button
let weatherBtn = L.easyButton({
    states: [{
        stateName: 'get-weather-information',
        icon: 'fa-solid fa-cloud',  // Use the cloud icon for the button
        title: 'Weather Information',  // Tooltip for the button
        onClick: function (btn, map) {
            // Clear the weather data fields in the UI
            $('#weathercityname').html(``);
            $('#weathertzid').html(``);
            $('#lastupdated').html(``);
            $('#currentconditions').html(``);
            $('#currenttemp').html(``);
            $('#currenticon').attr('src', '').attr('title', '').attr('alt', '');  // Clear weather icon

            // Clear the forecast fields for the next 3 days
            $('#day0maxtemp').html(``);
            $('#day0mintemp').html(``);
            $('#day0date').html(``);
            $('#day0icon').attr('src', '').attr('title', '').attr('alt', '');  // Clear day 0 weather icon
            $('#day1maxtemp').html(``);
            $('#day1mintemp').html(``);
            $('#day1date').html(``);
            $('#day1icon').attr('src', '').attr('title', '').attr('alt', '');  // Clear day 1 weather icon
            $('#day2maxtemp').html(``);
            $('#day2mintemp').html(``);
            $('#day2date').html(``);
            $('#day2icon').attr('src', '').attr('title', '').attr('alt', '');  // Clear day 2 weather icon

            // Hide and clear the weather error message
            $('#weathererror').html(``);
            $('#weathererror').hide();

            // Get the map's current center to retrieve the latitude and longitude
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];

            // Update the country code based on the current location (lat, lng)
            updateCountryCodeAndCountryName(latitude, longitude);

            let city;  // Variable to store the city name

            // Fetch the country info to get the capital city
            $.ajax({
                url: "php/getCountryInfo.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val() // Use the selected country code
                },
                success: function (result) {

                    if (result.status.name == "ok") {

                        // Get the capital city and encode it for URL use
                        city = result['data'][0]['capital'];
                        city = city.replaceAll(" ", "%20").replaceAll("'", "%27");  // Replace spaces and special characters

                        // Fetch additional country data from REST Countries API to ensure the capital city is correct
                        $.ajax({
                            url: "php/restCountries.php",
                            type: 'POST',
                            dataType: 'JSON',
                            data: {
                                country: $('#selCountry :selected').text().replace("W. Sahara", "Western Sahara").replaceAll(" ", "%20")
                            },
                            success: function (result) {
                                if (result.status.name == "ok") {
                                    // If the capital city is not provided, fallback to REST Countries data
                                    if (city.length == 0) {
                                        city = result['data'][0]['capital'][0];
                                        city = city.replaceAll(" ", "%20").replaceAll("'", "%27").replaceAll("ú", "%C3%BA");  // Apply encoding for special characters
                                    }

                                    // Fetch weather data for the selected city
                                    $.ajax({
                                        url: "php/weatherApi.php",
                                        type: 'POST',
                                        dataType: 'JSON',
                                        data: {
                                            city: city  // Send the encoded city name
                                        },
                                        success: function (result) {

                                            if (result.status.name == "ok") {

                                                // Set up weather data from the result
                                                const place = result['data']['location']['name'];
                                                const country = result['data']['location']['country'];
                                                const tzid = result['data']['location']['tz_id'];
                                                const lastUpdated = new Date(result['data']['current']['last_updated']);
                                                const currentTemp = Math.round(result['data']['current']['temp_c']);
                                                const currentConditions = result['data']['current']['condition']['text'];
                                                const currentIconPath = result['data']['current']['condition']['icon'];  // Directly from API

                                                // Forecast data for the next 3 days
                                                const day0MaxTemp = Math.round(result['data']['forecast']['forecastday'][0]['day']['maxtemp_c']);
                                                const day0MinTemp = Math.round(result['data']['forecast']['forecastday'][0]['day']['mintemp_c']);
                                                const day0Conditions = result['data']['forecast']['forecastday'][0]['day']['condition']['text'];
                                                const day0IconPath = result['data']['forecast']['forecastday'][0]['day']['condition']['icon'];  // Day 0 icon from API
                                                const day0Date = new Date(result['data']['forecast']['forecastday'][0]['date']);
                                                const day0Month = day0Date.toDateString().slice(4, 7);
                                                const day0Day = day0Date.toDateString().slice(8, 10);
                                                const day0DayNum = parseInt(day0Day);

                                                const day1MaxTemp = Math.round(result['data']['forecast']['forecastday'][1]['day']['maxtemp_c']);
                                                const day1MinTemp = Math.round(result['data']['forecast']['forecastday'][1]['day']['mintemp_c']);
                                                const day1Conditions = result['data']['forecast']['forecastday'][1]['day']['condition']['text'];
                                                const day1IconPath = result['data']['forecast']['forecastday'][1]['day']['condition']['icon'];  // Day 1 icon from API
                                                const day1Date = new Date(result['data']['forecast']['forecastday'][1]['date']);
                                                const day1Month = day1Date.toDateString().slice(4, 7);
                                                const day1Day = day1Date.toDateString().slice(8, 10);
                                                const day1DayNum = parseInt(day1Day);

                                                const day2MaxTemp = Math.round(result['data']['forecast']['forecastday'][2]['day']['maxtemp_c']);
                                                const day2MinTemp = Math.round(result['data']['forecast']['forecastday'][2]['day']['mintemp_c']);
                                                const day2Conditions = result['data']['forecast']['forecastday'][2]['day']['condition']['text'];
                                                const day2IconPath = result['data']['forecast']['forecastday'][2]['day']['condition']['icon'];  // Day 2 icon from API
                                                const day2Date = new Date(result['data']['forecast']['forecastday'][2]['date']);
                                                const day2Month = day2Date.toDateString().slice(4, 7);
                                                const day2Day = day2Date.toDateString().slice(8, 10);
                                                const day2DayNum = parseInt(day2Day);

                                                // Update the weather data in the HTML elements
                                                $("#weathercityname").html(`${place}, ${country}`);
                                                $('#weathertzid').html(`${tzid}`);
                                                $('#lastupdated').html(`${lastUpdated.toDateString()} - ${lastUpdated.toTimeString().slice(0, 5)}`);

                                                $('#currenttemp').html(`${currentTemp} &deg;C`);
                                                $("#currentconditions").html(`${currentConditions}`);
                                                $('#currenticon').attr('src', currentIconPath).attr('title', currentConditions).attr('alt', currentConditions);

                                                $('#day0maxtemp').html(`${day0MaxTemp} &deg;C`);
                                                $('#day0mintemp').html(`${day0MinTemp} &deg;C`);
                                                $('#day0date').html(`${day0Month} ${nth(day0DayNum)}`);
                                                $('#day0icon').attr('src', day0IconPath).attr('title', day0Conditions).attr('alt', day0Conditions);

                                                $('#day1maxtemp').html(`${day1MaxTemp} &deg;C`);
                                                $('#day1mintemp').html(`${day1MinTemp} &deg;C`);
                                                $('#day1date').html(`${day1Month} ${nth(day1DayNum)}`);
                                                $('#day1icon').attr('src', day1IconPath).attr('title', day1Conditions).attr('alt', day1Conditions);

                                                $('#day2maxtemp').html(`${day2MaxTemp} &deg;C`);
                                                $('#day2mintemp').html(`${day2MinTemp} &deg;C`);
                                                $('#day2date').html(`${day2Month} ${nth(day2DayNum)}`);
                                                $('#day2icon').attr('src', day2IconPath).attr('title', day2Conditions).attr('alt', day2Conditions);

                                            } else {
                                                // Show an error message if weather data retrieval fails
                                                $('#weathererror').show();
                                                $('#weathererror').html(`Error Retrieving Weather Information`);
                                            }
                                        },
                                        error: function (jqXHR, textStatus, errorThrown) {
                                            // Show an error message if the API request fails
                                            $('#weathererror').show();
                                            $('#weathererror').html(`Error Retrieving Weather Information`);
                                        }
                                    });
                                }
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                // Handle errors for REST Countries API
                            }
                        });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for Geonames API
                }
            });

            // Show the modal containing the weather information
            $('#weatherModal').modal('show');
        }
    }]
});

// Apply styling to the weather button
weatherBtn.button.style.backgroundColor = '#1434A4';  // Blue color

// Add the weather button to the map
weatherBtn.addTo(map);


// Set Up Nearby Placename Button
let nearbyPlacenameBtn = L.easyButton({
    states: [{
        stateName: 'find-nearby-placename',
        icon: 'fa-location-crosshairs',  // Use the crosshairs icon for the button
        title: 'Nearby Placename',  // Tooltip for the button
        onClick: function (btn, map) {
            // Clear the nearby place data fields in the UI
            $('#placename').html(``);
            $('#placecounty').html(``);
            $('#placestate').html(``);
            $('#placecountry').html(``);
            $('#placeformatted').html(``);
            $('#placewhatthreewords').html(``);
            $('#placeapparentsunrise').html(``);
            $('#placeapparentsunset').html(``);
            $('.placecountyrow').hide();  // Hide the county row by default

            // Get the map's current center to retrieve the latitude and longitude
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];

            // Update the country code based on the current location (lat, lng)
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fetch nearby placename data using Geonames API
            $.ajax({
                url: "php/findNearbyPlaceName.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,  // Send the current latitude and longitude
                    lng: longitude
                },
                success: function (result) {
                    if (result.status.name == "ok") {
                        // Update the UI with the nearby place name
                        $('#placename').html(result['data'][0]['name']);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for nearby placename API
                }
            });

            // Fetch additional place data from Open Cage Data API
            $.ajax({
                url: "php/openCageDataByLatLng.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,  // Send the current latitude and longitude
                    lng: longitude
                },
                success: function (result) {
                    if (result.status.name == "ok") {
                        // If a county is available, show it in the UI
                        let county = result['data']['results'][0]['components']['county'];
                        if (county != undefined) {
                            $(".placecountyrow").show();
                            $("#placecounty").html(county);
                        }

                        // Update the UI with additional place information
                        $("#placestate").html(result['data']['results'][0]['components']['state']);
                        $('#placecountry').html(result['data']['results'][0]['components']['country']);
                        $("#placeformatted").html(result['data']['results'][0]['formatted']);
                        $("#placewhatthreewords").html(result['data']['results'][0]['annotations']['what3words']['words']);
                        
                        // Convert and display sunrise and sunset times
                        const apparentSunrise = new Date(result['data']['results'][0]['annotations']['sun']['rise']['apparent'] * 1000);
                        const apparentSunset = new Date(result['data']['results'][0]['annotations']['sun']['set']['apparent'] * 1000);
                        $("#placeapparentsunrise").html(apparentSunrise.toTimeString().slice(0, 5));
                        $("#placeapparentsunset").html(apparentSunset.toTimeString().slice(0, 5));
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Handle errors for Open Cage Data API
                }
            });

            // Show the modal containing the nearby place information
            $('#placenameModal').modal('show');
        }
    }]
});

// Apply styling to the nearby placename button
nearbyPlacenameBtn.button.style.backgroundColor = '#BFD641';  // Light green color

// Add the nearby placename button to the map
nearbyPlacenameBtn.addTo(map);
