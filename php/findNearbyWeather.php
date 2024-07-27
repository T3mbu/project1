<?php

// Set your API key here
$apiKey = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your actual API key

// Check if the latitude and longitude parameters are set
if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $latitude = $_GET['lat'];
    $longitude = $_GET['lng'];

    // OpenWeatherMap API URL
    $url = "http://api.openweathermap.org/data/2.5/weather?lat={$latitude}&lon={$longitude}&appid={$apiKey}";

    // Initialize a cURL session
    $ch = curl_init();

    // Set cURL options
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // Execute the cURL request and get the response
    $response = curl_exec($ch);

    // Check for cURL errors
    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        echo json_encode([
            'status' => [
                'name' => 'error',
                'message' => $error_msg
            ]
        ]);
        curl_close($ch);
        exit;
    }

    // Close the cURL session
    curl_close($ch);

    // Decode the JSON response
    $weatherData = json_decode($response, true);

    // Check if the response contains weather data
    if ($weatherData && $weatherData['cod'] == 200) {
        echo json_encode([
            'status' => [
                'name' => 'ok',
                'code' => 200,
                'description' => 'success'
            ],
            'data' => $weatherData
        ]);
    } else {
        echo json_encode([
            'status' => [
                'name' => 'error',
                'code' => $weatherData['cod'],
                'message' => $weatherData['message']
            ]
        ]);
    }
} else {
    echo json_encode([
        'status' => [
            'name' => 'error',
            'message' => 'Missing latitude or longitude parameter.'
        ]
    ]);
}

?>
