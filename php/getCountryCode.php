<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get latitude and longitude from the request
    $lat = isset($_REQUEST['lat']) ? $_REQUEST['lat'] : null;
    $lng = isset($_REQUEST['lng']) ? $_REQUEST['lng'] : null;

    // Ensure latitude and longitude are provided
    if ($lat === null || $lng === null) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Latitude and longitude are required.";
        echo json_encode($output);
        exit;
    }

    // Geonames API URL to get the country code based on latitude and longitude
    $url = 'http://api.geonames.org/countryCode?lat=' . $lat . '&lng=' . $lng . '&username=tembuu&formatted=true';

    // Initialize cURL session
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);

    // Execute the API request
    $result = curl_exec($ch);
    curl_close($ch);

    // Check if result was returned
    if (!$result) {
        $output['status']['code'] = "500";
        $output['status']['name'] = "error";
        $output['status']['description'] = "Failed to fetch country code.";
        echo json_encode($output);
        exit;
    }

    // Prepare output
    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['data']['countryCode'] = trim($result);  // The result should be the country code
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
