<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get the bounding box coordinates from the request
    $north = isset($_REQUEST['north']) ? $_REQUEST['north'] : null;
    $south = isset($_REQUEST['south']) ? $_REQUEST['south'] : null;
    $east = isset($_REQUEST['east']) ? $_REQUEST['east'] : null;
    $west = isset($_REQUEST['west']) ? $_REQUEST['west'] : null;

    // Ensure that the bounding box coordinates are provided
    if ($north === null || $south === null || $east === null || $west === null) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Bounding box coordinates are required.";
        echo json_encode($output);
        exit;
    }

    // Geonames API URL for weather observations
    $url = 'http://api.geonames.org/weatherJSON?formatted=true&north=' . $north . '&south=' . $south . '&east=' . $east . '&west=' . $west . '&username=tembuu';

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

    // Check if 'weatherObservations' key exists and has data
    if (isset($decode['weatherObservations']) && count($decode['weatherObservations']) > 0) {
        $output['data'] = $decode['weatherObservations'];
        $output['status']['description'] = "success";
    } else {
        // Handle no weather data found
        $output['data'] = [];
        $output['status']['description'] = "No weather observations found for the provided region.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
