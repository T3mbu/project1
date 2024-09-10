<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Check if the bounding box parameters are provided (north, south, east, west)
    $north = isset($_REQUEST['north']) ? $_REQUEST['north'] : '49.0';  // Default value if not provided
    $south = isset($_REQUEST['south']) ? $_REQUEST['south'] : '24.0';
    $east = isset($_REQUEST['east']) ? $_REQUEST['east'] : '-66.0';
    $west = isset($_REQUEST['west']) ? $_REQUEST['west'] : '-125.0';

    // API URL for Geonames Earthquake API
    $url = 'http://api.geonames.org/earthquakesJSON?formatted=true&north=' . $north . '&south=' . $south . '&east=' . $east . '&west=' . $west . '&username=tembuu';

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
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    // Check if 'earthquakes' key exists in the response
    if (isset($decode['earthquakes'])) {
        $output['data'] = $decode['earthquakes'];
    } else {
        // Handle missing earthquake data
        $output['data'] = [];
        $output['status']['description'] = "No earthquake data found for the provided region.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
