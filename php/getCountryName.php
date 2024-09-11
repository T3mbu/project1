<?php

// Enable error reporting for debugging purposes
ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Start measuring execution time
$executionStartTime = microtime(true);

// Load the GeoJSON file containing country borders and names
$file = 'countryBorders.geo.json';
$data = file_get_contents($file);

// Decode the JSON data into an associative array
$borders = json_decode($data, true);

// Initialize an array to store the country names and their ISO codes
$countryNames = [];

// Loop through each feature in the GeoJSON data
foreach ($borders['features'] as $feature) {
    // Extract the country name and ISO_A2 code
    $countryName = $feature['properties']['name'];
    $isoCode = $feature['properties']['iso_a2'];

    // Add each country to the array with its name and ISO code
    $countryNames[] = [
        'name' => $countryName,
        'iso_a2' => $isoCode
    ];
}

// Prepare the response
$response = [
    'status' => [
        'name' => 'ok',
        'code' => 200,
        'description' => 'success'
    ],
    'data' => $countryNames
];

// Set response header to JSON and output the result
header('Content-Type: application/json; charset=UTF-8');
echo json_encode($response);

?>
