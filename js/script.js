/*
    Script for preloader
*/
$(window).on('load', function () {
    // Apply the Preloader
    $('#preloader').delay(3000).fadeOut("slow");

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

const toner = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abcd',
    minZoom: 0,
    maxZoom: 20,
    ext: 'png'
});

const positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

const basemaps = {
    "Streets": streets,
    "Satellite": satellite,
    "Toner": toner,
    "Positron": positron
};

let map = L.map('map', { layers: [streets] }).fitWorld();

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
const earthquakeMarkers = L.markerClusterGroup();
const wikipediaArticleMarkers = L.markerClusterGroup();
const weatherObservationMarkers = L.markerClusterGroup();
const cityMarkers = L.markerClusterGroup();

// Set Up Overlays

const overlays = {
    "Earthquakes": earthquakeMarkers,
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

            earthquakeMarkers.clearLayers();
            wikipediaArticleMarkers.clearLayers();
            weatherObservationMarkers.clearLayers();
            cityMarkers.clearLayers();

            // Styles to Apply for Country
            let myStyle = {
                "color": "#0000FF",
                "weight": 1,
                "fillColor": "#95DEE3"
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
                // Get earthquakes data
                $.ajax({
                    url: "php/getEarthquakes.php",
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
                            const earthquakeIcon = L.ExtraMarkers.icon({
                                prefix: 'fa',
                                icon: 'fa-house-crack',
                                iconColor: 'white',
                                svg: true,
                                markerColor: '#5A3E36',
                                shape: 'square'
                            });

                            let earthquakeCoords = [];


                            for (let i = 0; i < result['data'].length; i++) {
                                let earthquakeText = ``;
                                let eqDate = new Date(result['data'][i]['datetime']);
                                let eqDepth = result['data'][i]['depth'];
                                let eqLatitude = result['data'][i]['lat'];
                                let eqLongitude = result['data'][i]['lng'];
                                let eqId = result['data'][i]['eqid'];
                                let eqMagnitude = result['data'][i]['magnitude'];
                                // Build the text for each earthquake
                                earthquakeText += `Date and Time - ${eqDate.toDateString()} - ${eqDate.toTimeString().slice(0, 5)} <br/>`;
                                earthquakeText += `Depth - ${eqDepth} <br/>`;
                                earthquakeText += `ID - ${eqId} <br/>`;
                                earthquakeText += `Magnitude - ${eqMagnitude}`;

                                // Add latitude, longitude, id and text to earthquakeCoords array
                                earthquakeCoords.push([eqLatitude, eqLongitude, eqId, earthquakeText]);

                            }

                            // Plot the earthquakes

                            for (let i = 0; i < earthquakeCoords.length; i++) {
                                let arr = earthquakeCoords[i];
                                let title = arr[2];
                                let description = arr[3];
                                let marker = L.marker(new L.LatLng(arr[0], arr[1]), { icon: earthquakeIcon, title: title });
                                marker.bindPopup(description);
                                earthquakeMarkers.addLayer(marker);
                            }

                            map.addLayer(earthquakeMarkers);

                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        // Your error code
                    }
                });

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
        title: 'Get Country Information',
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
infoBtn.button.style.backgroundColor = '#9BB7D4';

// Add Information Button to Map
infoBtn.addTo(map);

let exchangeBtn = L.easyButton({
    states: [{
        stateName: 'get-exchange-information',
        icon: 'fa-dollar',
        title: 'Get Exchange Information',
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
exchangeBtn.button.style.backgroundColor = '#A0DAA9';

// Add Exchange Button to Map
exchangeBtn.addTo(map);

let weatherBtn = L.easyButton({
    states: [{
        stateName: 'get-weather-information',
        icon: 'fa-umbrella',
        title: 'Get Weather Information',
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
weatherBtn.button.style.backgroundColor = '#E0B589';

// Add Weather Button to Map
weatherBtn.addTo(map);

let poiBtn = L.easyButton({
    states: [{
        stateName: 'find-nearby-points-of-interest',
        icon: 'fa-landmark',
        title: 'Get Nearby Points of Interest Information',
        onClick: function (btn, map) {
            // Clear entries
            $('#nearbypoiresults').html(``);
            $('#nearbypoinodata').html(``);
            // Hide Nearby Points of Interest No Data Message
            $('#nearbypoinodata').hide();
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fill entries
            $.ajax({
                url: "php/findNearbyPOIsOSM.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,
                    lng: longitude
                },
                success: function (result) {

                    if (result.status.name == "ok") {

                        try {
                            const counts = result.data.length;
                            // Build the Table
                            if (counts != undefined) $('#nearbypoiresults').append(`<caption>${counts} Nearby Points of Interest</caption>`);
                            for (let idx = 0; idx < counts; idx++) {
                                let name = result['data'][idx]['name'];
                                let poiTypeClass = result['data'][idx]['typeClass'];
                                let poiTypeName = result['data'][idx]['typeName'];

                                // If name is not empty show the name
                                if (name.length != 0) {
                                    $('#nearbypoiresults').append(`<tr>`);
                                    $('#nearbypoiresults').append(`<td>Name</td>`)
                                    $('#nearbypoiresults').append(`<td>${name}</td>`);
                                    $('#nearbypoiresults').append(`</tr>`);
                                }

                                $('#nearbypoiresults').append(`<tr>`);
                                $('#nearbypoiresults').append(`<td>Type Class</td>`);
                                $('#nearbypoiresults').append(`<td>${poiTypeClass}</td>`);
                                $('#nearbypoiresults').append(`</tr>`);

                                $('#nearbypoiresults').append(`<tr>`);
                                $('#nearbypoiresults').append(`<td>Type Name</td>`);
                                $('#nearbypoiresults').append(`<td>${poiTypeName}<p></p></td>`);
                                $('#nearbypoiresults').append(`</tr>`);
                            }

                        } catch (error) {
                            // Show the No Nearby Points of Interest Message
                            $('#nearbypoinodata').show();
                            $('#nearbypoinodata').html(`No Nearby Points of Interest`);
                        }

                    }
                },

                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code

                }
            });
            $('#poiModal').modal('show');
        }
    }]
});

// Apply Styling to Points of Interest Button
poiBtn.button.style.backgroundColor = '#E8B5CE';

// Add Points of Interest Button to Map
poiBtn.addTo(map);

let wikiBtn = L.easyButton({
    states: [{
        stateName: 'find-nearby-wikipedia',
        icon: 'fa-database',
        title: 'Get Nearby Wikipedia Information',
        onClick: function (btn, map) {
            // Clear entries
            $('#nearbywikiresults').html(``);
            $('#nearbywikinodata').html(``);
            // Hide Nearby Wikipedia No Data Message
            $('#nearbywikinodata').hide();
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fill entries
            $.ajax({
                url: "php/findNearbyWikipedia.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,
                    lng: longitude
                },
                success: function (result) {

                    if (result.status.name == "ok") {
                        const counts = result.data.length;
                        // If there are no counts
                        if (counts == 0) {

                            // Show the No Nearby Wikipedia Articles Message
                            $('#nearbywikinodata').show();
                            $('#nearbywikinodata').html(`No Nearby Wikipedia Articles`);

                        } else {
                            // Build the Table
                            $('#nearbywikiresults').append(`<caption>${counts} Nearby Wikipedia Articles</caption>`);
                            for (let idx = 0; idx < counts; idx++) {
                                let title = result['data'][idx]['title'];
                                let summary = result['data'][idx]['summary'];
                                let url = result['data'][idx]['wikipediaUrl'];
                                $('#nearbywikiresults').append(`<tr><td>${title}</td></tr>`);
                                $('#nearbywikiresults').append(`<tr><td>${summary}</td></tr>`);
                                $('#nearbywikiresults').append(`<tr><td class="text-center" id="nearbywikiurl"><a href="https://${url}" target="_blank" title="View Wikipedia Article for ${title}">View Wikipedia Article</a><p></p></td></tr>`);
                            }
                        }

                    }
                },

                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });
            $('#wikiModal').modal('show');
        }
    }]
});

// Apply Styling to Wikipedia Button
wikiBtn.button.style.backgroundColor = '#FAE03C';

// Add Wikipedia Button to Map
wikiBtn.addTo(map);

let nearbyPlacenameBtn = L.easyButton({
    states: [{
        stateName: 'find-nearby-placename',
        icon: 'fa-location-crosshairs',
        title: 'Find Nearby Placename',
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

let postalCodesBtn = L.easyButton({
    states: [{
        stateName: 'find-nearby-postal-codes',
        icon: 'fa-address-card',
        title: 'Find Nearby Postal Codes',
        onClick: function (btn, map) {
            // Clear entries
            $('#nearbypcresults').html(``);
            $('#nearbypcnodata').html(``);
            // Hide Nearby Postal Codes No Data Message
            $('#nearbypcnodata').hide();
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fill entries
            $.ajax({
                url: "php/findNearbyPostalCodes.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    lat: latitude,
                    lng: longitude
                },
                success: function (result) {
                    if (result.status.name == "ok") {
                        const counts = result.data.length;
                        // If there are no counts
                        if (counts == 0) {

                            // Show the No Nearby Postal Codes Message
                            $('#nearbypcnodata').show();
                            $('#nearbypcnodata').html(`No Nearby Postal Codes`);

                        } else {
                            // Build the Table
                            $('#nearbypcresults').append(`<caption>${counts} Nearby Postal Codes</caption>`);
                            for (let idx = 0; idx < counts; idx++) {
                                let placeName = result['data'][idx]['placeName'];
                                let adminName1 = result['data'][idx]['adminName1'];
                                let adminName2 = result['data'][idx]['adminName2'];
                                let adminName3 = result['data'][idx]['adminName3'];
                                let countryCode = result['data'][idx]['countryCode'];
                                let postalCode = result['data'][idx]['postalCode'];

                                $('#nearbypcresults').append(`<tr>`);
                                $('#nearbypcresults').append(`<td>Place Name</td>`);
                                $('#nearbypcresults').append(`<td>${placeName}</td>`);
                                $('#nearbypcresults').append(`</tr>`);

                                $('#nearbypcresults').append(`<tr>`);
                                $('#nearbypcresults').append(`<td>State</td>`);
                                $('#nearbypcresults').append(`<td>${adminName1}</td>`);
                                $('#nearbypcresults').append(`</tr>`);

                                // Check if the second admin name is not undefined
                                if (adminName2 !== undefined) {
                                    $('#nearbypcresults').append(`<tr>`);
                                    $('#nearbypcresults').append(`<td>County/Province</td>`);
                                    $('#nearbypcresults').append(`<td>${adminName2}</td>`)
                                    $('#nearbypcresults').append(`</tr>`);
                                }


                                // Check if the third admin name is not undefined
                                if (adminName3 !== undefined) {
                                    $('#nearbypcresults').append(`<tr>`);
                                    $('#nearbypcresults').append(`<td>District</td>`);
                                    $('#nearbypcresults').append(`<td>${adminName3}</td>`);
                                    $('#nearbypcresults').append(`</tr>`);
                                }

                                $('#nearbypcresults').append(`<tr>`);
                                $('#nearbypcresults').append(`<td>Country Code</td>`);
                                $('#nearbypcresults').append(`<td>${countryCode}</td>`);
                                $('#nearbypcresults').append(`</tr>`);

                                $('#nearbypcresults').append(`<tr>`);
                                $('#nearbypcresults').append(`<td>Postal Code</td>`);
                                $('#nearbypcresults').append(`<td>${postalCode}<p></p></td>`);
                                $('#nearbypcresults').append(`</tr>`);
                            }
                        }
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    // Your error code
                }
            });

            $('#postalModal').modal('show');
        }
    }]
});

// Apply Styling to Postal Button
postalCodesBtn.button.style.backgroundColor = '#55B4B0';

// Add Postal Button to Map
postalCodesBtn.addTo(map);

let newsBtn = L.easyButton({
    states: [{
        stateName: 'get-news',
        icon: 'fa-newspaper',
        title: 'Get News',
        onClick: function (btn, map) {
            // Clear entries
            $('#newsresults').html(``);
            $('#newsnodata').html(``);
            // Hide News No Data Message
            $('#newsnodata').hide();
            const center = map.getCenter();
            const latitude = center["lat"];
            const longitude = center["lng"];
            // Get Updated Country Code based on Latitude and Longitude
            updateCountryCodeAndCountryName(latitude, longitude);

            // Fill entries
            $.ajax({
                url: "php/newsApi.php",
                type: 'POST',
                dataType: 'JSON',
                data: {
                    country: $('#selCountry').val()
                },
                success: function (result) {

                    if (result.status.name == "ok") {

                        // If there are no counts
                        if (result['data']['totalResults'] == 0 || result['data']['totalResults'] == undefined) {
                            $('#newsnodata').show();
                            $('#newsnodata').html(`No news articles for selected country`);
                        } else {
                            // Build the Table

                            // Display the First 10 News Results
                            for (let idx = 0; idx < 10; idx++) {
                                let title = result['data']['results'][idx]['title'];
                                let imageUrl = result['data']['results'][idx]['image_url'] !== null ? result['data']['results'][idx]['image_url'] : "breakingnews.jpg";
                              	// Check for empty image URL after removing whitespace or image URLs not ending with .jpg 
                                if (imageUrl.trim().length == 0 || !imageUrl.endsWith(".jpg")) imageUrl = "breakingnews.jpg";
                                let imageAlt = imageUrl !== "breakingnews.jpg" ? title : "Breaking News";
                                let sourceID = result['data']['results'][idx]['source_id'];
                                let link = result['data']['results'][idx]['link'];

                                $('#newsresults').append(`<tr>`);
                                $('#newsresults').append(`<td rowspan="2" class="w-50"><img class="img-fluid rounded" src="${imageUrl}" alt="${imageAlt}" title="${imageAlt}"></td>`);

                                $('#newsresults').append(`<td id="newslink"><a href="${link}" target="_blank" title="View News Article">${title}</a></td>`);
                                $('#newsresults').append(`</tr>`);

                                $('#newsresults').append(`<tr>`);
                                $('#newsresults').append(`<td class="align-bottom pb-0">`);
                                $('#newsresults').append(`<p class="fs-6 mb-1">${sourceID}</p>`);
                                $('#newsresults').append(`</td></tr>`);

                                $('#newsresults').append(`<tr><td colspan="2"><p class="border-bottom border-dark"></p></td></tr>`);

                            }
                        }

                    } else {
                        $('#newsnodata').show();
                        $('#newsnodata').html(`Error retrieving news articles`);
                    }
                },

                error: function (jqXHR, textStatus, errorThrown) {
                    $('#newsnodata').show();
                    $('#newsnodata').html(`Error retrieving news articles`);
                }
            });
            $('#newsModal').modal('show');
        }
    }]
});

// Apply Styling to News Button
newsBtn.button.style.backgroundColor = '#C9A0DC';

// Add News Button to Map
newsBtn.addTo(map);