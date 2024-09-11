<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get the country code from the request
    $countryCode = isset($_REQUEST['countryCode']) ? $_REQUEST['countryCode'] : 'US'; // Default to 'US'

    // Load the GeoJSON file with country borders
    $file = 'countryBorders.geo.json';
    $data = file_get_contents($file);
    $borders = json_decode($data, true);

    // Find the borders for the selected country
    $result = null;
    foreach ($borders['features'] as $feature) {
        if ($feature['properties']['iso_a2'] === $countryCode) {
            $result = $feature;
            break;
        }
    }

    // Check if the result is found and prepare the output in proper GeoJSON format
    if ($result) {
        $output = [
            'type' => 'FeatureCollection',
            'features' => [$result]
        ];
    } else {
        $output = [
            'status' => [
                'code' => "404",
                'name' => "error",
                'description' => "Country borders not found"
            ],
            'data' => []
        ];
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
