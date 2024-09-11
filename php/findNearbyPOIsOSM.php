<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get latitude and longitude from the request
    $latitude = isset($_REQUEST['lat']) ? $_REQUEST['lat'] : null;
    $longitude = isset($_REQUEST['lng']) ? $_REQUEST['lng'] : null;

    // Check if latitude and longitude are provided
    if ($latitude === null || $longitude === null) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Latitude and Longitude are required.";
        echo json_encode($output);
        exit;
    }

    // GeoNames API URL for finding nearby POIs (OpenStreetMap)
    $username = 'tembuu'; 
    $url = 'http://api.geonames.org/findNearbyPOIsOSMJSON?lat=' . $latitude . '&lng=' . $longitude . '&username=' . $username;

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

    // Prepare output with status and response data
    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    // Check if the response contains POIs data
    if ($decode && isset($decode['poi'])) {
        $output['data'] = $decode['poi'];
        $output['status']['description'] = "success";
    } else {
        // Handle no data found
        $output['data'] = [];
        $output['status']['description'] = "No POIs found.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
