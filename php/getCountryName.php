<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Geonames API URL to get all countries
    $url = 'http://api.geonames.org/countryInfoJSON?formatted=true&username=tembuu';

    // Initialize cURL session
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);

    // Execute the API request
    $result = curl_exec($ch);
    curl_close($ch);

    // Decode the result into an associative array
    $decode = json_decode($result, true);

    // Check if the response contains the 'geonames' key
    if (isset($decode['geonames']) && count($decode['geonames']) > 0) {
        $features = [];

        // Loop through and format data to match the expected structure
        foreach ($decode['geonames'] as $country) {
            $features[] = [
                'properties' => [
                    'iso_a2' => $country['countryCode'],
                    'name' => $country['countryName']
                ]
            ];
        }

        // Prepare output
        $output['status']['code'] = "200";
        $output['status']['name'] = "ok";
        $output['status']['description'] = "success";
        $output['data']['features'] = $features; // Placing country data in 'features'
    } else {
        // Handle case where no countries are found
        $output['status']['code'] = "404";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Countries not found.";
        $output['data'] = [];
    }

    // Add execution time
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
