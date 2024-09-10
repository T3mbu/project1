<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get the base currency from the request (default is 'USD')
    $baseCurrency = isset($_REQUEST['base']) ? $_REQUEST['base'] : 'USD';

    // Open Exchange Rates API URL with your API key
    $apiKey = '86ccf6237d6c497d872f403f2027a841'; // Your Open Exchange Rates API key
    $url = 'https://openexchangerates.org/api/latest.json?app_id=' . $apiKey . '&base=' . $baseCurrency;

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

    // Check if the rates key exists
    if (isset($decode['rates'])) {
        $output['data']['rates'] = $decode['rates']; // Send all rates
        $output['data']['timestamp'] = $decode['timestamp']; // Include the timestamp for the last update
        $output['status']['description'] = "success";
    } else {
        // Handle no exchange rate data found
        $output['data']['rates'] = [];
        $output['data']['timestamp'] = null;
        $output['status']['description'] = "No exchange rate data found.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
