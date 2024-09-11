<?php

ini_set('display_errors', 'On');
error_reporting(E_ALL);

// Start timer to calculate execution time
$executionStartTime = microtime(true);

// Set the API key
$apiKey = 'pub_53238f4d832df97c607292f5ed47f6ad39627';

// Get the country code from the POST request
$countryCode = $_POST['country'] ?? 'us'; // Default to 'us' if not provided

// Prepare the Newsdata API URL
$newsApiUrl = 'https://newsdata.io/api/1/news?apikey=' . $apiKey . '&country=' . $countryCode;

// Initialize cURL session
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => $newsApiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json'
    ]
]);

// Execute cURL request
$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

// Prepare the output based on the response
if ($httpCode == 200) {
    $result = json_decode($response, true);
    if ($result && isset($result['results'])) {
        // Return successful result
        $output = [
            'status' => [
                'code' => "200",
                'name' => "ok",
                'description' => "success"
            ],
            'data' => $result
        ];
    } else {
        // No articles found
        $output = [
            'status' => [
                'code' => "404",
                'name' => "no results",
                'description' => "No news articles found"
            ],
            'data' => []
        ];
    }
} else {
    // Handle error cases
    $output = [
        'status' => [
            'code' => $httpCode,
            'name' => "error",
            'description' => "Error retrieving news articles"
        ],
        'data' => []
    ];
}

// Set response header to JSON
header('Content-Type: application/json; charset=UTF-8');

// Output the result as JSON
echo json_encode($output);

?>
