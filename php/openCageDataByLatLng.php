<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Check if latitude and longitude are passed
    if (!isset($_REQUEST['lat']) || !isset($_REQUEST['lng'])) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "failed";
        $output['status']['description'] = "Latitude and Longitude required.";
        echo json_encode($output);
        exit;
    }

    // Your API Key for OpenCage
    $apiKey = 'c07440e9e0ee49158725329a08a4928a';

    // Latitude and Longitude from the request
    $lat = $_REQUEST['lat'];
    $lng = $_REQUEST['lng'];

    // OpenCage API URL
    $url = "https://api.opencagedata.com/geocode/v1/json?q={$lat}+{$lng}&key={$apiKey}";

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

    // Check if we received a valid response
    if (isset($decode['results']) && count($decode['results']) > 0) {
        $output['status']['code'] = "200";
        $output['status']['name'] = "ok";
        $output['status']['description'] = "success";
        $output['data'] = $decode;
    } else {
        $output['status']['code'] = "404";
        $output['status']['name'] = "error";
        $output['status']['description'] = "No data found.";
        $output['data'] = [];
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
    echo json_encode($output);

?>
