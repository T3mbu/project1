<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Validate country input to ensure it is a valid ISO2 code
    $country = isset($_REQUEST['country']) && preg_match('/^[A-Z]{2}$/', $_REQUEST['country']) ? $_REQUEST['country'] : 'US';
    $lang = isset($_REQUEST['lang']) && preg_match('/^[a-z]{2}$/', $_REQUEST['lang']) ? $_REQUEST['lang'] : 'en';

    // API URL with dynamic country and language parameters
    $url = 'http://api.geonames.org/countryInfoJSON?formatted=true&lang=' . $lang . '&country=' . $country . '&username=tembuu&style=full';

    // Initialize cURL session
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);

    // Execute API request
    $result = curl_exec($ch);

    // Check for cURL errors
    if (curl_errno($ch)) {
        $output['status']['code'] = "500";
        $output['status']['name'] = "error";
        $output['status']['description'] = curl_error($ch);
        echo json_encode($output);
        curl_close($ch);
        exit;
    }

    curl_close($ch);

    // Decode the result into an associative array
    $decode = json_decode($result, true);

    // Prepare output with status and response data
    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    // Check if 'geonames' key exists and populate the data
    if (isset($decode['geonames'])) {
        $output['data'] = $decode['geonames'];
    } else {
        // Handle missing geonames data
        $output['data'] = [];
        $output['status']['description'] = "No geonames data found for the provided parameters.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
