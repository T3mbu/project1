<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get the country name from the request
    $countryName = isset($_REQUEST['country']) ? $_REQUEST['country'] : null;

    // Ensure country name is provided
    if ($countryName === null) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Country name is required.";
        echo json_encode($output);
        exit;
    }

    // Rest Countries API URL - Search by country name
    $url = 'https://restcountries.com/v3.1/name/' . urlencode($countryName);

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
    $output['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    // Check if the response contains country data
    if ($decode && !isset($decode['status'])) {
        $output['data'] = $decode;
        $output['status']['description'] = "success";
    } else {
        // Handle no data found
        $output['data'] = [];
        $output['status']['description'] = "Country not found.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
