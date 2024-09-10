<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    // Set your NewsAPI.org key
    $apiKey = 'f3e7085a41734f7a808de6693553f95a';  // Your provided API key

    // Get the country code from the request
    $countryCode = isset($_REQUEST['country']) ? $_REQUEST['country'] : 'us'; // Default to 'us'

    // NewsAPI URL
    $url = 'https://newsapi.org/v2/top-headlines?country=' . $countryCode . '&apiKey=' . $apiKey;

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

    // Check if the response contains articles
    if (isset($decode['articles']) && !empty($decode['articles'])) {
        $output['data']['results'] = array_map(function ($article) {
            return [
                'title' => $article['title'],
                'image_url' => $article['urlToImage'],
                'source_id' => $article['source']['name'],
                'link' => $article['url']
            ];
        }, $decode['articles']);

        $output['data']['totalResults'] = count($decode['articles']);
        $output['status']['description'] = "success";
    } else {
        $output['data'] = [];
        $output['status']['description'] = "No news articles found for the provided country.";
    }

    // Set response header to JSON and output the result
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output);

?>
