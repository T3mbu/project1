<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Get the city name from the request
    $city = isset($_REQUEST['city']) ? $_REQUEST['city'] : null;

    // Ensure city is provided
    if ($city === null) {
        $output['status']['code'] = "400";
        $output['status']['name'] = "error";
        $output['status']['description'] = "City name is required.";
        echo json_encode($output);
        exit;
    }

    
    $apiKey = '42e5b3b1a7d647de862182415240709'; 

    // URL to fetch weather information with 3-day forecast for the given city
    $url = 'http://api.weatherapi.com/v1/forecast.json?key=' . $apiKey . '&q=' . urlencode($city) . '&days=3';

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

    // Check if the weather data is found
    if (isset($decode['location'])) {
        $output['data'] = $decode; // Return the full weather data (current + forecast)
        $output['status']['description'] = "success";
    } else {
        // Handle no data found for the location
        $output['data'] = [];
        $output['status']['description'] = "No weather data found for the provided location.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
