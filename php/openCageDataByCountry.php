<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get the country name or country code from the request
    $country = isset($_REQUEST['country']) ? $_REQUEST['country'] : null;

    // Ensure country name or code is provided
    if ($country === null) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Country name or code is required.";
        echo json_encode($output);
        exit;
    }

    // OpenCage API URL with your API key
    $apiKey = 'c07440e9e0ee49158725329a08a4928a'; //OpenCage API key
    $url = 'https://api.opencagedata.com/geocode/v1/json?q=' . urlencode($country) . '&key=' . $apiKey;

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

    // Ensure 'results' exists and contains data
    if (isset($decode['results']) && count($decode['results']) > 0) {
        $output['data']['results'] = $decode['results'];
        $output['status']['description'] = "success";
    } else {
        // Handle no data found
        $output['data']['results'] = [];
        $output['status']['description'] = "No data found for the provided country.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
