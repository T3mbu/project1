/*
    Script for preloader
*/
$(window).on('load', function () {
    // Apply the Preloader
    $('#preloader').delay(3000).fadeOut("slow");

});

$(document).ready(function () {
    // Show the modal when the document is fully loaded
    $('#projectInfoModal').modal('show');
});

// Functions

/*
    Function to Convert a Cardinal Number to an Ordinal Number
    For Example, 1 would become 1st

*/
function nth(num) {
    return (num % 10 == 1 && num % 100 != 11) ? num.toString() + "st" : (num % 10 == 2 && num % 100 != 12) ? num.toString() + "nd" : (num % 10 == 3 && num % 100 != 13) ? num.toString() + "rd" : num.toString() + "th";
}

/*
    Function to Update Country Code and Country Name

    Update the Country Name in the Dropdown if Necessary

*/
function updateCountryCodeAndCountryName(lat, lng) {
    $.ajax({
        url: "php/getCountryCode.php",
        type: 'POST',
        dataType: 'JSON',
        data: {
            lat: lat,
            lng: lng
        },
        success: function (result) {
            if (result.status.name == "ok") {
                $('#selCountry').val(result['data']['countryCode']).change();
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // Your error code
        }
    });
}

// Function to Compare Two Strings a and b
function compareStrings(a, b) {
    let al = a.toLowerCase();
    let bl = b.toLowerCase();
    return (al < bl) ? -1 : (al > bl) ? 1 : 0;
}

/*
    Function to Format a Large Positive Integer with Commas
    Examples - 1970 is formatted as 1,970 and 39450 is formatted as 39,450

*/
function largeNumberFormat(num) {
    // Convert the Number to a String and Calculate the length of that string
    const numStr = num.toString();
    const digits = numStr.length;

    // If there are 3 digits or less, leave the number as it is
    if (digits <= 3) return numStr;

    let result = '';

    for (let i = 0; i < digits; i++) {
        result += numStr[digits - 1 - i];

        /*
            Add the comma if the number of seen digits is a multiple of 3 and
            not on the last digit
        */
        if ((i % 3 == 2) && i != digits - 1) result += `,`;
    }

    // Convert the string to an array, reverse the array and back to a string
    return [...result].reverse().join('');
}

// Set Up Map

// Basemap Layers
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

const basemaps = {
    "Satellite": satellite,
    "Streets": streets,
    "Dark": cartoDarkMatter

};

let map = L.map('map', {
    layers: [satellite], 
    zoomControl: false // Disable default zoom control
}).fitWorld();

// Add zoom control with new position
L.control.zoom({
    position: 'bottomright' // This moves the zoom control to the bottom right
}).addTo(map);

// Add Search Control

const search = new GeoSearch.GeoSearchControl({
    provider: new GeoSearch.OpenStreetMapProvider(),
    style: 'button',
    showPopup: true,
    popupFormat: ({
        query,
        result
    }) =>
        `${result.label} <br/> Latitude: ${parseFloat(result.y).toFixed(6)} <br/>
     Longitude: ${parseFloat(result.x).toFixed(6)}`,
    searchLabel: 'Enter country, place or attraction'
});

map.addControl(search);

function onLocationFound(e) {

    const latitude = e.latlng['lat'];
    const longitude = e.latlng['lng'];
    updateCountryCodeAndCountryName(latitude, longitude);

}

map.on('locationfound', onLocationFound);

map.locate({ setView: true, maxZoom: 6 });

// Populate and Sort Country Lists
$.ajax({
    url: 'php/getCountryName.php',
    type: 'POST',
    dataType: 'JSON',
    success: function (result) {
        if (result.status.name == "ok") {
            result.data.features.sort((a, b) => compareStrings(a.properties.name, b.properties.name));
            for (let i = 0; i < result.data.features.length; i++) {
                let $option = $('<option>').val(result.data.features[i].properties.iso_a2).text(result.data.features[i].properties.name);
                $('#selCountry').append($option);
            }
        }
    },
    error: function (jqXHR, textStatus, errorThrown) {
        // Your error code
    }
});

// GeoJSON and Marker Cluster Groups
let border = new L.GeoJSON();
const wikipediaArticleMarkers = L.markerClusterGroup();
const weatherObservationMarkers = L.markerClusterGroup();
const cityMarkers = L.markerClusterGroup();

// Set Up Overlays

const overlays = {
    "WikipediaArticles": wikipediaArticleMarkers,
    "WeatherObservations": weatherObservationMarkers,
    "Cities": cityMarkers
};

// Set Up Layer Control
const layerControl = L.control.layers(basemaps, overlays).addTo(map);

// Perform Change Event when Country is Selected
$('#selCountry').on('change', function () {

    let code = $('#selCountry').val();

    $.ajax({
        url: 'php/getCountryBorders.php',
        type: 'POST',
        dataType: 'JSON',
        data: {
            countryCode: code
        },
        success: function (result) {

            border.clearLayers();


            wikipediaArticleMarkers.clearLayers();
            weatherObservationMarkers.clearLayers();
            cityMarkers.clearLayers();

            // Styles to Apply for Country
            let myStyle = {
                "color": "#FF0000",
                "weight": 1,
                "fillColor": "#F28B82"
            };

            let myData = result;

            border.addData(myData).setStyle(myStyle).addTo(map);

            map.fitBounds(border.getBounds());
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // Your error code
        }
    });

    let north;
    let south;
    let east;
    let west;

    $.ajax({
        url: "php/getCountryInfo.php",
        type: 'POST',
        dataType: 'JSON',
        data: {
            country: code
        },
        success: function (result) {

            if (result.status.name == "ok") {
                north = result['data'][0]['north'];
                south = result['data'][0]['south'];
                east = result['data'][0]['east'];
                west = result['data'][0]['west'];

                

                // Get Wikipedia articles
                $.ajax({
                    url: "php/wikipediaArticles.php",
                    type: 'POST',
                    dataType: 'JSON',
                    data: {
                        north: north,
                        south: south,
                        east: east,
                        west: west
                    },
                    success: function (result) {

                        if (result.status.name == "ok") {
                            const databaseIcon = L.ExtraMarkers.icon({
                                prefix: 'fa',
                                icon: 'fa-database',
                                iconColor: 'white',
                                svg: true,
                                markerColor: '#0072B5',
                                shape: 'square'
                            });

                            let wikipediaArticleCoords = [];

                            for (let i = 0; i < result['data'].length; i++) {
                                let wikipediaArticleText = ``;
                                let wikiTitle = result['data'][i]['title'];
                                let wikiLatitude = result['data'][i]['lat'];
                                let wikiLongitude = result['data'][i]['lng'];
                                let wikiSummary = result['data'][i]['summary'];
                                let wikiUrl = result['data'][i]['wikipediaUrl'];

                                // Build the text for each Wikipedia Article
                                wikipediaArticleText += `<h4>${wikiTitle}</h4>`;
                                wikipediaArticleText += `<p>${wikiSummary} </p>`;
                                wikipediaArticleText += `<p class="text-center" id="wikipedia"><a href="https://${wikiUrl}" target="_blank" title="View Wikipedia Article for ${wikiTitle}">View Wikipedia Article</a></p>`;

                                // Add latitude, longitude, title and text to wikipediaArticleCoords array
                                wikipediaArticleCoords.push([wikiLatitude, wikiLongitude, wikiTitle, wikipediaArticleText]);

                            }

                            // Plot the Wikipedia Articles

                            for (let i = 0; i < wikipediaArticleCoords.length; i++) {
                                let arr = wikipediaArticleCoords[i];
                                let title = arr[2];
                                let description = arr[3];
                                let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: databaseIcon, title: title });
                                marker.bindPopup(description);
                                wikipediaArticleMarkers.addLayer(marker);
                            }

                            map.addLayer(wikipediaArticleMarkers);

                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        // Your error code
                    }
                });

                // Get Weather Observations
                $.ajax({
                    url: "php/weatherObservations.php",
                    type: 'POST',
                    dataType: 'JSON',
                    data: {
                        north: north,
                        south: south,
                        east: east,
                        west: west
                    },
                    success: function (result) {

                        if (result.status.name == "ok") {
                            const theWeatherIcon = L.ExtraMarkers.icon({
                                prefix: 'fa',
                                icon: 'fa-umbrella',
                                iconColor: 'white',
                                svg: true,
                                markerColor: '#6B5B95',
                                shape: 'square'
                            });

                            let weatherObservationCoords = [];

                            for (let i = 0; i < result['data'].length; i++) {
                                let weatherObservationText = ``;
                                let weatherDate = new Date(result['data'][i]['datetime']);
                                let weatherObservation = result['data'][i]['observation'];
                                let weatherStationName = result['data'][i]['stationName'];
                                let weatherClouds = result['data'][i]['clouds'];
                                let weatherLatitude = result['data'][i]['lat'];
                                let weatherLongitude = result['data'][i]['lng'];
                                let weatherTemperature = result['data'][i]['temperature'];


                                // Build the text for each Weather Observation
                                weatherObservationText += `Date and Time - ${weatherDate.toDateString()} - ${weatherDate.toTimeString().slice(0, 5)} <br/>`;
                                weatherObservationText += `Observation - ${weatherObservation} <br/>`;
                                weatherObservationText += `Weather Station - ${weatherStationName} <br/>`;
                                weatherObservationText += `Clouds - ${weatherClouds} <br/>`;
                                weatherObservationText += `Temperature - ${weatherTemperature} °C`;


                                // Add latitude, longitude, weather station and text to weatherObservationCoords array
                                weatherObservationCoords.push([weatherLatitude, weatherLongitude, weatherStationName, weatherObservationText]);

                            }

                            // Plot the Weather Observations

                            for (let i = 0; i < weatherObservationCoords.length; i++) {
                                let arr = weatherObservationCoords[i];
                                let title = arr[2];
                                let description = arr[3];
                                let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: theWeatherIcon, title: title });
                                marker.bindPopup(description);
                                weatherObservationMarkers.addLayer(marker);
                            }

                            map.addLayer(weatherObservationMarkers);

                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        // Your error code
                    }
                });

                // Get Cities
                $.ajax({
                    url: "php/cities.php",
                    type: 'POST',
                    dataType: 'JSON',
                    data: {
                        north: north,
                        south: south,
                        east: east,
                        west: west
                    },
                    success: function (result) {

                        if (result.status.name == "ok") {
                            const cityIcon = L.ExtraMarkers.icon({
                                prefix: 'fa',
                                icon: 'fa-city',
                                iconColor: 'white',
                                svg: true,
                                markerColor: '#00A170',
                                shape: 'square'
                            });

                            let cityCoords = [];

                            for (let i = 0; i < result['data'].length; i++) {
                                let cityText = ``;
                                let cityName = result['data'][i]['name'];
                                let cityLatitude = result['data'][i]['lat'];
                                let cityLongitude = result['data'][i]['lng'];
                                let cityPopulation = result['data'][i]['population'];
                                let cityUrl = result['data'][i]['wikipedia'];

                                // Build the text for each City
                                cityText += `<h4>${cityName}</h4>`;
                                cityText += `<p>Population - ${largeNumberFormat(cityPopulation)} </p>`;
                                cityText += `<p class="text-center" id="citywikipedia"><a href="https://${cityUrl}" target="_blank" title="View Wikipedia Article for ${cityName}">View Wikipedia Article</a></p>`;

                                // Add latitude, longitude, title and text to cityCoords array
                                cityCoords.push([cityLatitude, cityLongitude, cityName, cityText]);

                            }

                            // Plot the Cities

                            for (let i = 0; i < cityCoords.length; i++) {
                                let arr = cityCoords[i];
                                let title = arr[2];
                                let description = arr[3];
                                let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: cityIcon, title: title });
                                marker.bindPopup(description);
                                cityMarkers.addLayer(marker);
                            }

                            map.addLayer(cityMarkers);

                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        // Your error code
                    }
                });

            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            // Your error code
        }

    });
});


// Set Up Easy Buttons
let infoBtn = L.easyButton({
    states: [{
        stateName: 'get-country-information',
        icon: 'fa-info',
        title: 'Country Information',
        onClick: function (btn, map) {
            // Clear entries
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
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fill entries - Geonames (getCountryInfo)
            $.ajax({
                url: "php/getCountryInfo.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val()
                },
                success: function (result) {

                    if (result.status.name == "ok") {

                        let countryName = result['data'][0]['countryName'];
                        let countryNameWithUnderscores = countryName.replaceAll(" ", "_");
                        let countryCapital = result['data'][0]['capital'];
                        let countryCapitalWithUnderscores = countryCapital.replaceAll(" ", "_");
                        let countryPopulation = result['data'][0]['population'];
                        $("#countryname").html(`<a href="https://en.wikipedia.org/wiki/${countryNameWithUnderscores}" target="_blank" title="View More Details for ${countryName}">${countryName}</a>`);
                        $("#countrycapital").html(`<a href="https://en.wikipedia.org/wiki/${countryCapitalWithUnderscores}" target="_blank" title="View More Details for ${countryCapital}">${countryCapital}</a>`);
                        $("#countrypopulation").html(`${largeNumberFormat(countryPopulation)}`);
                        $("#countrycontinent").html(`${result['data'][0]['continentName']} (${result['data'][0]['continent']})`);

                        // Fill Entries - REST Countries Data
                        $.ajax({
                            url: "php/restCountries.php",
                            type: 'POST',
                            dataType: 'JSON',
                            data: {
                                country: $('#selCountry :selected').text().replace("W. Sahara", "Western Sahara").replaceAll(" ", "%20")
                            },
                            success: function (result) {
                                if (result.status.name == "ok") {
                                    // Check if the capital city is empty
                                    if (countryCapital.length == 0) {
                                        countryCapital = result['data'][0]['capital'][0];
                                        countryCapitalWithUnderscores = countryCapital.replaceAll(" ", "_");
                                        $("#countrycapital").html(`<a href="https://en.wikipedia.org/wiki/${countryCapitalWithUnderscores}" target="_blank" title="View More Details for ${countryCapital}">${countryCapital}</a>`);

                                    }

                                }
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                // Your error code
                            }
                        });

                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });


            // Fill Entries - Open Cage Data
            $.ajax({
                url: "php/openCageDataByCountry.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry :selected').text().replaceAll(" ", "%20").replace("Dem.%20Rep.%20Korea", "North%20Korea").replace("Rep.", "Republic").replace("Lao%20PDR", "Laos")
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Filter Results whose component type is administrative or country or state
                        const filterData = result.data.results.filter((componentType) => componentType.components._type === "country" || componentType.components._type === "administrative" || (componentType.components._type === "state" && componentType.components.state_code === "PR"));

                        $("#countrycurrency").html(filterData[0]['annotations']['currency']['name']);
                        $("#countrydriveon").html(filterData[0]['annotations']['roadinfo']['drive_on']);
                        $("#countryspeedunit").html(filterData[0]['annotations']['roadinfo']['speed_in']);
                        $("#countrywhatthreewords").html(filterData[0]['annotations']['what3words']['words']);
                        $("#countryflag").html(filterData[0]['annotations']['flag']);

                        const apparentSunrise = filterData[0]['annotations']['sun']['rise']['apparent'];
                        const apparentSunset = filterData[0]['annotations']['sun']['set']['apparent'];
                        const apparentSunriseDateTime = new Date(apparentSunrise * 1000);
                        const apparentSunsetDateTime = new Date(apparentSunset * 1000);
                        // Format Apparent Sunrise and Apparent Sunset as Time
                        $("#countryapparentsunrise").html(apparentSunriseDateTime.toTimeString().slice(0, 5));
                        $("#countryapparentsunset").html(apparentSunsetDateTime.toTimeString().slice(0, 5));
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });

            $('#infoModal').modal('show');
        }
    }]
});

// Apply Styling to Information Button
infoBtn.button.style.backgroundColor = '#800020';

// Add Information Button to Map
infoBtn.addTo(map);

let exchangeBtn = L.easyButton({
    states: [{
        stateName: 'get-exchange-information',
        icon: 'fa-dollar',
        title: 'Exchange Information',
        onClick: function (btn, map) {
            // Clear entries
            $('#exchangeupdatedon').html(``);
            $('#exchangefromcurrency').html(``);
            $('#exchangeresults').html(``);

            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            let selectedCurrencyCode;

            // Fill Entries
            $.ajax({
                url: "php/getCountryInfo.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val()
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        // Get the Currency Code
                        selectedCurrencyCode = result['data'][0]['currencyCode'];
                        // Get Exchange Rates
                        $.ajax({
                            url: "php/openExchangeRates.php",
                            type: 'POST',
                            dataType: 'JSON',
                            data: {
                                base: 'USD'
                            },
                            success: function (result) {

                                if (result.status.name == "ok") {
                                    let exchangeTimeStamp = result['data']['timestamp'];
                                    let exchangeUpdatedOn = new Date(exchangeTimeStamp * 1000);
                                    $('#exchangeupdatedon').html(`${exchangeUpdatedOn.toDateString()} - ${exchangeUpdatedOn.toTimeString().slice(0, 5)}`);
                                    $("#exchangefromcurrency").html(selectedCurrencyCode);
                                    const currencies = Object.keys(result['data']['rates']);
                                    // Populate the currencies
                                    for (let i = 0; i < currencies.length; i++) {
                                        $('#selCurrency').append(`<option value=${currencies[i]}>${currencies[i]}</option>`);
                                    }

                                    // Set the Default Currency Code
                                    $('#selCurrency').val(selectedCurrencyCode);

                                    let selectedCurrency;

                                    // Perform Event when User Releases a Key in the Amount Field
                                    $('#fromamount').on('keyup', function () {
                                        const amount = $('#fromamount').val();

                                        // Check if the input is valid
                                        if (amount < 1 || amount > 1000000 || (amount[0] == "0" && amount.length > 1) || !Number.isInteger(Number(amount))) {
                                            $('#exchangeresults').html(`Please enter a whole number between 1 and 1,000,000 (in ${selectedCurrencyCode}).  Do not include leading zeros such as 03.`);
                                        } else {
                                            calculateResult();
                                        }
                                    });

                                    // Perform Event when User Changes the Content in the Amount Field
                                    $('#fromamount').on('change', function () {
                                        calculateResult();
                                    });

                                    // Perform Event when User Changes the Currency Code

                                    $('#selCurrency').on('change', function () {
                                        calculateResult();
                                    });

                                    /*
                                        Function to Calculate the Result, formatting any large numbers with commas
                                    */

                                    function calculateResult() {
                                        selectedCurrency = $('#selCurrency :selected').text();

                                        const fromCurrencyToUSD = 1 / result['data']['rates'][selectedCurrencyCode];
                                        const amount = $('#fromamount').val();
                                        const selectedExchangeRate = result['data']['rates'][selectedCurrency];
                                        const exchangeResult = fromCurrencyToUSD * amount * selectedExchangeRate;
                                        $('#exchangeresults').html(exchangeResult.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

                                    }

                                    // Perform Event when User Clicks the Clear Button
                                    $('#exchangeclear').on('click', function () {
                                        $('#exchangeresults').html(``);
                                    });

                                }
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                // Your error code
                            }
                        });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });



            $('#exchangeModal').modal('show');
        }
    }]
});

// Apply Styling to Exchange Button
exchangeBtn.button.style.backgroundColor = '#228B22';

// Add Exchange Button to Map
exchangeBtn.addTo(map);

let weatherBtn = L.easyButton({
    states: [{
        stateName: 'get-weather-information',
        icon: 'fa-solid fa-cloud',
        title: 'Weather Information',
        onClick: function (btn, map) {
            // Clear entries
            $('#weathercityname').html(``);
            $('#weathertzid').html(``);
            $('#lastupdated').html(``);

            $('#currentconditions').html(``);
            $('#currenttemp').html(``);
            $('#currenticon').attr('src', '').attr('title', '').attr('alt', '');

            $('#day0maxtemp').html(``);
            $('#day0mintemp').html(``);
            $('#day0date').html(``);
            $('#day0icon').attr('src', '').attr('title', '').attr('alt', '');

            $('#day1maxtemp').html(``);
            $('#day1mintemp').html(``);
            $('#day1date').html(``);
            $('#day1icon').attr('src', '').attr('title', '').attr('alt', '');

            $('#day2maxtemp').html(``);
            $('#day2mintemp').html(``);
            $('#day2date').html(``);
            $('#day2icon').attr('src', '').attr('title', '').attr('alt', '');

            $('#weathererror').html(``);
            // Hide Weather Error
            $('#weathererror').hide();
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            let city;

            // Get the Capital City
            $.ajax({
                url: "php/getCountryInfo.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val()
                },
                success: function (result) {

                    if (result.status.name == "ok") {

                        city = result['data'][0]['capital'];
                        // If the Capital City is Nur-Sultan change to Astana
                        if (city == "Nur-Sultan") city = "Astana";
                        // If the Capital City is Lomé change to Lome
                        if (city == "Lomé") city = "Lome";
                        // If the Capital City is Kyiv change to Kiev
                        if (city == "Kyiv") city = "Kiev";
                        // If the Capital City is Chișinău change to Chisinau
                        if (city == "Chișinău") city = "Chisinau";
                        // If the Capital City is Asunción change to Asuncion
                        if (city == "Asunción") city = "Asuncion";
                        // If the Capital City is Brasília change to Brasilia
                        if (city == "Brasília") city = "Brasilia";
                        // If the Capital City is Yaoundé change to Yaounde
                        if (city == "Yaoundé") city = "Yaounde";
                        // If the Capital City is Bogotá change to Bogota
                        if (city == "Bogotá") city = "Bogota";
                        // If the Capital City is San José change to San Jose,San Jose,Costa Rica
                        if (city == "San José") city = "San Jose,Costa Rica";
                        // If the Capital City is San Juan, change to San Juan, Puerto Rico
                        if (city == "San Juan") city = "San Juan,Puerto Rico";
                        // Apply Encoding
                        city = city.replaceAll(" ", "%20").replaceAll("'", "%27");

                        $.ajax({
                            url: "php/restCountries.php",
                            type: 'POST',
                            dataType: 'JSON',
                            data: {
                                country: $('#selCountry :selected').text().replace("W. Sahara", "Western Sahara").replaceAll(" ", "%20")
                            },
                            success: function (result) {
                                if (result.status.name == "ok") {
                                    // Check if the capital city is empty
                                    if (city.length == 0) {
                                        city = result['data'][0]['capital'][0];
                                        // Apply Encoding
                                        city = city.replaceAll(" ", "%20").replaceAll("'", "%27").replaceAll("ú", "%C3%BA");

                                    }

                                    // Get Weather Data
                                    $.ajax({

                                        url: "php/weatherApi.php",
                                        type: 'POST',
                                        dataType: 'JSON',
                                        data: {
                                            city: city
                                        },
                                        success: function (result) {

                                            if (result.status.name == "ok") {

                                                // Set Up Constants
                                                const place = result['data']['location']['name'];
                                                const country = result['data']['location']['country'];
                                                const tzid = result['data']['location']['tz_id'];

                                                const lastUpdated = new Date(result['data']['current']['last_updated']);
                                                const currentTemp = Math.round(result['data']['current']['temp_c']);
                                                const currentConditions = result['data']['current']['condition']['text'];
                                                const currentIcon = result['data']['current']['condition']['icon'];
                                                const currentIconPath = currentIcon.replace("//cdn.weatherapi.com", "images");

                                                const day0MaxTemp = Math.round(result['data']['forecast']['forecastday'][0]['day']['maxtemp_c']);
                                                const day0MinTemp = Math.round(result['data']['forecast']['forecastday'][0]['day']['mintemp_c']);
                                                const day0Conditions = result['data']['forecast']['forecastday'][0]['day']['condition']['text'];
                                                const day0Icon = result['data']['forecast']['forecastday'][0]['day']['condition']['icon'];
                                                const day0IconPath = day0Icon.replace("//cdn.weatherapi.com", "images");
                                                const day0Date = new Date(result['data']['forecast']['forecastday'][0]['date']);
                                                const day0Month = day0Date.toDateString().slice(4, 7);
                                                const day0Day = day0Date.toDateString().slice(8, 10);
                                                const day0DayNum = parseInt(day0Day);

                                                const day1MaxTemp = Math.round(result['data']['forecast']['forecastday'][1]['day']['maxtemp_c']);
                                                const day1MinTemp = Math.round(result['data']['forecast']['forecastday'][1]['day']['mintemp_c']);
                                                const day1Conditions = result['data']['forecast']['forecastday'][1]['day']['condition']['text'];
                                                const day1Icon = result['data']['forecast']['forecastday'][1]['day']['condition']['icon'];
                                                const day1IconPath = day1Icon.replace("//cdn.weatherapi.com", "images");
                                                const day1Date = new Date(result['data']['forecast']['forecastday'][1]['date']);
                                                const day1Month = day1Date.toDateString().slice(4, 7);
                                                const day1Day = day1Date.toDateString().slice(8, 10);
                                                const day1DayNum = parseInt(day1Day);

                                                const day2MaxTemp = Math.round(result['data']['forecast']['forecastday'][2]['day']['maxtemp_c']);
                                                const day2MinTemp = Math.round(result['data']['forecast']['forecastday'][2]['day']['mintemp_c']);
                                                const day2Conditions = result['data']['forecast']['forecastday'][2]['day']['condition']['text'];
                                                const day2Icon = result['data']['forecast']['forecastday'][2]['day']['condition']['icon'];
                                                const day2IconPath = day2Icon.replace("//cdn.weatherapi.com", "images");
                                                const day2Date = new Date(result['data']['forecast']['forecastday'][2]['date']);
                                                const day2Month = day2Date.toDateString().slice(4, 7);
                                                const day2Day = day2Date.toDateString().slice(8, 10);
                                                const day2DayNum = parseInt(day2Day);

                                                $("#weathercityname").html(`${place}, ${country}`);
                                                $('#weathertzid').html(`${tzid}`);
                                                $('#lastupdated').html(`${lastUpdated.toDateString()} - ${lastUpdated.toTimeString().slice(0, 5)}`);

                                                $('#currenttemp').html(`${currentTemp} &deg;C`);
                                                $("#currentconditions").html(`${currentConditions}`);
                                                $('#currenticon').attr('src', currentIconPath).attr('title', currentConditions).attr(currentConditions);

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
                                                $('#weathererror').show();
                                                $('#weathererror').html(`Error Retrieving Weather Information`);
                                            }
                                        },
                                        error: function (jqXHR, textStatus, errorThrown) {
                                            $('#weathererror').show();
                                            $('#weathererror').html(`Error Retrieving Weather Information`);
                                        }
                                    });

                                }
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                // Your error code
                            }
                        });


                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });

            $('#weatherModal').modal('show');
        }
    }]
});

// Apply Styling to Weather Button
weatherBtn.button.style.backgroundColor = '#1434A4';

// Add Weather Button to Map
weatherBtn.addTo(map);

let nearbyPlacenameBtn = L.easyButton({
    states: [{
        stateName: 'find-nearby-placename',
        icon: 'fa-location-crosshairs',
        title: 'Nearby Placename',
        onClick: function (btn, map) {
            // Clear entries
            $('#placename').html(``);
            $('#placecounty').html(``);
            $('#placestate').html(``);
            $('#placecountry').html(``);
            $('#placeformatted').html(``);
            $('#placewhatthreewords').html(``);
            $('#placeapparentsunrise').html(``);
            $('#placeapparentsunset').html(``);
            // Hide County Row
            $('.placecountyrow').hide();
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fill entries - Geonames findNearbyPlaceName
            $.ajax({
                url: "php/findNearbyPlaceName.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,
                    lng: longitude
                },
                success: function (result) {
                    if (result.status.name == "ok") {
                        $('#placename').html(result['data'][0]['name']);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });

            // Fill entries - Open Cage Data
            $.ajax({
                url: "php/openCageDataByLatLng.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,
                    lng: longitude
                },
                success: function (result) {
                    if (result.status.name == "ok") {

                        let county = result['data']['results'][0]['components']['county'];

                        /*

                            Check if the county name is not undefined.

                            If the county name is not undefined, the row can be shown and the county name displayed.

                            If the county name is undefined, the row can be hidden.

                            For example, although Norwich is in Norfolk, it
                            does not have to have Norfolk as the name of the county.

                        */
                        if (county != undefined) {
                            $(".placecountyrow").show();
                            $("#placecounty").html(county);
                        }

                        $("#placestate").html(result['data']['results'][0]['components']['state']);
                        $('#placecountry').html(result['data']['results'][0]['components']['country']);
                        $("#placeformatted").html(result['data']['results'][0]['formatted']);
                        $("#placewhatthreewords").html(result['data']['results'][0]['annotations']['what3words']['words']);
                        const apparentSunrise = new Date(result['data']['results'][0]['annotations']['sun']['rise']['apparent'] * 1000);
                        const apparentSunset = new Date(result['data']['results'][0]['annotations']['sun']['set']['apparent'] * 1000);
                        $("#placeapparentsunrise").html(apparentSunrise.toTimeString().slice(0, 5));
                        $("#placeapparentsunset").html(apparentSunset.toTimeString().slice(0, 5));
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });
            $('#placenameModal').modal('show');
        }
    }]
});

// Apply Styling to Nearby Placename
nearbyPlacenameBtn.button.style.backgroundColor = '#BFD641';

// Add Nearby Placename Button to Map
nearbyPlacenameBtn.addTo(map);


